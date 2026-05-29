#!/usr/bin/env node
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  applyNudge,
  applyTimelineFrame,
  checkLayoutForAgent,
  collectElementBounds,
  createAutoStaggerTimeline,
  createCardGridPreset,
  createConnectorPreset,
  createReducedMotionDocument,
  createSemanticMotionTimeline,
  createStepCardPreset,
  createTextBlockPreset,
  createTextBoxPreset,
  diffDocuments,
  fromYaml,
  holdFinalFrame,
  inspectPolishHeuristics,
  lintMotion,
  normalizeDocument,
  planMotionBeats,
  previewBeatDiffs,
  repairLayoutForAgent,
  suggestDocumentNudges,
  suggestLayoutRepairsForAgent,
  suggestSemanticLayoutNudges,
  validateForAgent,
  type ElucimBeatPreviewOptions,
  type ElucimDocument,
  type ElucimDocumentNudge,
  type ElucimElement,
  type ElucimMotionBeat,
  type ElucimSemanticMotionPreset,
  type ElucimTimeline,
} from '@elucim/dsl';
import {
  applyAgentCommands,
  evaluateSceneForAgent,
  getAgentOperationCatalog,
  summarizeDocument,
  type AgentElementPatch,
  type AgentElementSpec,
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
    name: 'check-layout',
    usage: 'elucim check-layout <file> --json',
    description: 'Preflight generated scenes for text overflow, tiny auto-fit text, and likely element overlaps.',
  },
  {
    name: 'repair-layout',
    usage: 'elucim repair-layout <file> --out <file> --json',
    description: 'Apply safe layout repairs, re-run layout checks, and write the updated document.',
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
    name: 'add-element',
    usage: 'elucim add-element <file> --id shape --type rect --props-json \'{"x":80,"y":120,"width":160,"height":90}\' --out <file> --json',
    description: 'Place an arbitrary Object into an Elucim Document using JSON props, layout, role, and intent.',
  },
  {
    name: 'update-element',
    usage: 'elucim update-element <file> --id shape --props-json \'{"fill":"$primary"}\' --out <file> --json',
    description: 'Update an existing Object with JSON props, layout, role, intent, parent, or children.',
  },
  {
    name: 'delete-element',
    usage: 'elucim delete-element <file> --id shape --out <file> --json',
    description: 'Remove an Object from an Elucim Document.',
  },
  {
    name: 'add-text-block',
    usage: 'elucim add-text-block <file> --id <id> --x 80 --y 120 --width 320 --text "..." --out <file> --json',
    description: 'Add editable wrapped text lines as a grouped text block.',
  },
  {
    name: 'add-textbox',
    usage: 'elucim add-textbox <file> --id <id> --x 80 --y 120 --width 320 --height 120 --text "..." --auto-fit shrink --background panel --out <file> --json',
    description: 'Add one bounded textbox Object with deterministic wrapping and shrink/truncate fitting.',
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
  {
    name: 'add-beat',
    usage: 'elucim add-beat <file> --id intro --preset revealFlow --targets a,b,c --duration 60 --out <file> --json',
    description: 'Compile a semantic animation beat into an ordinary Elucim timeline.',
  },
  {
    name: 'create-state-machine',
    usage: 'elucim create-state-machine <file> --timeline intro --id presentation --start onStart --exit-to exit --out <file> --json',
    description: 'Embed an existing timeline into a state machine so agents can author playable animated documents; omit --exit-to to hold the final state.',
  },
  {
    name: 'animate-flow',
    usage: 'elucim animate-flow <file> --id data-flow --from a --to b --connector a-to-b --out <file> --json',
    description: 'Animate a relationship or connector using semantic flow motion.',
  },
  {
    name: 'reveal-group',
    usage: 'elucim reveal-group <file> --id reveal-steps --group steps --order-by rank --out <file> --json',
    description: 'Auto-stagger a group/rank/document-ordered set of elements.',
  },
  {
    name: 'hold-final',
    usage: 'elucim hold-final <file> --timeline intro --out poster.elc --json',
    description: 'Flatten a document to a selected timeline final frame for static previews.',
  },
  {
    name: 'reduced-motion',
    usage: 'elucim reduced-motion <file> --mode static --out reduced.elc --json',
    description: 'Generate a static or minimal-motion fallback document.',
  },
  {
    name: 'sample-beats',
    usage: 'elucim sample-beats <file> --timeline intro --beats 4 --json',
    description: 'Return motion lint and beat-level before/after summaries.',
  },
  {
    name: 'export-frames',
    usage: 'elucim export-frames <file> --timeline intro --frames 0,30,60 --json',
    description: 'Return selected frame documents for lightweight preview/export workflows.',
  },
] as const;

