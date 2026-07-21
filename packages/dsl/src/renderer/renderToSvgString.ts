import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { renderDocument } from './renderElements';
import { validate } from '../validator/validate';
import { applyTimelineFrames, evaluateTimelineCameraFrames, getInitialStateSnapshot, getStateMachineVisualFrames, resolveTimelineReveals } from '../document';
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
 * Player documents are rendered as static scenes when a frame is supplied.
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

  const timelineFrames = [
    ...getDefaultStateMachineInitialFrames(dsl),
    ...(options?.timelineId ? [{ timelineId: options.timelineId, frame }] : []),
  ];
  const projected = timelineFrames.length > 0 ? applyTimelineFrames(dsl, timelineFrames) : dsl;
  const sizedDocument: ElucimDocument = {
    ...projected,
    scene: {
      ...projected.scene,
      ...(options?.width ? { width: options.width } : {}),
      ...(options?.height ? { height: options.height } : {}),
    },
  };

  const element = renderDocument(sizedDocument, {
    frame,
    camera: evaluateTimelineCameraFrames(dsl, timelineFrames),
    revealStates: resolveTimelineReveals(dsl, timelineFrames),
  });

  return renderToStaticMarkup(element as React.ReactElement);
}

function getDefaultStateMachineInitialFrames(dsl: ElucimDocument) {
  const machineId = dsl.defaultStateMachine;
  if (!machineId || !dsl.stateMachines?.[machineId]) return [];
  const snapshot = getInitialStateSnapshot(dsl, machineId);
  return getStateMachineVisualFrames(dsl, machineId, {
    statePath: [snapshot.stateId],
    currentStateId: snapshot.stateId,
    currentFrame: 0,
    missingState: 'skip',
    missingTimeline: 'skip',
  });
}
