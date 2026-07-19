import React, { useCallback, useRef } from 'react';
import { v } from '../theme/tokens';
import { startRafDrag, type RafDragPoint } from '../interactions/rafDrag';

export interface CameraFrameViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraFramingOverlayProps {
  viewport: CameraFrameViewport;
  sceneWidth: number;
  sceneHeight: number;
  aspectLocked: boolean;
  drawing: boolean;
  onViewportChange: (viewport: CameraFrameViewport) => void;
  onViewportCommit: (viewport: CameraFrameViewport) => void;
  onDrawingComplete: () => void;
}

const MIN_CAMERA_SIZE = 1;
const HANDLE_SIZE = 10;

export function getSceneCameraViewport(
  camera: { viewport: CameraFrameViewport; coordinateSpace?: 'scene' | 'normalized' } | undefined,
  sceneWidth: number,
  sceneHeight: number,
): CameraFrameViewport {
  if (!camera) return { x: 0, y: 0, width: sceneWidth, height: sceneHeight };
  const scaleX = camera.coordinateSpace === 'normalized' ? sceneWidth : 1;
  const scaleY = camera.coordinateSpace === 'normalized' ? sceneHeight : 1;
  return constrainCameraFrame({
    x: camera.viewport.x * scaleX,
    y: camera.viewport.y * scaleY,
    width: camera.viewport.width * scaleX,
    height: camera.viewport.height * scaleY,
  }, sceneWidth, sceneHeight);
}

export function toCameraViewport(
  viewport: CameraFrameViewport,
  coordinateSpace: 'scene' | 'normalized',
  sceneWidth: number,
  sceneHeight: number,
): CameraFrameViewport {
  if (coordinateSpace === 'scene') return viewport;
  return {
    x: viewport.x / sceneWidth,
    y: viewport.y / sceneHeight,
    width: viewport.width / sceneWidth,
    height: viewport.height / sceneHeight,
  };
}

export function constrainCameraFrame(
  viewport: CameraFrameViewport,
  sceneWidth: number,
  sceneHeight: number,
): CameraFrameViewport {
  const width = Math.min(Math.max(viewport.width, MIN_CAMERA_SIZE), sceneWidth);
  const height = Math.min(Math.max(viewport.height, MIN_CAMERA_SIZE), sceneHeight);
  return {
    x: Math.min(Math.max(viewport.x, 0), sceneWidth - width),
    y: Math.min(Math.max(viewport.y, 0), sceneHeight - height),
    width,
    height,
  };
}

export function focusCameraFrame(
  bounds: CameraFrameViewport,
  sceneWidth: number,
  sceneHeight: number,
  padding = Math.max(24, Math.max(bounds.width, bounds.height) * 0.08),
): CameraFrameViewport {
  const padded = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
  const sceneAspect = sceneWidth / sceneHeight;
  const paddedAspect = padded.width / padded.height;
  const centerX = padded.x + padded.width / 2;
  const centerY = padded.y + padded.height / 2;
  const viewport = paddedAspect < sceneAspect
    ? { x: centerX - (padded.height * sceneAspect) / 2, y: padded.y, width: padded.height * sceneAspect, height: padded.height }
    : { x: padded.x, y: centerY - padded.width / sceneAspect / 2, width: padded.width, height: padded.width / sceneAspect };
  return constrainCameraFrame(viewport, sceneWidth, sceneHeight);
}

function moveCameraFrame(
  viewport: CameraFrameViewport,
  dx: number,
  dy: number,
  sceneWidth: number,
  sceneHeight: number,
): CameraFrameViewport {
  return constrainCameraFrame({ ...viewport, x: viewport.x + dx, y: viewport.y + dy }, sceneWidth, sceneHeight);
}

