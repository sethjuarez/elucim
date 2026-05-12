import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { migrateV1ToV2, migrateV2ToV1, validate } from '@elucim/dsl';

export interface ExportOptions {
  pretty?: boolean;
}

export type ExportableDocument = ElucimDocument | RenderableDocument;

/**
 * Export an ElucimDocument to a JSON string.
 */
export function exportToJson(document: ExportableDocument, options: ExportOptions = {}): string {
  const { pretty = true } = options;
  return JSON.stringify(document, null, pretty ? 2 : undefined);
}

export function getEditorExportDocument(document: RenderableDocument, canonicalDocument?: ElucimDocument): ElucimDocument {
  return canonicalDocument ?? migrateV1ToV2(document);
}

export function exportEditorDocumentToJson(document: RenderableDocument, canonicalDocument?: ElucimDocument, options: ExportOptions = {}): string {
  return exportToJson(getEditorExportDocument(document, canonicalDocument), options);
}

export interface ImportResult {
  document: RenderableDocument | null;
  canonicalDocument?: ElucimDocument;
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
    if (parsed.version === '2.0') {
      const result = validate(parsed);
      if (!result.valid) {
        return {
          document: null,
          errors: result.errors.map(e => `${e.path}: ${e.message}`),
        };
      }
      const canonicalDocument = parsed as ElucimDocument;
      return { document: migrateV2ToV1(canonicalDocument), canonicalDocument, errors: [] };
    }
    if (parsed.version !== '1.0') {
      return { document: null, errors: [`Unknown version: ${parsed.version}. Expected "1.0" or "2.0"`] };
    }
    if (!parsed.root) {
      return { document: null, errors: ['Missing "root" property'] };
    }

    const doc = parsed as RenderableDocument;

    // Run DSL validator
    const result = validate(doc);
    if (!result.valid) {
      return {
        document: doc, // Return it anyway — user may want partial import
        errors: result.errors.map(e => `${e.path}: ${e.message}`),
      };
    }

    return { document: doc, canonicalDocument: migrateV1ToV2(doc), errors: [] };
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
