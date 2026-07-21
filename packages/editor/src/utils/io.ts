import type { ElucimDocument, EditorProjection } from '@elucim/editor-projection';
import { documentFromProjection, validate } from '@elucim/editor-projection';

export interface ExportOptions {
  pretty?: boolean;
}

export type ExportableDocument = ElucimDocument;

/**
 * Export an ElucimDocument to a JSON string.
 */
export function exportToJson(document: ExportableDocument, options: ExportOptions = {}): string {
  const { pretty = true } = options;
  return JSON.stringify(document, null, pretty ? 2 : undefined);
}

export function getEditorExportDocument(document: EditorProjection, canonicalDocument?: ElucimDocument): ElucimDocument {
  return canonicalDocument ?? documentFromProjection(document);
}

export function exportEditorDocumentToJson(document: EditorProjection, canonicalDocument?: ElucimDocument, options: ExportOptions = {}): string {
  return exportToJson(getEditorExportDocument(document, canonicalDocument), options);
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
    const result = validate(parsed);
    if (!result.valid) {
      return {
        document: null,
        errors: result.errors.map(e => `${e.path}: ${e.message}`),
      };
    }
    return { document: parsed as ElucimDocument, errors: [] };
  } catch (err) {
    return { document: null, errors: [`Invalid JSON: ${(err as Error).message}`] };
  }
}

/**
 * Download a document as a .json file in the browser.
 */
export function downloadAsJson(doc: ExportableDocument, filename = 'elucim-document.elc'): void {
  const json = exportToJson(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = globalThis.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
