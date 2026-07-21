import { useCallback, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction, Viewport } from '../state/types';
import { CANVAS_ID } from '../state/types';
import type { BoundingBox } from '../utils/bounds';
import { screenToScene } from './useViewport';
import { startRafDrag } from '../interactions/rafDrag';
import { resolveCameraViewport, type CameraNode } from '@elucim/editor-projection';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseMarqueeOptions {
  dispatch: Dispatch<EditorAction>;
  viewport: Viewport;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPanning: boolean;
  activeTool: string;
  /** Map of element ID → measured bounds */
  boundsMap: Map<string, BoundingBox>;
  sceneWidth: number;
  sceneHeight: number;
  camera?: CameraNode;
}

/**
 * Marquee (lasso) selection: drag on empty canvas to draw a rectangle,
 * selects all elements whose bounds intersect it. Shift+drag adds to
 * existing selection.
 */
export function useMarquee({
  dispatch,
  viewport,
  containerRef,
  isPanning,
  activeTool,
  boundsMap,
  sceneWidth,
  sceneHeight,
  camera,
}: UseMarqueeOptions) {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const startRef = useRef<{ sceneX: number; sceneY: number } | null>(null);
  const shiftRef = useRef(false);

  const handleMarqueeStart = useCallback((e: React.PointerEvent) => {
    // Only activate for primary button in select mode, not panning
    if (e.button !== 0 || isPanning || activeTool !== 'select') return;

    // Don't start marquee if clicking on an element or UI control
    const target = e.target as HTMLElement;
    if (target.closest('[data-editor-id]')) return;
    if (target.closest('.elucim-editor-overlay')) return;
    if (target.closest('.elucim-editor-panel')) return;
    if (target.closest('.elucim-floating-panel')) return;
    if (target.closest('.elucim-editor-zoom-controls')) return;
    if (target.closest('.elucim-editor-minimap')) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scene = screenToMarqueeScene(e.clientX, e.clientY, rect, viewport, sceneWidth, sceneHeight, camera);

    const start = { sceneX: scene.x, sceneY: scene.y };
    startRef.current = start;
    shiftRef.current = e.shiftKey;
    setMarquee(null);

    startRafDrag({
      event: e,
      onFrame: point => {
        const frameRect = container.getBoundingClientRect();
        const current = screenToMarqueeScene(point.clientX, point.clientY, frameRect, viewport, sceneWidth, sceneHeight, camera);
        const x = Math.min(start.sceneX, current.x);
        const y = Math.min(start.sceneY, current.y);
        const width = Math.abs(current.x - start.sceneX);
        const height = Math.abs(current.y - start.sceneY);
        if (width > 2 || height > 2) {
          setMarquee({ x, y, width, height });
        }
      },
      onCommit: point => {
        startRef.current = null;
        const commitRect = container.getBoundingClientRect();
        const current = screenToMarqueeScene(point.clientX, point.clientY, commitRect, viewport, sceneWidth, sceneHeight, camera);
        const x = Math.min(start.sceneX, current.x);
        const y = Math.min(start.sceneY, current.y);
        const w = Math.abs(current.x - start.sceneX);
        const h = Math.abs(current.y - start.sceneY);

        // If drag was too small, treat as a click (select canvas)
        if (w < 3 && h < 3) {
          if (!shiftRef.current) {
            dispatch({ type: 'SELECT', ids: [CANVAS_ID] });
          }
          setMarquee(null);
          return;
        }

        // Find all elements whose bounds intersect the marquee
        const marqueeBox = { x, y, width: w, height: h };
        const hitIds: string[] = [];

        for (const [id, bounds] of boundsMap) {
          if (boundsIntersect(marqueeBox, bounds)) {
            hitIds.push(id);
          }
        }

        if (hitIds.length > 0) {
          if (shiftRef.current) {
            // Add to existing selection
            for (const id of hitIds) {
              dispatch({ type: 'SELECT_ADD', id });
            }
          } else {
            dispatch({ type: 'SELECT', ids: hitIds });
          }
        } else if (!shiftRef.current) {
          dispatch({ type: 'SELECT', ids: [CANVAS_ID] });
        }

        setMarquee(null);
      },
      onCancel: () => {
        startRef.current = null;
        setMarquee(null);
      },
    });
  }, [dispatch, isPanning, activeTool, viewport, containerRef, boundsMap, sceneWidth, sceneHeight, camera]);

  const handleMarqueeMove = useCallback((_e: React.PointerEvent) => {}, []);

  const handleMarqueeEnd = useCallback((_e: React.PointerEvent) => {}, []);

  return {
    marquee,
    handleMarqueeStart,
    handleMarqueeMove,
    handleMarqueeEnd,
  };
}

export function screenToMarqueeScene(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: Viewport,
  sceneWidth: number,
  sceneHeight: number,
  camera?: CameraNode,
): { x: number; y: number } {
  const scene = screenToScene(clientX, clientY, rect, viewport);
  if (!camera) return scene;
  const transform = resolveCameraViewport(camera, sceneWidth, sceneHeight);
  return {
    x: (scene.x - transform.offsetX) / transform.scale + transform.viewport.x,
    y: (scene.y - transform.offsetY) / transform.scale + transform.viewport.y,
  };
}

/** Check if two axis-aligned rectangles intersect. */
function boundsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: BoundingBox,
): boolean {
  // For rotated elements, use the AABB of the rotated bounds as an approximation.
  // This is generous (may catch elements slightly outside the marquee) but
  // feels natural — Photoshop/Figma behave similarly.
  let bx = b.x, by = b.y, bw = b.width, bh = b.height;

  if (b.rotation && b.rotationCenter) {
    // Compute AABB of the rotated rectangle
    const [cx, cy] = b.rotationCenter;
    const rad = (b.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const corners: [number, number][] = [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
    ];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of corners) {
      const dx = px - cx;
      const dy = py - cy;
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
    bx = minX; by = minY; bw = maxX - minX; bh = maxY - minY;
  }

  return !(
    a.x + a.width < bx ||
    bx + bw < a.x ||
    a.y + a.height < by ||
    by + bh < a.y
  );
}