export function resizeCameraFrame(
  viewport: CameraFrameViewport,
  handle: string,
  dx: number,
  dy: number,
  sceneWidth: number,
  sceneHeight: number,
  aspectLocked: boolean,
): CameraFrameViewport {
  if (!aspectLocked) {
    const right = viewport.x + viewport.width;
    const bottom = viewport.y + viewport.height;
    const left = handle.includes('w')
      ? Math.min(Math.max(viewport.x + dx, 0), right - MIN_CAMERA_SIZE)
      : viewport.x;
    const nextRight = handle.includes('e')
      ? Math.max(Math.min(right + dx, sceneWidth), left + MIN_CAMERA_SIZE)
      : right;
    const top = handle.includes('n')
      ? Math.min(Math.max(viewport.y + dy, 0), bottom - MIN_CAMERA_SIZE)
      : viewport.y;
    const nextBottom = handle.includes('s')
      ? Math.max(Math.min(bottom + dy, sceneHeight), top + MIN_CAMERA_SIZE)
      : bottom;
    return { x: left, y: top, width: nextRight - left, height: nextBottom - top };
  }

  const aspect = sceneWidth / sceneHeight;
  const horizontalDelta = handle.includes('e') ? dx : handle.includes('w') ? -dx : undefined;
  const verticalDelta = handle.includes('s') ? dy * aspect : handle.includes('n') ? -dy * aspect : undefined;
  const widthDelta = horizontalDelta === undefined
    ? verticalDelta ?? 0
    : verticalDelta === undefined || Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
      ? horizontalDelta
      : verticalDelta;
  const horizontalLimit = handle.includes('w')
    ? viewport.x + viewport.width
    : handle.includes('e')
      ? sceneWidth - viewport.x
      : Math.min(viewport.x + viewport.width / 2, sceneWidth - viewport.x - viewport.width / 2) * 2;
  const verticalLimit = handle.includes('n')
    ? viewport.y + viewport.height
    : handle.includes('s')
      ? sceneHeight - viewport.y
      : Math.min(viewport.y + viewport.height / 2, sceneHeight - viewport.y - viewport.height / 2) * 2;
  const width = Math.min(
    Math.max(viewport.width + widthDelta, MIN_CAMERA_SIZE),
    sceneWidth,
    horizontalLimit,
    verticalLimit * aspect,
  );
  const height = width / aspect;
  const x = handle.includes('w')
    ? viewport.x + viewport.width - width
    : handle.includes('e')
      ? viewport.x
      : viewport.x + (viewport.width - width) / 2;
  const y = handle.includes('n')
    ? viewport.y + viewport.height - height
    : handle.includes('s')
      ? viewport.y
      : viewport.y + (viewport.height - height) / 2;
  return { x, y, width, height };
}

function drawCameraFrame(
  start: { x: number; y: number },
  end: { x: number; y: number },
  sceneWidth: number,
  sceneHeight: number,
  aspectLocked: boolean,
): CameraFrameViewport {
  if (!aspectLocked) {
    return constrainCameraFrame({
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    }, sceneWidth, sceneHeight);
  }
  const aspect = sceneWidth / sceneHeight;
  const directionX = end.x >= start.x ? 1 : -1;
  const directionY = end.y >= start.y ? 1 : -1;
  const widthFromX = Math.abs(end.x - start.x);
  const widthFromY = Math.abs(end.y - start.y) * aspect;
  const width = Math.max(widthFromX, widthFromY);
  const height = width / aspect;
  return constrainCameraFrame({
    x: directionX > 0 ? start.x : start.x - width,
    y: directionY > 0 ? start.y : start.y - height,
    width,
    height,
  }, sceneWidth, sceneHeight);
}

function toScenePoint(
  event: React.PointerEvent<SVGElement> | RafDragPoint,
  svg: SVGSVGElement,
  sceneWidth: number,
  sceneHeight: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * sceneWidth,
    y: ((event.clientY - rect.top) / rect.height) * sceneHeight,
  };
}

function sameViewport(left: CameraFrameViewport, right: CameraFrameViewport): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

