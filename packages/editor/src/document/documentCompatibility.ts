import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { createDocumentFromRenderable, createRenderableDocument, validate } from '@elucim/dsl';

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
  return createRenderableDocument(document);
}

export function createDocumentFromEditorState(doc: RenderableDocument): ElucimDocument {
  return createDocumentFromRenderable(doc);
}
