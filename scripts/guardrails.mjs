import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicTerminologyRoots = [
  'README.md',
  'packages/dsl/README.md',
  'packages/editor/README.md',
  'docs/src/content/docs',
];
const bannedPublicDocumentTerms = [
  /\bv1\b/i,
  /\bv2\b/i,
];
const bannedPublicObjectOrderTerms = [
  /\bhierarchy order\b/i,
  /\beditor hierarchy\b/i,
];
const cssChromeRoots = [
  'apps/elucim-app/src',
  'docs/src/styles',
  'packages/editor/src',
];
const literalColorPattern = /#[0-9a-fA-F]{3,8}|rgba?\(/;
const editorColorLiteralAllowlist = new Set([
  'theme/tokens.ts',
  'inspector/colorUtils.ts',
  'inspector/Inspector.tsx',
  'inspector/ArrayEditor.tsx',
  'canvas/ElucimCanvas.tsx',
  'state/types.ts',
  'toolbar/Toolbar.tsx',
  'toolbar/EditorMenuBar.tsx',
]);

function listFiles(entryPath, extensions) {
  const absolute = resolve(repoRoot, entryPath);
  const stat = statSync(absolute);
  if (stat.isFile()) return extensions.some(extension => absolute.endsWith(extension)) ? [absolute] : [];
  return readdirSync(absolute).flatMap(entry => listFiles(resolve(entryPath, entry), extensions));
}

function listFilesSkipping(entryPath, extensions, skippedDirectories) {
  const absolute = resolve(repoRoot, entryPath);
  const stat = statSync(absolute);
  if (stat.isFile()) return extensions.some(extension => absolute.endsWith(extension)) ? [absolute] : [];
  return readdirSync(absolute).flatMap(entry => (
    skippedDirectories.has(entry)
      ? []
      : listFilesSkipping(resolve(entryPath, entry), extensions, skippedDirectories)
  ));
}

function lineColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function stripMarkdownCodeFences(source) {
  return source.replace(/```[\s\S]*?```/g, match => ' '.repeat(match.length));
}

function isCssCustomPropertyValue(source, index) {
  const declarationStart = Math.max(source.lastIndexOf(';', index), source.lastIndexOf('{', index)) + 1;
  const beforeLiteral = source.slice(declarationStart, index);
  return /^\s*--[\w-]+\s*:/.test(beforeLiteral);
}

function assertNoPublicVersionTerms() {
  const offenders = [];
  for (const root of publicTerminologyRoots) {
    for (const file of listFiles(root, ['.md', '.mdx'])) {
      const source = stripMarkdownCodeFences(readFileSync(file, 'utf8'));
      for (const pattern of bannedPublicDocumentTerms) {
        const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
        for (const match of source.matchAll(globalPattern)) {
          const { line, column } = lineColumn(source, match.index);
          offenders.push(`${relative(repoRoot, file)}:${line}:${column} contains "${match[0]}"`);
        }
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(`Public docs must use "Elucim Document" language instead of v1/v2 terminology:\n${offenders.join('\n')}`);
  }
}

function assertNoPublicObjectOrderTerms() {
  const offenders = [];
  for (const root of publicTerminologyRoots) {
    for (const file of listFiles(root, ['.md', '.mdx'])) {
      const source = stripMarkdownCodeFences(readFileSync(file, 'utf8'));
      for (const pattern of bannedPublicObjectOrderTerms) {
        const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
        for (const match of source.matchAll(globalPattern)) {
          const { line, column } = lineColumn(source, match.index);
          offenders.push(`${relative(repoRoot, file)}:${line}:${column} contains "${match[0]}"`);
        }
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(`Public docs must describe editor stacking as Object order, not hierarchy order/editor hierarchy:\n${offenders.join('\n')}`);
  }
}

function assertCssLiteralsStayInTokenDeclarations() {
  const offenders = [];
  for (const file of cssChromeRoots.flatMap(root => listFiles(root, ['.css']))) {
    const filePath = relative(repoRoot, file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(new RegExp(literalColorPattern, 'g'))) {
      if (isCssCustomPropertyValue(source, match.index)) continue;
      const { line, column } = lineColumn(source, match.index);
      offenders.push(`${filePath}:${line}:${column} uses literal "${match[0]}" outside a CSS custom property declaration`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(`Chrome CSS color literals must be declared as tokens and consumed through var(...):\n${offenders.join('\n')}`);
  }
}

function assertEditorColorLiteralsStayInTokenBoundaries() {
  const offenders = [];
  const editorSrcRoot = resolve(repoRoot, 'packages/editor/src');
  for (const file of listFilesSkipping('packages/editor/src', ['.ts', '.tsx'], new Set(['__tests__']))) {
    const filePath = relative(editorSrcRoot, file).replace(/\\/g, '/');
    if (editorColorLiteralAllowlist.has(filePath)) continue;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(new RegExp(literalColorPattern, 'g'))) {
      const { line, column } = lineColumn(source, match.index);
      offenders.push(`${relative(repoRoot, file)}:${line}:${column} uses literal "${match[0]}" outside token/theme boundaries`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(`Editor chrome color literals must stay behind token/theme boundaries:\n${offenders.join('\n')}`);
  }
}

assertNoPublicVersionTerms();
assertNoPublicObjectOrderTerms();
assertCssLiteralsStayInTokenDeclarations();
assertEditorColorLiteralsStayInTokenBoundaries();
console.log('Guardrails passed: public document/Object language and chrome CSS token usage.');