export function CameraFramingOverlay({
  viewport,
  sceneWidth,
  sceneHeight,
  aspectLocked,
  drawing,
  onViewportChange,
  onViewportCommit,
  onDrawingComplete,
}: CameraFramingOverlayProps) {
  const latestViewportRef = useRef(viewport);
  latestViewportRef.current = viewport;

  const beginDrag = useCallback((event: React.PointerEvent<SVGElement>, mode: 'move' | string) => {
    if (event.button !== 0) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toScenePoint(event, svg, sceneWidth, sceneHeight);
    const initialViewport = viewport;
    let changed = false;

    startRafDrag({
      event,
      moveThreshold: 0,
      onFrame: point => {
        const current = toScenePoint(point, svg, sceneWidth, sceneHeight);
        const next = mode === 'move'
          ? moveCameraFrame(initialViewport, current.x - start.x, current.y - start.y, sceneWidth, sceneHeight)
          : resizeCameraFrame(initialViewport, mode, current.x - start.x, current.y - start.y, sceneWidth, sceneHeight, aspectLocked);
        if (!sameViewport(next, latestViewportRef.current)) {
          latestViewportRef.current = next;
          onViewportChange(next);
          changed = true;
        }
      },
      onCommit: () => {
        if (changed) onViewportCommit(latestViewportRef.current);
      },
    });
  }, [aspectLocked, onViewportChange, onViewportCommit, sceneHeight, sceneWidth, viewport]);

  const beginDraw = useCallback((event: React.PointerEvent<SVGRectElement>) => {
    if (event.button !== 0) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toScenePoint(event, svg, sceneWidth, sceneHeight);
    let changed = false;

    startRafDrag({
      event,
      moveThreshold: 0,
      onFrame: point => {
        const next = drawCameraFrame(start, toScenePoint(point, svg, sceneWidth, sceneHeight), sceneWidth, sceneHeight, aspectLocked);
        if (!sameViewport(next, latestViewportRef.current)) {
          latestViewportRef.current = next;
          onViewportChange(next);
          changed = true;
        }
      },
      onCommit: () => {
        if (changed) onViewportCommit(latestViewportRef.current);
        onDrawingComplete();
      },
      onCancel: onDrawingComplete,
    });
  }, [aspectLocked, onDrawingComplete, onViewportChange, onViewportCommit, sceneHeight, sceneWidth]);

  const handles = [
    { id: 'nw', x: viewport.x, y: viewport.y, cursor: 'nw-resize' },
    { id: 'n', x: viewport.x + viewport.width / 2, y: viewport.y, cursor: 'n-resize' },
    { id: 'ne', x: viewport.x + viewport.width, y: viewport.y, cursor: 'ne-resize' },
    { id: 'e', x: viewport.x + viewport.width, y: viewport.y + viewport.height / 2, cursor: 'e-resize' },
    { id: 'se', x: viewport.x + viewport.width, y: viewport.y + viewport.height, cursor: 'se-resize' },
    { id: 's', x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height, cursor: 's-resize' },
    { id: 'sw', x: viewport.x, y: viewport.y + viewport.height, cursor: 'sw-resize' },
    { id: 'w', x: viewport.x, y: viewport.y + viewport.height / 2, cursor: 'w-resize' },
  ];

  return (
    <g className="elucim-editor-camera-frame" aria-label="Camera framing rectangle">
      <rect
        x={0}
        y={0}
        width={sceneWidth}
        height={sceneHeight}
        fill="transparent"
        style={{ pointerEvents: 'all' }}
        onPointerDown={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <rect x={0} y={0} width={sceneWidth} height={viewport.y} fill={v('--elucim-editor-overlay')} pointerEvents="none" />
      <rect x={0} y={viewport.y} width={viewport.x} height={viewport.height} fill={v('--elucim-editor-overlay')} pointerEvents="none" />
      <rect x={viewport.x + viewport.width} y={viewport.y} width={sceneWidth - viewport.x - viewport.width} height={viewport.height} fill={v('--elucim-editor-overlay')} pointerEvents="none" />
      <rect x={0} y={viewport.y + viewport.height} width={sceneWidth} height={sceneHeight - viewport.y - viewport.height} fill={v('--elucim-editor-overlay')} pointerEvents="none" />
      <rect
        x={viewport.x}
        y={viewport.y}
        width={viewport.width}
        height={viewport.height}
        fill="none"
        stroke={v('--elucim-editor-accent')}
        strokeWidth={2}
        strokeDasharray="6 3"
        style={{ pointerEvents: 'stroke', cursor: 'move' }}
        onPointerDown={event => beginDrag(event, 'move')}
      />
      <circle
        cx={viewport.x + viewport.width / 2}
        cy={viewport.y + viewport.height / 2}
        r={HANDLE_SIZE / 2}
        fill={v('--elucim-editor-accent')}
        stroke={v('--elucim-editor-handle-fill')}
        strokeWidth={1.5}
        data-testid="camera-frame-move-handle"
        style={{ pointerEvents: 'all', cursor: 'move' }}
        onPointerDown={event => beginDrag(event, 'move')}
      />
      {handles.map(handle => (
        <rect
          key={handle.id}
          x={handle.x - HANDLE_SIZE / 2}
          y={handle.y - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          rx={1}
          fill={v('--elucim-editor-handle-fill')}
          stroke={v('--elucim-editor-accent')}
          strokeWidth={1.5}
          data-testid={`camera-frame-handle-${handle.id}`}
          style={{ pointerEvents: 'all', cursor: handle.cursor }}
          onPointerDown={event => beginDrag(event, handle.id)}
        />
      ))}
      {drawing && (
        <rect
          x={0}
          y={0}
          width={sceneWidth}
          height={sceneHeight}
          fill="transparent"
          data-testid="camera-frame-draw-surface"
          style={{ pointerEvents: 'all', cursor: 'crosshair' }}
          onPointerDown={beginDraw}
        />
      )}
    </g>
  );
}
