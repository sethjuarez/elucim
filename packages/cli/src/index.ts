#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  applyNudge,
  collectElementBounds,
  createCardGridPreset,
  createConnectorPreset,
  createStepCardPreset,
  createTextBlockPreset,
  diffDocuments,
  fromYaml,
  inspectPolishHeuristics,
  normalizeToV2,
  suggestDocumentNudges,
  suggestSemanticLayoutNudges,
  validateForAgent,
  type ElucimDocument,
  type ElucimDocumentNudge,
  type ElucimV2Element,
} from '@elucim/dsl';
import {
  evaluateSceneForAgent,
  getAgentOperationCatalog,
  summarizeDocument,
} from '@elucim/dsl/agent';

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Map<string, string[]>;
}

interface LoadedDocument {
  path: string;
  document: ElucimDocument;
  inputFormat: string;
  migrated: boolean;
  warnings: string[];
}

const COMMANDS = [
  {
    name: 'ops',
    usage: 'elucim ops --json',
    description: 'Return CLI commands and code-backed agent operations for tool discovery.',
  },
  {
    name: 'validate',
    usage: 'elucim validate <file> --json',
    description: 'Validate a JSON/YAML/.elc document and return structured errors and repair hints.',
  },
  {
    name: 'inspect',
    usage: 'elucim inspect <file> --json',
    description: 'Return summary, quality report, and raw polish heuristics for agent interrogation.',
  },
  {
    name: 'nudges',
    usage: 'elucim nudges <file> --semantic-layout --json',
    description: 'List deterministic polish nudges and optional ELK semantic layout nudges.',
  },
  {
    name: 'polish',
    usage: 'elucim polish <file> --apply-safe --semantic-layout --out <file> --json',
    description: 'Apply safe nudges and selected review nudges, then write the updated document.',
  },
  {
    name: 'layout',
    usage: 'elucim layout <file> --out <file> --json',
    description: 'Apply the ELK-backed semantic layout review nudge when one is available.',
  },
  {
    name: 'add-connector',
    usage: 'elucim add-connector <file> --id <id> --from <id> --to <id> --line-style dashed --end-cap arrow --out <file> --json',
    description: 'Add an editable semantic connector between existing elements, then write the updated document.',
  },
  {
    name: 'add-text-block',
    usage: 'elucim add-text-block <file> --id <id> --x 80 --y 120 --width 320 --text "..." --out <file> --json',
    description: 'Add editable wrapped text lines as a grouped text block.',
  },
  {
    name: 'add-step-card',
    usage: 'elucim add-step-card <file> --id <id> --x 80 --y 120 --title "..." --body "..." --out <file> --json',
    description: 'Add an editable step card with token colors, stable child IDs, and optional index/status.',
  },
  {
    name: 'add-card-grid',
    usage: 'elucim add-card-grid <file> --id <id> --x 80 --y 120 --items-json \'[...]\' --out <file> --json',
    description: 'Add an editable grid of step cards from JSON item specs.',
  },
] as const;

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const args = parseArgs(argv);
  try {
    switch (args.command) {
      case '':
      case 'help':
      case '--help':
      case '-h':
        writeOutput(args, io, helpPayload());
        return 0;
      case 'ops':
        writeOutput(args, io, opsPayload());
        return 0;
      case 'validate':
        return await validateCommand(args, io);
      case 'inspect':
        return await inspectCommand(args, io);
      case 'nudges':
        return await nudgesCommand(args, io);
      case 'polish':
        return await polishCommand(args, io);
      case 'layout':
        return await layoutCommand(args, io);
      case 'add-connector':
        return await addConnectorCommand(args, io);
      case 'add-text-block':
        return await addTextBlockCommand(args, io);
      case 'add-step-card':
        return await addStepCardCommand(args, io);
      case 'add-card-grid':
        return await addCardGridCommand(args, io);
      default:
        writeError(args, io, `Unknown command "${args.command}". Run "elucim ops --json" to discover commands.`);
        return 2;
    }
  } catch (error) {
    writeError(args, io, error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function helpPayload() {
  return {
    name: 'elucim',
    description: 'Agent-discoverable CLI for Elucim documents.',
    commands: COMMANDS,
  };
}

function opsPayload() {
  return {
    cli: {
      name: 'elucim',
      version: readPackageVersion(),
      commands: COMMANDS,
      commonFlags: [
        { name: '--json', description: 'Emit structured JSON.' },
        { name: '--compact', description: 'Emit compact JSON without indentation.' },
        { name: '--out <file>', description: 'Write an updated document to a file.' },
        { name: '--in-place', description: 'Write an updated document back to the input file.' },
      ],
    },
    agentOperations: getAgentOperationCatalog(),
  };
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: unknown };
  if (typeof packageJson.version !== 'string') {
    throw new Error('Unable to read CLI package version.');
  }
  return packageJson.version;
}

async function validateCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  writeOutput(args, io, {
    command: 'validate',
    file: loaded.path,
    inputFormat: loaded.inputFormat,
    migrated: loaded.migrated,
    warnings: loaded.warnings,
    validation,
  });
  return validation.valid ? 0 : 1;
}

