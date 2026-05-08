import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { migrateV1ToV2, validate } from '@elucim/dsl';

export const ELUCIM_FILE_EXTENSION = 'elc';
export const ELUCIM_FILE_FILTERS = [
  { name: 'Elucim files', extensions: [ELUCIM_FILE_EXTENSION] },
  { name: 'JSON files', extensions: ['json'] },
];

export interface ParsedDocument {
  document: ElucimDocument;
  warnings: string[];
}

export function serializeDocument(document: ElucimDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function parseDocument(contents: string): ParsedDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Elucim file must contain a JSON object.');
  }

  const version = (parsed as { version?: unknown }).version;
  if (version === '2.0') {
    const result = validate(parsed);
    if (!result.valid) {
      throw new Error(formatValidationErrors(result.errors));
    }
    const warnings = result.errors
      .filter(error => error.severity === 'warning')
      .map(error => `${error.path}: ${error.message}`);
    return { document: parsed as ElucimDocument, warnings };
  }

  if (version === '1.0') {
    const result = validate(parsed);
    if (!result.valid) {
      throw new Error(formatValidationErrors(result.errors));
    }
    return {
      document: migrateV1ToV2(parsed as RenderableDocument),
      warnings: ['Imported a legacy v1 document and converted it to Elucim v2.'],
    };
  }

  throw new Error(`Unknown Elucim document version: ${String(version)}.`);
}

export function getDisplayName(filePath: string | null): string {
  if (!filePath) return 'Untitled.elc';
  return filePath.split(/[\\/]/).pop() || filePath;
}

export function ensureElucimExtension(filePath: string): string {
  if (/\.(elc|json)$/i.test(filePath)) return filePath;
  return `${filePath}.elc`;
}

function formatValidationErrors(errors: Array<{ path: string; message: string; severity?: string }>): string {
  return errors.map(error => `${error.severity ?? 'error'} ${error.path}: ${error.message}`).join('\n');
}
