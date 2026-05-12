import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { migrateV1ToV2, migrateV2ToV1, validate } from '@elucim/dsl';

/**
 * Returns the renderable tree consumed by the current editor reducer.
 * Canonical Elucim Documents are validated first, then adapted for editing.
 */
export function normalizeInitialDocument(document: RenderableDocument | ElucimDocument | undefined): RenderableDocument | undefined {
  if (!document || document.version === '1.0') return document;
  const result = validate(document);
  if (!result.valid) {
    throw new Error(`Invalid editor document: ${result.errors.map(error => `${error.path}: ${error.message}`).join('; ')}`);
  }
  return migrateV2ToV1(document);
}

export function createDocumentFromEditorState(doc: RenderableDocument): ElucimDocument {
  return migrateV1ToV2(doc);
}