async function inspectCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  const payload = {
    command: 'inspect',
    file: loaded.path,
    inputFormat: loaded.inputFormat,
    migrated: loaded.migrated,
    warnings: loaded.warnings,
    validation,
    summary: validation.valid ? summarizeDocument(loaded.document) : undefined,
    quality: validation.valid ? evaluateSceneForAgent(loaded.document) : undefined,
    heuristics: validation.valid ? inspectPolishHeuristics(loaded.document) : undefined,
  };
  writeOutput(args, io, payload);
  return validation.valid ? 0 : 1;
}

async function nudgesCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  if (!validation.valid) {
    writeOutput(args, io, { command: 'nudges', file: loaded.path, validation, nudges: [] });
    return 1;
  }
  const nudges = await collectNudges(loaded.document, args);
  writeOutput(args, io, {
    command: 'nudges',
    file: loaded.path,
    count: nudges.length,
    nudges: nudges.map(describeNudge),
  });
  return 0;
}

async function polishCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  if (!validation.valid) {
    writeOutput(args, io, { command: 'polish', file: loaded.path, validation, applied: [] });
    return 1;
  }
  const before = loaded.document;
  const nudges = await collectNudges(before, args);
  const selected = selectNudges(nudges, args);
  let current = before;
  const applied: Array<{ id: string; summaries: string[] }> = [];
  for (const nudge of selected) {
    const result = applyNudge(current, nudge);
    current = result.document;
    applied.push({ id: nudge.id, summaries: result.summaries });
  }
  const outputPath = await maybeWriteDocument(args, loaded.path, current);
  writeOutput(args, io, {
    command: 'polish',
    file: loaded.path,
    outputPath,
    applied,
    changed: applied.length > 0,
    diff: diffDocuments(before, current),
    document: shouldIncludeDocument(args) ? current : undefined,
  });
  return 0;
}

async function layoutCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  if (!validation.valid) {
    writeOutput(args, io, { command: 'layout', file: loaded.path, validation, applied: false });
    return 1;
  }
  const before = loaded.document;
  const [nudge] = await suggestSemanticLayoutNudges(before, semanticOptions(args));
  if (!nudge) {
    writeOutput(args, io, { command: 'layout', file: loaded.path, applied: false, reason: 'No semantic layout nudge is available.' });
    return 0;
  }
  const result = applyNudge(before, nudge);
  const outputPath = await maybeWriteDocument(args, loaded.path, result.document);
  writeOutput(args, io, {
    command: 'layout',
    file: loaded.path,
    outputPath,
    applied: true,
    nudge: describeNudge(nudge),
    summaries: result.summaries,
    diff: diffDocuments(before, result.document),
    document: shouldIncludeDocument(args) ? result.document : undefined,
  });
  return 0;
}

