import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { renderRoot } from './renderElements';
import { validate } from '../validator/validate';
import type { ElucimDocument } from '../schema/types';

export interface RenderToSvgStringOptions {
  width?: number;
  height?: number;
}

/**
 * Render a DSL document to an SVG string at a specific frame, without mounting to the DOM.
 * Uses react-dom/server's renderToStaticMarkup.
 *
 * Note: This renders the scene at the given frame by overriding the root node's properties.
 * For 'player' roots, it converts to a 'scene' internally (no controls needed for static output).
 */
export function renderToSvgString(
  dsl: ElucimDocument,
  frame: number,
  options?: RenderToSvgStringOptions,
): string {
  const result = validate(dsl);
  if (!result.valid) {
    const errors = result.errors.filter(e => e.severity === 'error');
    throw new Error(
      `DSL validation failed:\n${errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`,
    );
  }

  // Clone the root and apply size overrides
  const root = { ...dsl.root };
  if (options?.width) root.width = options.width;
  if (options?.height) root.height = options.height;

  // Render the tree with a controlled frame override
  const element = renderRoot(root, { frame });

  return renderToStaticMarkup(element as React.ReactElement);
}
