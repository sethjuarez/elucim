import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { renderRoot } from './renderElements';
import { validate } from '../validator/validate';
import { applyTimelineFrame, createRenderableDocument, evaluateTimelineCameraFrames, toRenderableDocument } from '../document';
import { applyDefaultStateMachineInitialFrame } from '../documentModel/compatibility';
import type { ElucimDocument as RenderableDocument } from '../schema/types';
import type { ElucimDocument } from '../document';

export interface RenderToSvgStringOptions {
  width?: number;
  height?: number;
  /** Canonical timeline to evaluate before rendering this frame. */
  timelineId?: string;
}

/**
 * Render a DSL document to an SVG string at a specific frame, without mounting to the DOM.
 * Uses react-dom/server's renderToStaticMarkup.
 *
 * Note: This renders the scene at the given frame by overriding the root node's properties.
 * For 'player' roots, it converts to a 'scene' internally (no controls needed for static output).
 */
export function renderToSvgString(
  dsl: ElucimDocument | RenderableDocument,
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

  const camera = dsl.version === '2.0' && options?.timelineId
    ? evaluateTimelineCameraFrames(dsl, [{ timelineId: options.timelineId, frame }])
    : undefined;
  const renderable = dsl.version === '2.0'
    ? createRenderableDocument(
      options?.timelineId
        ? applyTimelineFrame(applyDefaultStateMachineInitialFrame(dsl), options.timelineId, frame)
        : applyDefaultStateMachineInitialFrame(dsl),
    )
    : toRenderableDocument(dsl);

  // Clone the root and apply size overrides
  const root = { ...renderable.root };
  if (options?.width) root.width = options.width;
  if (options?.height) root.height = options.height;

  // Render the tree with a controlled frame override
  const element = renderRoot(root, { frame, camera });

  return renderToStaticMarkup(element as React.ReactElement);
}
