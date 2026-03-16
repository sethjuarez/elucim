import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction } from '../state/types';
import type { BoundingBox } from '../utils/bounds';

export interface DragState {
  type: 'move' | 'resize' | 'rotate';
  elementId: string;
  startX: number;
  startY: number;
  handle?: string;
  initialBounds?: BoundingBox;
}

interface UseDragOptions {
  dispatch: Dispatch<EditorAction>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  sceneWidth: number;
  sceneHeight: number;
}

/** Convert a mouse event to SVG coordinates */
function toSvgCoords(
  e: React.PointerEvent | PointerEvent,
  svgEl: SVGSVGElement,
  sceneWidth: number,
  sceneHeight: number,
): { x: number; y: number } {
  const rect = svgEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * sceneWidth;
  const y = ((e.clientY - rect.top) / rect.height) * sceneHeight;
  return { x, y };
}

/**
 * Hook providing drag-to-move, resize, and rotation interactions.
 * Returns pointer event handlers to attach to the overlay SVG.
 */
export function useDrag({ dispatch, svgRef, sceneWidth, sceneHeight }: UseDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const accDx = useRef(0);
  const accDy = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const svg = svgRef.current;
    if (!svg) return;

    const coords = toSvgCoords(e, svg, sceneWidth, sceneHeight);

    // Check for resize handle
    const handleAttr = target.getAttribute('data-handle');
    const editorId = target.getAttribute('data-editor-id') ??
                     target.closest('[data-editor-id]')?.getAttribute('data-editor-id');

    if (!editorId) return;

    if (handleAttr) {
      // Resize or rotation
      const isRotate = handleAttr === 'rotate';
      dragRef.current = {
        type: isRotate ? 'rotate' : 'resize',
        elementId: editorId,
        startX: coords.x,
        startY: coords.y,
        handle: handleAttr,
      };
    } else {
      // Move
      dragRef.current = {
        type: 'move',
        elementId: editorId,
        startX: coords.x,
        startY: coords.y,
      };
    }

    accDx.current = 0;
    accDy.current = 0;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [svgRef, sceneWidth, sceneHeight]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;

    const coords = toSvgCoords(e, svg, sceneWidth, sceneHeight);
    const dx = coords.x - drag.startX - accDx.current;
    const dy = coords.y - drag.startY - accDy.current;

    if (drag.type === 'move') {
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        dispatch({ type: 'MOVE_ELEMENT', id: drag.elementId, dx, dy });
        accDx.current += dx;
        accDy.current += dy;
      }
    } else if (drag.type === 'resize') {
      const handle = drag.handle!;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
        dispatch({ type: 'RESIZE_ELEMENT', id: drag.elementId, handle, dx, dy });
        accDx.current += dx;
        accDy.current += dy;
      }
    } else if (drag.type === 'rotate') {
      // Compute angle based on pointer position relative to element center
      const angleDelta = dx * 0.5; // Simple: horizontal movement = rotation degrees
      if (Math.abs(angleDelta) >= 0.5) {
        dispatch({ type: 'ROTATE_ELEMENT', id: drag.elementId, angleDeg: angleDelta });
        accDx.current += dx;
        accDy.current += dy;
      }
    }
  }, [dispatch, svgRef, sceneWidth, sceneHeight]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
  }, [svgRef]);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
