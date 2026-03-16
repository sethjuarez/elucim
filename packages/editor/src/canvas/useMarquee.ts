import { useCallback, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction, Viewport } from '../state/types';
import { CANVAS_ID } from '../state/types';
import type { BoundingBox } from '../utils/bounds';
import { screenToScene } from './useViewport';

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
    const scene = screenToScene(e.clientX, e.clientY, rect, viewport);

    startRef.current = { sceneX: scene.x, sceneY: scene.y };
    shiftRef.current = e.shiftKey;
    setMarquee(null);

    container.setPointerCapture(e.pointerId);
  }, [isPanning, activeTool, viewport, containerRef]);

  const handleMarqueeMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scene = screenToScene(e.clientX, e.clientY, rect, viewport);
    const { sceneX: sx, sceneY: sy } = startRef.current;

    const x = Math.min(sx, scene.x);
    const y = Math.min(sy, scene.y);
    const width = Math.abs(scene.x - sx);
    const height = Math.abs(scene.y - sy);

    // Only show marquee after a minimum drag distance (avoid micro-drags)
    if (width > 2 || height > 2) {
      setMarquee({ x, y, width, height });
    }
  }, [viewport, containerRef]);

  const handleMarqueeEnd = useCallback((e: React.PointerEvent) => {
    const start = startRef.current;
    startRef.current = null;

    if (!start) return;

    const container = containerRef.current;
    if (container) {
      container.releasePointerCapture(e.pointerId);
    }

    const rect = container?.getBoundingClientRect();
    if (!rect) { setMarquee(null); return; }

    const scene = screenToScene(e.clientX, e.clientY, rect, viewport);
    const x = Math.min(start.sceneX, scene.x);
    const y = Math.min(start.sceneY, scene.y);
    const w = Math.abs(scene.x - start.sceneX);
    const h = Math.abs(scene.y - start.sceneY);

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
  }, [dispatch, viewport, containerRef, boundsMap]);

  return {
    marquee,
    handleMarqueeStart,
    handleMarqueeMove,
    handleMarqueeEnd,
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