type CliCommandName = (typeof COMMANDS)[number]['name'];

interface CliCommandExample {
  description: string;
  argv: string[];
}

const COMMAND_EXAMPLES: Record<CliCommandName, readonly CliCommandExample[]> = {
  ops: [{ description: 'Discover available CLI and code-backed agent operations.', argv: ['ops', '--json'] }],
  validate: [{ description: 'Validate an Elucim Document before and after edits.', argv: ['validate', 'diagram.elc', '--json'] }],
  inspect: [{ description: 'Summarize document quality and agent-readable polish issues.', argv: ['inspect', 'diagram.elc', '--json'] }],
  'check-layout': [{ description: 'Catch text overflow and likely overlaps before rendering.', argv: ['check-layout', 'diagram.elc', '--json'] }],
  'repair-layout': [{ description: 'Apply safe generated-text layout repairs and write a new document.', argv: ['repair-layout', 'diagram.elc', '--out', 'repaired.elc', '--json'] }],
  nudges: [{ description: 'List deterministic and semantic layout improvement suggestions.', argv: ['nudges', 'diagram.elc', '--semantic-layout', '--json'] }],
  polish: [{ description: 'Apply safe deterministic improvements and write a new document.', argv: ['polish', 'diagram.elc', '--apply-safe', '--out', 'polished.elc', '--json'] }],
  layout: [{ description: 'Apply the best available semantic layout suggestion.', argv: ['layout', 'diagram.elc', '--out', 'laid-out.elc', '--json'] }],
  'add-connector': [{ description: 'Connect two existing Objects using a semantic connector.', argv: ['add-connector', 'diagram.elc', '--id', 'a-to-b', '--from', 'a', '--to', 'b', '--end-cap', 'arrow', '--out', 'connected.elc', '--json'] }],
  'add-element': [{ description: 'Place a single Object with explicit SVG props.', argv: ['add-element', 'diagram.elc', '--id', 'card', '--type', 'rect', '--props-json', '{"x":80,"y":120,"width":160,"height":90,"fill":"$surface"}', '--out', 'with-card.elc', '--json'] }],
  'update-element': [{ description: 'Patch props or layout for an existing Object.', argv: ['update-element', 'diagram.elc', '--id', 'card', '--props-json', '{"fill":"$primary"}', '--out', 'updated.elc', '--json'] }],
  'delete-element': [{ description: 'Remove an Object and prune document references through validation.', argv: ['delete-element', 'diagram.elc', '--id', 'card', '--out', 'without-card.elc', '--json'] }],
  'add-text-block': [{ description: 'Create editable wrapped text from one body string.', argv: ['add-text-block', 'diagram.elc', '--id', 'summary', '--x', '80', '--y', '120', '--width', '320', '--text', 'Explain the idea clearly.', '--out', 'text.elc', '--json'] }],
  'add-textbox': [{ description: 'Create one bounded textbox that keeps agent-authored copy inside a box.', argv: ['add-textbox', 'diagram.elc', '--id', 'summary', '--x', '80', '--y', '120', '--width', '320', '--height', '120', '--text', 'Explain the idea clearly.', '--auto-fit', 'shrink', '--background', 'panel', '--out', 'textbox.elc', '--json'] }],
  'add-step-card': [{ description: 'Create a tokenized editable step card.', argv: ['add-step-card', 'diagram.elc', '--id', 'step-1', '--x', '80', '--y', '120', '--title', 'Plan', '--body', 'Pick the first action.', '--out', 'step.elc', '--json'] }],
  'add-card-grid': [{ description: 'Create multiple ordered cards from JSON item specs.', argv: ['add-card-grid', 'diagram.elc', '--id', 'steps', '--x', '80', '--y', '120', '--items-json', '[{"title":"One","body":"Start"}]', '--out', 'grid.elc', '--json'] }],
  'add-beat': [{ description: 'Compile semantic motion into an ordinary timeline.', argv: ['add-beat', 'diagram.elc', '--id', 'intro', '--preset', 'revealFlow', '--targets', 'step-1', '--duration', '48', '--out', 'motion.elc', '--json'] }],
  'create-state-machine': [{ description: 'Make a timeline playable by embedding it in the default state machine.', argv: ['create-state-machine', 'motion.elc', '--timeline', 'intro', '--id', 'presentation', '--start', 'onStart', '--exit-to', 'exit', '--out', 'playable.elc', '--json'] }],
  'animate-flow': [{ description: 'Animate a relationship or connector between Objects.', argv: ['animate-flow', 'diagram.elc', '--id', 'flow', '--from', 'a', '--to', 'b', '--connector', 'a-to-b', '--out', 'flow.elc', '--json'] }],
  'reveal-group': [{ description: 'Reveal a group or ranked set of Objects in a stable order.', argv: ['reveal-group', 'diagram.elc', '--id', 'reveal-steps', '--group', 'steps', '--order-by', 'rank', '--out', 'revealed.elc', '--json'] }],
  'hold-final': [{ description: 'Flatten a timeline to its final frame for static preview.', argv: ['hold-final', 'diagram.elc', '--timeline', 'intro', '--out', 'poster.elc', '--json'] }],
  'reduced-motion': [{ description: 'Generate a static or minimal-motion accessibility fallback.', argv: ['reduced-motion', 'diagram.elc', '--mode', 'minimal', '--out', 'reduced.elc', '--json'] }],
  'sample-beats': [{ description: 'Preview what changes across sampled points in a timeline.', argv: ['sample-beats', 'diagram.elc', '--timeline', 'intro', '--beats', '4', '--json'] }],
  'export-frames': [{ description: 'Return selected frame documents for inspection or rendering.', argv: ['export-frames', 'diagram.elc', '--timeline', 'intro', '--frames', '0,24,48', '--json'] }],
};