async function addConnectorCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const bounds = new Map(collectElementBounds(before).map(item => [item.id, item]));
  const id = requiredFlag(args, 'id');
  const from = requiredFlag(args, 'from');
  const to = requiredFlag(args, 'to');
  const fromBounds = bounds.get(from);
  const toBounds = bounds.get(to);
  if (!fromBounds) throw new Error(`Cannot add connector: source element "${from}" has no measurable bounds.`);
  if (!toBounds) throw new Error(`Cannot add connector: target element "${to}" has no measurable bounds.`);
  const elements = createConnectorPreset({
    id,
    from,
    to,
    fromBounds,
    toBounds,
    fromAnchor: connectorAnchor(args, 'from-anchor'),
    toAnchor: connectorAnchor(args, 'to-anchor'),
    curve: connectorCurve(args),
    label: flagValue(args, 'label'),
    relationship: flagValue(args, 'relationship'),
    lineStyle: lineStyle(args),
    startCap: connectorCap(args, 'start-cap'),
    endCap: connectorCap(args, 'end-cap'),
    strokeWidth: optionalNumberFlag(args, 'stroke-width'),
  });
  const document = addCompositeElements(before, elements);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeCompositeOutput(args, io, 'add-connector', loaded.path, outputPath, before, document, elements);
  return 0;
}

async function addTextBlockCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const elements = createTextBlockPreset({
    id: requiredFlag(args, 'id'),
    x: numberFlag(args, 'x', true),
    y: numberFlag(args, 'y', true),
    width: numberFlag(args, 'width', true),
    text: requiredFlag(args, 'text'),
    fontSize: optionalNumberFlag(args, 'font-size'),
    lineHeight: optionalNumberFlag(args, 'line-height'),
    maxLines: optionalNumberFlag(args, 'max-lines'),
  });
  const document = addCompositeElements(before, elements);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeCompositeOutput(args, io, 'add-text-block', loaded.path, outputPath, before, document, elements);
  return 0;
}

async function addStepCardCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const elements = createStepCardPreset({
    id: requiredFlag(args, 'id'),
    x: numberFlag(args, 'x', true),
    y: numberFlag(args, 'y', true),
    title: requiredFlag(args, 'title'),
    body: flagValue(args, 'body'),
    index: flagValue(args, 'index'),
    status: flagValue(args, 'status'),
    width: optionalNumberFlag(args, 'width'),
    height: optionalNumberFlag(args, 'height'),
    rank: optionalNumberFlag(args, 'rank'),
  });
  const document = addCompositeElements(before, elements);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeCompositeOutput(args, io, 'add-step-card', loaded.path, outputPath, before, document, elements);
  return 0;
}

async function addCardGridCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const rawItems = JSON.parse(requiredFlag(args, 'items-json')) as unknown;
  if (!Array.isArray(rawItems)) throw new Error('--items-json must be a JSON array.');
  const items = rawItems.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`--items-json[${index}] must be an object.`);
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') {
      throw new Error(`--items-json[${index}] requires string id and title.`);
    }
    return {
      id: candidate.id,
      title: candidate.title,
      body: typeof candidate.body === 'string' ? candidate.body : undefined,
      index: typeof candidate.index === 'string' || typeof candidate.index === 'number' ? candidate.index : undefined,
      status: typeof candidate.status === 'string' ? candidate.status : undefined,
      accentToken: typeof candidate.accentToken === 'string' ? candidate.accentToken : undefined,
    };
  });
  const elements = createCardGridPreset({
    id: requiredFlag(args, 'id'),
    x: numberFlag(args, 'x', true),
    y: numberFlag(args, 'y', true),
    items,
    columns: optionalNumberFlag(args, 'columns'),
    cardWidth: optionalNumberFlag(args, 'card-width'),
    cardHeight: optionalNumberFlag(args, 'card-height'),
  });
  const document = addCompositeElements(before, elements);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeCompositeOutput(args, io, 'add-card-grid', loaded.path, outputPath, before, document, elements);
  return 0;
}

