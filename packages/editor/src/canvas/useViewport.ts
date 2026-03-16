import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction, Viewport } from '../state/types';
import { MIN_ZOOM, MAX_ZOOM } from '../state/types';

interface UseViewportOptions {
  dispatch: Dispatch<EditorAction>;
  viewport: Viewport;
  isPanning: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  sceneWidth: number;
  sceneHeight: number;
}

/** Clamp zoom to allowed range */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Calculate viewport to fit scene in container with padding */
export function fitToView(
  containerWidth: number,
  containerHeight: number,
  sceneWidth: number,
  sceneHeight: number,
  padding = 40,
): Viewport {
  const availW = containerWidth - padding * 2;
  const availH = containerHeight - padding * 2;
  const zoom = clampZoom(Math.min(availW / sceneWidth, availH / sceneHeight));
  const x = (containerWidth - sceneWidth * zoom) / 2;
  const y = (containerHeight - sceneHeight * zoom) / 2;
  return { x, y, zoom };
}

/** Convert screen coordinates to scene coordinates */
export function screenToScene(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (clientX - containerRect.left - viewport.x) / viewport.zoom,
    y: (clientY - containerRect.top - viewport.y) / viewport.zoom,
  };
}

/**
 * Hook for canvas viewport interactions: Ctrl+scroll zoom, Space+drag pan, middle-click pan.
 */
export function useViewport({
  dispatch,
  viewport,
  isPanning,
  containerRef,
  sceneWidth,
  sceneHeight,
}: UseViewportOptions) {
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  /** Ctrl+scroll: zoom toward cursor */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Zoom factor
    const delta = -e.deltaY * 0.002;
    const newZoom = clampZoom(viewport.zoom * (1 + delta));
    const scale = newZoom / viewport.zoom;

    // Zoom toward cursor: adjust pan so cursor stays at same scene position
    const newX = cursorX - (cursorX - viewport.x) * scale;
    const newY = cursorY - (cursorY - viewport.y) * scale;

    dispatch({ type: 'SET_VIEWPORT', viewport: { x: newX, y: newY, zoom: newZoom } });
  }, [dispatch, viewport, containerRef]);

  /** Start panning (Space+drag or middle-click) */
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    // Middle button or space-panning mode
    if (e.button === 1 || isPanning) {
      e.preventDefault();
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        vx: viewport.x,
        vy: viewport.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [isPanning, viewport]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    const pan = panStartRef.current;
    if (!pan) return;
    const dx = e.clientX - pan.x;
    const dy = e.clientY - pan.y;
    dispatch({ type: 'SET_VIEWPORT', viewport: { x: pan.vx + dx, y: pan.vy + dy } });
  }, [dispatch]);

  const handlePanEnd = useCallback((e: React.PointerEvent) => {
    if (panStartRef.current) {
      panStartRef.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  /** Fit scene to container */
  const handleFitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const vp = fitToView(rect.width, rect.height, sceneWidth, sceneHeight);
    dispatch({ type: 'SET_VIEWPORT', viewport: vp });
  }, [dispatch, containerRef, sceneWidth, sceneHeight]);

  /** Zoom in/out by step */
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = clampZoom(viewport.zoom * 1.25);
    const scale = newZoom / viewport.zoom;
    dispatch({
      type: 'SET_VIEWPORT',
      viewport: { x: cx - (cx - viewport.x) * scale, y: cy - (cy - viewport.y) * scale, zoom: newZoom },
    });
  }, [dispatch, viewport, containerRef]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = clampZoom(viewport.zoom / 1.25);
    const scale = newZoom / viewport.zoom;
    dispatch({
      type: 'SET_VIEWPORT',
      viewport: { x: cx - (cx - viewport.x) * scale, y: cy - (cy - viewport.y) * scale, zoom: newZoom },
    });
  }, [dispatch, viewport, containerRef]);

  return {
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleFitToView,
    zoomIn,
    zoomOut,
  };
}