function commandCatalog() {
  return COMMANDS.map(command => ({
    ...command,
    examples: COMMAND_EXAMPLES[command.name],
  }));
}

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
      case 'check-layout':
        return await checkLayoutCommand(args, io);
      case 'repair-layout':
        return await repairLayoutCommand(args, io);
      case 'nudges':
        return await nudgesCommand(args, io);
      case 'polish':
        return await polishCommand(args, io);
      case 'layout':
        return await layoutCommand(args, io);
      case 'add-element':
        return await addElementCommand(args, io);
      case 'update-element':
        return await updateElementCommand(args, io);
      case 'delete-element':
        return await deleteElementCommand(args, io);
      case 'add-connector':
        return await addConnectorCommand(args, io);
      case 'add-text-block':
        return await addTextBlockCommand(args, io);
      case 'add-textbox':
        return await addTextBoxCommand(args, io);
      case 'add-step-card':
        return await addStepCardCommand(args, io);
      case 'add-card-grid':
        return await addCardGridCommand(args, io);
      case 'add-beat':
        return await addBeatCommand(args, io);
      case 'create-state-machine':
        return await createStateMachineCommand(args, io);
      case 'animate-flow':
        return await animateFlowCommand(args, io);
      case 'reveal-group':
        return await revealGroupCommand(args, io);
      case 'hold-final':
        return await holdFinalCommand(args, io);
      case 'reduced-motion':
        return await reducedMotionCommand(args, io);
      case 'sample-beats':
        return await sampleBeatsCommand(args, io);
      case 'export-frames':
        return await exportFramesCommand(args, io);
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
    commands: commandCatalog(),
  };
}