async function collectNudges(doc: ElucimDocument, args: ParsedArgs): Promise<ElucimDocumentNudge[]> {
  const nudges = [...suggestDocumentNudges(doc)];
  if (hasFlag(args, 'semantic-layout')) {
    nudges.push(...await suggestSemanticLayoutNudges(doc, semanticOptions(args)));
  }
  return nudges;
}

function selectNudges(nudges: ElucimDocumentNudge[], args: ParsedArgs): ElucimDocumentNudge[] {
  const selected = new Map<string, ElucimDocumentNudge>();
  if (hasFlag(args, 'apply-safe')) {
    nudges.filter(nudge => nudge.confidence === 'safe').forEach(nudge => selected.set(nudge.id, nudge));
  }
  for (const id of flagValues(args, 'apply-review').flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean)) {
    const nudge = nudges.find(candidate => candidate.id === id);
    if (!nudge) throw new Error(`Review nudge "${id}" is not available. Run "elucim nudges ${args.positional[0]} --semantic-layout --json" first.`);
    selected.set(nudge.id, nudge);
  }
  if (hasFlag(args, 'apply-all-review')) {
    nudges.filter(nudge => nudge.confidence === 'review').forEach(nudge => selected.set(nudge.id, nudge));
  }
  return [...selected.values()];
}

async function loadDocument(filePath: string): Promise<LoadedDocument> {
  const text = await readFile(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  const raw = ext === '.yaml' || ext === '.yml'
    ? fromYaml(text)
    : JSON.parse(text) as unknown;
  const normalized = normalizeToV2(raw);
  return {
    path: filePath,
    document: normalized.document,
    inputFormat: normalized.inputFormat,
    migrated: normalized.migrated,
    warnings: normalized.warnings,
  };
}

async function maybeWriteDocument(args: ParsedArgs, inputPath: string, doc: ElucimDocument): Promise<string | undefined> {
  const out = flagValue(args, 'out');
  const inPlace = hasFlag(args, 'in-place');
  if (out && inPlace) throw new Error('Use either --out or --in-place, not both.');
  const outputPath = out ?? (inPlace ? inputPath : undefined);
  if (!outputPath) return undefined;
  await writeFile(outputPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  return outputPath;
}

function semanticOptions(args: ParsedArgs) {
  const direction = flagValue(args, 'direction');
  if (direction && direction !== 'RIGHT' && direction !== 'DOWN') {
    throw new Error('--direction must be RIGHT or DOWN.');
  }
  return {
    direction: direction as 'RIGHT' | 'DOWN' | undefined,
    includeVisualConnectors: flagValue(args, 'include-visual-connectors') === 'false' ? false : undefined,
  };
}

function describeNudge(nudge: ElucimDocumentNudge) {
  return {
    id: nudge.id,
    title: nudge.title,
    description: nudge.description,
    confidence: nudge.confidence,
    category: nudge.category,
    commandCount: nudge.commands.length,
    commands: nudge.commands,
  };
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = '', ...rest] = argv;
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    const [name, inlineValue] = withoutPrefix.split('=', 2);
    const next = rest[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true');
    if (inlineValue === undefined && next && !next.startsWith('--')) index += 1;
    flags.set(name, [...(flags.get(name) ?? []), value]);
  }
  return { command, positional, flags };
}

function requiredFile(args: ParsedArgs): string {
  const file = args.positional[0];
  if (!file) throw new Error(`Command "${args.command}" requires a document path.`);
  return file;
}

function hasFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}

function flagValue(args: ParsedArgs, name: string): string | undefined {
  const values = args.flags.get(name);
  return values ? values[values.length - 1] : undefined;
}

function requiredFlag(args: ParsedArgs, name: string): string {
  const value = flagValue(args, name);
  if (!value || value === 'true') throw new Error(`Command "${args.command}" requires --${name} <value>.`);
  return value;
}

function numberFlag(args: ParsedArgs, name: string, required = false): number {
  const value = flagValue(args, name);
  if (value === undefined) {
    if (required) throw new Error(`Command "${args.command}" requires --${name} <number>.`);
    return 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`--${name} must be a finite number.`);
  return number;
}

