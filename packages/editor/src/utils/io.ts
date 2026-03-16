import type { ElucimDocument } from '@elucim/dsl';
import { validate } from '@elucim/dsl';

export interface ExportOptions {
  pretty?: boolean;
}

/**
 * Export an ElucimDocument to a JSON string.
 */
export function exportToJson(document: ElucimDocument, options: ExportOptions = {}): string {
  const { pretty = true } = options;
  return JSON.stringify(document, null, pretty ? 2 : undefined);
}

export interface ImportResult {
  document: ElucimDocument | null;
  errors: string[];
}

/**
 * Import an ElucimDocument from a JSON string.
 * Validates the document and returns errors if invalid.
 */
export function importFromJson(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json);

    // Basic structure check
    if (!parsed || typeof parsed !== 'object') {
      return { document: null, errors: ['JSON must be an object'] };
    }
    if (parsed.version !== '1.0') {
      return { document: null, errors: [`Unknown version: ${parsed.version}. Expected "1.0"`] };
    }
    if (!parsed.root) {
      return { document: null, errors: ['Missing "root" property'] };
    }

    const doc = parsed as ElucimDocument;

    // Run DSL validator
    const result = validate(doc);
    if (!result.valid) {
      return {
        document: doc, // Return it anyway — user may want partial import
        errors: result.errors.map(e => `${e.path}: ${e.message}`),
      };
    }

    return { document: doc, errors: [] };
  } catch (err) {
    return { document: null, errors: [`Invalid JSON: ${(err as Error).message}`] };
  }
}

/**
 * Download a document as a .json file in the browser.
 */
export function downloadAsJson(doc: ElucimDocument, filename = 'elucim-scene.json'): void {
  const json = exportToJson(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = globalThis.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