function opsPayload() {
  return {
    cli: {
      name: 'elucim',
      version: readPackageVersion(),
      commands: commandCatalog(),
      commonFlags: [
        { name: '--json', description: 'Emit structured JSON.' },
        { name: '--compact', description: 'Emit compact JSON without indentation.' },
        { name: '--out <file>', description: 'Write an updated document to a file.' },
        { name: '--in-place', description: 'Write an updated document back to the input file.' },
      ],
      recommendedWorkflows: [
        {
          goal: 'Author a playable animated Elucim Document',
          commands: ['add-element', 'add-textbox', 'check-layout', 'repair-layout', 'add-beat', 'create-state-machine', 'validate', 'export-frames'],
        },
        {
          goal: 'Improve an existing Elucim Document safely',
          commands: ['inspect', 'nudges', 'polish', 'validate'],
        },
        {
          goal: 'Round-trip editor-friendly Objects',
          commands: ['add-element', 'update-element', 'delete-element', 'validate'],
        },
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

async function checkLayoutCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  const layout = validation.valid ? checkLayoutForAgent(loaded.document) : undefined;
  const repairSuggestions = layout ? suggestLayoutRepairsForAgent(loaded.document, layout) : undefined;
  writeOutput(args, io, {
    command: 'check-layout',
    file: loaded.path,
    inputFormat: loaded.inputFormat,
    migrated: loaded.migrated,
    warnings: loaded.warnings,
    validation,
    layout,
    repairSuggestions,
  });
  return validation.valid && layout?.valid ? 0 : 1;
}

async function repairLayoutCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const validation = validateForAgent(loaded.document);
  if (!validation.valid) {
    writeOutput(args, io, {
      command: 'repair-layout',
      file: loaded.path,
      inputFormat: loaded.inputFormat,
      migrated: loaded.migrated,
      warnings: loaded.warnings,
      validation,
      applied: [],
      skipped: [],
    });
    return 1;
  }

  const repair = repairLayoutForAgent(loaded.document, {
    includeReview: hasFlag(args, 'apply-all-review'),
    reviewSuggestionIds: reviewRepairIds(args),
    maxPasses: optionalNumberFlag(args, 'max-passes'),
  });
  const outputPath = await maybeWriteDocument(args, loaded.path, repair.document);
  writeOutput(args, io, {
    command: 'repair-layout',
    file: loaded.path,
    inputFormat: loaded.inputFormat,
    migrated: loaded.migrated,
    warnings: loaded.warnings,
    outputPath,
    validation,
    changed: repair.changed,
    converged: repair.converged,
    passes: repair.passes,
    before: repair.before,
    after: repair.after,
    applied: repair.applied,
    skipped: repair.skipped,
    repairSuggestions: repair.repairSuggestions,
    diff: diffDocuments(loaded.document, repair.document),
    document: shouldIncludeDocument(args) ? repair.document : undefined,
  });
  return repair.after.valid ? 0 : 1;
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

async function addElementCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const element: AgentElementSpec = {
    id: requiredFlag(args, 'id'),
    type: requiredFlag(args, 'type'),
    props: jsonObjectFlag(args, 'props-json') ?? {},
    layout: jsonObjectFlag(args, 'layout-json') as AgentElementSpec['layout'],
    role: flagValue(args, 'role'),
    intent: jsonObjectFlag(args, 'intent-json') as AgentElementSpec['intent'],
    parentId: flagValue(args, 'parent'),
    index: optionalNumberFlag(args, 'index'),
    children: jsonStringArrayFlag(args, 'children-json'),
  };
  const result = applyAgentCommands(before, [{ op: 'addElement', element }]);
  if (!result.validation.valid) {
    writeAgentCommandOutput(args, io, 'add-element', loaded.path, undefined, before, result);
    return 1;
  }
  const outputPath = await maybeWriteDocument(args, loaded.path, result.document);
  writeAgentCommandOutput(args, io, 'add-element', loaded.path, outputPath, before, result);
  return 0;
}

async function updateElementCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const patch: AgentElementPatch = {};
  const props = jsonObjectFlag(args, 'props-json');
  const layout = jsonObjectFlag(args, 'layout-json');
  const intent = jsonObjectFlag(args, 'intent-json');
  if (props) patch.props = props;
  if (layout) patch.layout = layout as AgentElementPatch['layout'];
  if (intent) patch.intent = intent as AgentElementPatch['intent'];
  if (hasFlag(args, 'role')) patch.role = requiredFlag(args, 'role');
  if (hasFlag(args, 'parent')) patch.parentId = requiredFlag(args, 'parent');
  if (hasFlag(args, 'children-json')) patch.children = jsonStringArrayFlag(args, 'children-json');
  const result = applyAgentCommands(before, [{ op: 'updateElement', id: requiredFlag(args, 'id'), patch }]);
  if (!result.validation.valid) {
    writeAgentCommandOutput(args, io, 'update-element', loaded.path, undefined, before, result);
    return 1;
  }
  const outputPath = await maybeWriteDocument(args, loaded.path, result.document);
  writeAgentCommandOutput(args, io, 'update-element', loaded.path, outputPath, before, result);
  return 0;
}

async function deleteElementCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const result = applyAgentCommands(before, [{ op: 'deleteElement', id: requiredFlag(args, 'id') }]);
  if (!result.validation.valid) {
    writeAgentCommandOutput(args, io, 'delete-element', loaded.path, undefined, before, result);
    return 1;
  }
  const outputPath = await maybeWriteDocument(args, loaded.path, result.document);
  writeAgentCommandOutput(args, io, 'delete-element', loaded.path, outputPath, before, result);
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

async function addTextBoxCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const elements = createTextBoxPreset({
    id: requiredFlag(args, 'id'),
    x: numberFlag(args, 'x', true),
    y: numberFlag(args, 'y', true),
    width: numberFlag(args, 'width', true),
    height: numberFlag(args, 'height', true),
    text: requiredFlag(args, 'text'),
    fontSize: optionalNumberFlag(args, 'font-size'),
    minFontSize: optionalNumberFlag(args, 'min-font-size'),
    fontFamily: flagValue(args, 'font-family'),
    fontWeight: flagValue(args, 'font-weight'),
    lineHeight: optionalNumberFlag(args, 'line-height'),
    fillToken: flagValue(args, 'fill'),
    backgroundFillToken: flagValue(args, 'background-fill'),
    backgroundStrokeToken: flagValue(args, 'background-stroke'),
    background: textBoxBackground(args),
    padding: textBoxPadding(args),
    align: textBoxAlign(args),
    verticalAlign: textBoxVerticalAlign(args),
    autoFit: textBoxAutoFit(args),
    role: flagValue(args, 'role'),
    importance: textBoxImportance(args),
    parentId: flagValue(args, 'parent'),
    rank: optionalNumberFlag(args, 'rank'),
  });
  const document = addCompositeElements(before, elements);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeCompositeOutput(args, io, 'add-textbox', loaded.path, outputPath, before, document, elements);
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

async function addBeatCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const timeline = createSemanticMotionTimeline(before, {
    id: requiredFlag(args, 'id'),
    preset: semanticPreset(args),
    targets: targetList(args),
    group: flagValue(args, 'group'),
    duration: optionalNumberFlag(args, 'duration'),
    stagger: optionalNumberFlag(args, 'stagger'),
    reducedMotion: hasFlag(args, 'reduced-motion'),
  });
  const document = upsertTimelineDocument(before, timeline);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeTimelineOutput(args, io, 'add-beat', loaded.path, outputPath, before, document, timeline);
  return 0;
}