function optionalNumberFlag(args: ParsedArgs, name: string): number | undefined {
  return hasFlag(args, name) ? numberFlag(args, name) : undefined;
}

function flagValues(args: ParsedArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

function connectorAnchor(args: ParsedArgs, name: string) {
  const value = flagValue(args, name);
  if (value === undefined) return undefined;
  if (value === 'left' || value === 'right' || value === 'top' || value === 'bottom' || value === 'center') return value;
  throw new Error(`--${name} must be left, right, top, bottom, or center.`);
}

function connectorCurve(args: ParsedArgs) {
  const value = flagValue(args, 'curve');
  if (value === undefined) return undefined;
  if (value === 'straight' || value === 'smooth') return value;
  throw new Error('--curve must be straight or smooth.');
}

function lineStyle(args: ParsedArgs) {
  const value = flagValue(args, 'line-style');
  if (value === undefined) return undefined;
  if (value === 'solid' || value === 'dashed' || value === 'dotted') return value;
  throw new Error('--line-style must be solid, dashed, or dotted.');
}

function connectorCap(args: ParsedArgs, name: string) {
  const value = flagValue(args, name);
  if (value === undefined) return undefined;
  if (value === 'none' || value === 'arrow' || value === 'dot') return value;
  throw new Error(`--${name} must be none, arrow, or dot.`);
}

function addCompositeElements(doc: ElucimDocument, elements: ElucimV2Element[]): ElucimDocument {
  const existing = new Set(Object.keys(doc.elements));
  const duplicate = elements.find(element => existing.has(element.id));
  if (duplicate) throw new Error(`Element "${duplicate.id}" already exists.`);
  const generatedIds = new Set<string>();
  for (const element of elements) {
    if (generatedIds.has(element.id)) throw new Error(`Composite generated duplicate element "${element.id}".`);
    generatedIds.add(element.id);
  }
  const nextElements = { ...doc.elements };
  for (const element of elements) nextElements[element.id] = element;
  const rootIds = elements.filter(element => !element.parentId).map(element => element.id);
  const next = {
    ...doc,
    scene: { ...doc.scene, children: [...doc.scene.children, ...rootIds] },
    elements: nextElements,
  };
  const validation = validateForAgent(next);
  if (!validation.valid) {
    const messages = validation.errors.map(error => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`Composite produced an invalid document: ${messages}`);
  }
  return next;
}

function writeCompositeOutput(
  args: ParsedArgs,
  io: CliIo,
  command: string,
  file: string,
  outputPath: string | undefined,
  before: ElucimDocument,
  document: ElucimDocument,
  elements: ElucimV2Element[],
) {
  writeOutput(args, io, {
    command,
    file,
    outputPath,
    added: elements.map(element => element.id),
    diff: diffDocuments(before, document),
    document: shouldIncludeDocument(args) ? document : undefined,
  });
}

function writeOutput(args: ParsedArgs, io: CliIo, payload: unknown) {
  if (hasFlag(args, 'json') || hasFlag(args, 'compact')) {
    io.stdout(`${JSON.stringify(payload, null, hasFlag(args, 'compact') ? 0 : 2)}\n`);
    return;
  }
  if (typeof payload === 'object' && payload && 'commands' in payload) {
    io.stdout(`${COMMANDS.map(command => `${command.usage}\n  ${command.description}`).join('\n\n')}\n`);
    return;
  }
  io.stdout(`${JSON.stringify(payload, null, 2)}\n`);
}

function writeError(args: ParsedArgs, io: CliIo, message: string) {
  if (hasFlag(args, 'json') || hasFlag(args, 'compact')) {
    io.stderr(`${JSON.stringify({ error: message }, null, hasFlag(args, 'compact') ? 0 : 2)}\n`);
    return;
  }
  io.stderr(`elucim: ${message}\n`);
}

function shouldIncludeDocument(args: ParsedArgs): boolean {
  return hasFlag(args, 'print-document');
}

const defaultIo: CliIo = {
  stdout: value => process.stdout.write(value),
  stderr: value => process.stderr.write(value),
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  });
}
