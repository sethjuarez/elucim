import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}|rgba?\(/;

const COLOR_LITERAL_ALLOWLIST = new Set([
  'theme/tokens.ts',
  'inspector/colorUtils.ts',
  'inspector/Inspector.tsx',
  'inspector/ArrayEditor.tsx',
  'canvas/ElucimCanvas.tsx',
  'state/types.ts',
  'toolbar/Toolbar.tsx',
  'toolbar/EditorMenuBar.tsx',
]);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const fullPath = resolve(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === '__tests__') return [];
      return listSourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe('editor chrome token usage', () => {
  it('keeps chrome color literals behind token/theme boundaries', () => {
    const offenders = listSourceFiles(SRC_ROOT)
      .map(file => relative(SRC_ROOT, file).replace(/\\/g, '/'))
      .filter(file => !COLOR_LITERAL_ALLOWLIST.has(file))
      .filter(file => COLOR_LITERAL.test(readFileSync(resolve(SRC_ROOT, file), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