async function createStateMachineCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const explicitId = flagValue(args, 'id');
  if (explicitId && before.stateMachines?.[explicitId]) {
    throw new Error(`State machine "${explicitId}" already exists.`);
  }
  const result = applyAgentCommands(before, [{
    op: 'createStateMachine',
    stateMachine: {
      id: explicitId,
      timelineId: requiredFlag(args, 'timeline'),
      start: stateMachineStart(args),
      key: flagValue(args, 'key'),
      exitTo: stateMachineExit(args),
    },
  }]);
  const outputPath = await maybeWriteDocument(args, loaded.path, result.document);
  writeOutput(args, io, {
    command: 'create-state-machine',
    file: loaded.path,
    outputPath,
    changed: result.changed,
    summaries: result.summaries,
    validation: result.validation,
    diff: diffDocuments(before, result.document),
    document: shouldIncludeDocument(args) ? result.document : undefined,
  });
  return result.validation.valid ? 0 : 1;
}

async function animateFlowCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const from = requiredFlag(args, 'from');
  const to = requiredFlag(args, 'to');
  const connectorId = flagValue(args, 'connector');
  const timeline = createSemanticMotionTimeline(before, {
    id: requiredFlag(args, 'id'),
    preset: (flagValue(args, 'preset') as ElucimSemanticMotionPreset | undefined) ?? (connectorId ? 'tracePath' : 'handoff'),
    from,
    to,
    connectorId,
    duration: optionalNumberFlag(args, 'duration'),
    reducedMotion: hasFlag(args, 'reduced-motion'),
  });
  const document = upsertTimelineDocument(before, timeline);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeTimelineOutput(args, io, 'animate-flow', loaded.path, outputPath, before, document, timeline);
  return 0;
}

