import { useCallback, useRef, useEffect } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction, Viewport } from '../state/types';
import { MIN_ZOOM, MAX_ZOOM } from '../state/types';
import { startRafDrag } from '../interactions/rafDrag';

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
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Attach wheel handler as non-passive so we can preventDefault and block browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const vp = viewportRef.current;
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.002;
      const newZoom = clampZoom(vp.zoom * (1 + delta));
      const scale = newZoom / vp.zoom;

      const newX = cursorX - (cursorX - vp.x) * scale;
      const newY = cursorY - (cursorY - vp.y) * scale;

      dispatch({ type: 'SET_VIEWPORT', viewport: { x: newX, y: newY, zoom: newZoom } });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [dispatch, containerRef]);

  /** Start panning (Space+drag or middle-click) */
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    // Middle button or space-panning mode
    if (e.button === 1 || isPanning) {
      const startViewport = viewport;
      startRafDrag({
        event: e,
        onFrame: point => dispatch({ type: 'SET_VIEWPORT', viewport: { x: startViewport.x + point.deltaX, y: startViewport.y + point.deltaY } }),
      });
    }
  }, [dispatch, isPanning, viewport]);

  const handlePanMove = useCallback((_e: React.PointerEvent) => {}, []);

  const handlePanEnd = useCallback((_e: React.PointerEvent) => {}, []);

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
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleFitToView,
    zoomIn,
    zoomOut,
  };
}