async function revealGroupCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const timeline = createAutoStaggerTimeline(before, {
    id: requiredFlag(args, 'id'),
    targets: targetList(args),
    group: flagValue(args, 'group'),
    duration: optionalNumberFlag(args, 'duration'),
    stagger: optionalNumberFlag(args, 'stagger'),
    orderBy: orderBy(args),
  });
  const document = upsertTimelineDocument(before, timeline);
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeTimelineOutput(args, io, 'reveal-group', loaded.path, outputPath, before, document, timeline);
  return 0;
}

async function holdFinalCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const document = holdFinalFrame(before, flagValue(args, 'timeline'));
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeOutput(args, io, {
    command: 'hold-final',
    file: loaded.path,
    outputPath,
    diff: diffDocuments(before, document),
    document: shouldIncludeDocument(args) ? document : undefined,
  });
  return 0;
}

async function reducedMotionCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const before = loaded.document;
  const document = createReducedMotionDocument(before, {
    mode: reducedMotionMode(args),
    poster: flagValue(args, 'poster') === 'first' ? 'first' : 'last',
    maxDuration: optionalNumberFlag(args, 'max-duration'),
  });
  const outputPath = await maybeWriteDocument(args, loaded.path, document);
  writeOutput(args, io, {
    command: 'reduced-motion',
    file: loaded.path,
    outputPath,
    diff: diffDocuments(before, document),
    document: shouldIncludeDocument(args) ? document : undefined,
  });
  return 0;
}

async function sampleBeatsCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const timelineId = requiredFlag(args, 'timeline');
  const beats = beatPlan(args, loaded.document.timelines?.[timelineId]?.duration);
  const previewOptions: ElucimBeatPreviewOptions = { timelineId, beats };
  const lint = lintMotion(loaded.document, { requireReducedMotion: hasFlag(args, 'require-reduced-motion') });
  const preview = previewBeatDiffs(loaded.document, previewOptions);
  writeOutput(args, io, {
    command: 'sample-beats',
    file: loaded.path,
    timelineId,
    beats,
    lint,
    preview,
  });
  return lint.valid ? 0 : 1;
}

async function exportFramesCommand(args: ParsedArgs, io: CliIo): Promise<number> {
  const loaded = await loadDocument(requiredFile(args));
  const timelineId = requiredFlag(args, 'timeline');
  const timeline = loaded.document.timelines?.[timelineId];
  if (!timeline) throw new Error(`Timeline "${timelineId}" does not exist.`);
  const frames = frameList(args, timeline.duration);
  const documents = frames.map(frame => ({ frame, document: applyTimelineFrame(loaded.document, timelineId, frame) }));
  writeOutput(args, io, {
    command: 'export-frames',
    file: loaded.path,
    timelineId,
    frames,
    documents: shouldIncludeDocument(args) ? documents : undefined,
    summaries: documents.map(({ frame, document }) => ({
      frame,
      visibleElementIds: Object.values(document.elements)
        .filter(element => (typeof element.props.opacity === 'number' ? element.props.opacity : 1) > 0.01)
        .map(element => element.id),
    })),
  });
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
  const normalized = normalizeDocument(raw);
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
  await writeDocumentAtomically(outputPath, doc);
  return outputPath;
}

async function writeDocumentAtomically(outputPath: string, doc: ElucimDocument): Promise<void> {
  const tempPath = join(dirname(outputPath), `.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await writeFile(tempPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    await rename(tempPath, outputPath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
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

function reviewRepairIds(args: ParsedArgs): string[] {
  return flagValues(args, 'apply-review')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean);
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

function textBoxAlign(args: ParsedArgs) {
  const value = flagValue(args, 'align');
  if (value === undefined) return undefined;
  if (value === 'left' || value === 'center' || value === 'right') return value;
  throw new Error('--align must be left, center, or right.');
}

function textBoxVerticalAlign(args: ParsedArgs) {
  const value = flagValue(args, 'vertical-align');
  if (value === undefined) return undefined;
  if (value === 'top' || value === 'middle' || value === 'bottom') return value;
  throw new Error('--vertical-align must be top, middle, or bottom.');
}

function textBoxAutoFit(args: ParsedArgs) {
  const value = flagValue(args, 'auto-fit');
  if (value === undefined) return undefined;
  if (value === 'none' || value === 'shrink' || value === 'truncate') return value;
  throw new Error('--auto-fit must be none, shrink, or truncate.');
}

function textBoxBackground(args: ParsedArgs) {
  const value = flagValue(args, 'background');
  const hasBackgroundStyle = flagValue(args, 'background-fill') !== undefined || flagValue(args, 'background-stroke') !== undefined;
  if (value === undefined) return undefined;
  if (value === 'none' && hasBackgroundStyle) throw new Error('--background none cannot be combined with --background-fill or --background-stroke.');
  if (value === 'panel' || value === 'none') return value;
  throw new Error('--background must be panel or none.');
}

function textBoxPadding(args: ParsedArgs) {
  const padding = optionalNumberFlag(args, 'padding');
  const paddingX = optionalNumberFlag(args, 'padding-x');
  const paddingY = optionalNumberFlag(args, 'padding-y');
  if (paddingX !== undefined || paddingY !== undefined) {
    const fallback = padding ?? 12;
    return { x: paddingX ?? fallback, y: paddingY ?? fallback };
  }
  return padding;
}

function textBoxImportance(args: ParsedArgs) {
  const value = flagValue(args, 'importance');
  if (value === undefined) return undefined;
  if (value === 'primary' || value === 'secondary' || value === 'supporting' || value === 'decorative') return value;
  throw new Error('--importance must be primary, secondary, supporting, or decorative.');
}

function semanticPreset(args: ParsedArgs): ElucimSemanticMotionPreset {
  const value = flagValue(args, 'preset') ?? 'revealFlow';
  if (
    value === 'revealFlow'
    || value === 'emphasizeDecision'
    || value === 'tracePath'
    || value === 'loopOnce'
    || value === 'handoff'
    || value === 'drainQueue'
    || value === 'compareBeforeAfter'
  ) return value;
  throw new Error('--preset must be revealFlow, emphasizeDecision, tracePath, loopOnce, handoff, drainQueue, or compareBeforeAfter.');
}

function targetList(args: ParsedArgs): string[] | undefined {
  const value = flagValue(args, 'targets');
  return value ? value.split(',').map(item => item.trim()).filter(Boolean) : undefined;
}

function orderBy(args: ParsedArgs): 'document' | 'rank' | 'group' | undefined {
  const value = flagValue(args, 'order-by');
  if (value === undefined) return undefined;
  if (value === 'document' || value === 'rank' || value === 'group') return value;
  throw new Error('--order-by must be document, rank, or group.');
}

function reducedMotionMode(args: ParsedArgs): 'static' | 'minimal' | undefined {
  const value = flagValue(args, 'mode');
  if (value === undefined) return undefined;
  if (value === 'static' || value === 'minimal') return value;
  throw new Error('--mode must be static or minimal.');
}

function stateMachineStart(args: ParsedArgs): 'onStart' | 'onClick' | 'onKey' | undefined {
  const value = flagValue(args, 'start');
  if (value === undefined) return undefined;
  if (value === 'onStart' || value === 'onClick' || value === 'onKey') return value;
  throw new Error('--start must be onStart, onClick, or onKey.');
}

function stateMachineExit(args: ParsedArgs): 'exit' | 'hold' | undefined {
  const value = flagValue(args, 'exit-to');
  if (value === undefined) return undefined;
  if (value === 'exit' || value === 'hold') return value;
  throw new Error('--exit-to must be exit or hold.');
}

function beatPlan(args: ParsedArgs, fallbackDuration = 120): ElucimMotionBeat[] {
  const raw = flagValue(args, 'beats-json');
  if (raw) {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error('--beats-json must be a JSON array.');
    return parsed as ElucimMotionBeat[];
  }
  return planMotionBeats({
    totalFrames: optionalNumberFlag(args, 'duration') ?? fallbackDuration,
    seconds: optionalNumberFlag(args, 'seconds'),
    fps: optionalNumberFlag(args, 'fps'),
    beatCount: optionalNumberFlag(args, 'beats'),
  });
}

function frameList(args: ParsedArgs, fallbackDuration = 120): number[] {
  const value = flagValue(args, 'frames');
  if (!value) return [0, Math.round(fallbackDuration / 2), fallbackDuration];
  const frames = value.split(',').map(item => Number(item.trim()));
  if (frames.some(frame => !Number.isFinite(frame) || frame < 0)) throw new Error('--frames must be a comma-separated list of non-negative numbers.');
  return [...new Set(frames.map(frame => Math.round(frame)))].sort((a, b) => a - b);
}

function jsonObjectFlag(args: ParsedArgs, name: string): Record<string, unknown> | undefined {
  const value = flagValue(args, name);
  if (value === undefined) return undefined;
  const parsed = parseJsonFlag(args, name);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`--${name} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function jsonStringArrayFlag(args: ParsedArgs, name: string): string[] | undefined {
  const value = flagValue(args, name);
  if (value === undefined) return undefined;
  const parsed = parseJsonFlag(args, name);
  if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) {
    throw new Error(`--${name} must be a JSON array of strings.`);
  }
  return parsed;
}

function parseJsonFlag(args: ParsedArgs, name: string): unknown {
  const value = requiredFlag(args, name);
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON for --${name}: ${message}`);
  }
}

function upsertTimelineDocument(doc: ElucimDocument, timeline: ElucimTimeline): ElucimDocument {
  const next = {
    ...doc,
    timelines: { ...doc.timelines, [timeline.id]: timeline },
  };
  const validation = validateForAgent(next);
  if (!validation.valid) {
    const messages = validation.errors.map(error => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`Motion timeline produced an invalid document: ${messages}`);
  }
  return next;
}

function addCompositeElements(doc: ElucimDocument, elements: ElucimElement[]): ElucimDocument {
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
  for (const element of elements) {
    if (!element.parentId) continue;
    const parent = nextElements[element.parentId];
    if (!parent) throw new Error(`Parent element "${element.parentId}" does not exist.`);
    if (!('children' in parent) || !Array.isArray(parent.children)) {
      throw new Error(`Parent element "${element.parentId}" cannot contain children.`);
    }
    nextElements[element.parentId] = {
      ...parent,
      children: parent.children.includes(element.id) ? parent.children : [...parent.children, element.id],
    };
  }
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

function writeAgentCommandOutput(
  args: ParsedArgs,
  io: CliIo,
  command: string,
  file: string,
  outputPath: string | undefined,
  before: ElucimDocument,
  result: ReturnType<typeof applyAgentCommands>,
) {
  writeOutput(args, io, {
    command,
    file,
    outputPath,
    changed: result.changed,
    summaries: result.summaries,
    validation: result.validation,
    diff: diffDocuments(before, result.document),
    document: shouldIncludeDocument(args) ? result.document : undefined,
  });
}

function writeCompositeOutput(
  args: ParsedArgs,
  io: CliIo,
  command: string,
  file: string,
  outputPath: string | undefined,
  before: ElucimDocument,
  document: ElucimDocument,
  elements: ElucimElement[],
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

function writeTimelineOutput(
  args: ParsedArgs,
  io: CliIo,
  command: string,
  file: string,
  outputPath: string | undefined,
  before: ElucimDocument,
  document: ElucimDocument,
  timeline: ElucimTimeline,
) {
  writeOutput(args, io, {
    command,
    file,
    outputPath,
    timeline,
    lint: lintMotion(document),
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
