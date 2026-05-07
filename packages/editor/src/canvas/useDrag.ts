import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction } from '../state/types';
import type { BoundingBox } from '../utils/bounds';
import { startRafDrag, type RafDragPoint } from '../interactions/rafDrag';

export interface DragState {
  type: 'move' | 'resize' | 'rotate' | 'move-graph-node';
  elementId: string;
  startX: number;
  startY: number;
  handle?: string;
  initialBounds?: BoundingBox;
  graphNodeId?: string;
  altDuplicated?: boolean;
}

interface UseDragOptions {
  dispatch: Dispatch<EditorAction>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  sceneWidth: number;
  sceneHeight: number;
  selectedIds: string[];
}

/** Convert a mouse event to SVG coordinates */
function toSvgCoords(
  e: React.PointerEvent | PointerEvent | RafDragPoint,
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
export function useDrag({ dispatch, svgRef, sceneWidth, sceneHeight, selectedIds }: UseDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const accDx = useRef(0);
  const accDy = useRef(0);
  const didDrag = useRef(false);
  const modifierKeyRef = useRef(false);
  const activeDragType = useRef<'move' | 'resize' | 'rotate' | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Right-click should open the context menu without changing selection.
    if (e.button !== 0) return;

    const target = e.target as SVGElement;
    const svg = svgRef.current;
    if (!svg) return;

    const coords = toSvgCoords(e, svg, sceneWidth, sceneHeight);

    // Check for resize handle
    const handleAttr = target.getAttribute('data-handle');
    const editorId = target.getAttribute('data-editor-id') ??
                     target.closest('[data-editor-id]')?.getAttribute('data-editor-id');

    if (!editorId) return;

    modifierKeyRef.current = e.shiftKey || e.ctrlKey || e.metaKey;

    if (handleAttr) {
      const isRotate = handleAttr === 'rotate';
      const type = isRotate ? 'rotate' as const : 'resize' as const;
      dragRef.current = {
        type,
        elementId: editorId,
        startX: coords.x,
        startY: coords.y,
        handle: handleAttr,
      };
      activeDragType.current = type;
    } else {
      // Check for graph node vertex drag
      const graphNodeId = target.getAttribute('data-graph-node-id') ??
                          target.closest('[data-graph-node-id]')?.getAttribute('data-graph-node-id');
      if (graphNodeId) {
        dragRef.current = {
          type: 'move-graph-node',
          elementId: editorId,
          startX: coords.x,
          startY: coords.y,
          graphNodeId,
        };
        activeDragType.current = 'move';
      } else {
        dragRef.current = {
          type: 'move',
          elementId: editorId,
          startX: coords.x,
          startY: coords.y,
        };
        activeDragType.current = 'move';
      }
    }

    accDx.current = 0;
    accDy.current = 0;
    didDrag.current = false;

    const applyDragFrame = (point: RafDragPoint) => {
      const drag = dragRef.current;
      const currentSvg = svgRef.current;
      if (!drag || !currentSvg) return;

      const currentCoords = toSvgCoords(point, currentSvg, sceneWidth, sceneHeight);
      const dx = currentCoords.x - drag.startX - accDx.current;
      const dy = currentCoords.y - drag.startY - accDy.current;

      if (drag.type === 'move') {
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
          // Alt+drag: duplicate on first drag movement
          if (point.altKey && !drag.altDuplicated) {
            drag.altDuplicated = true;
            const idsToClone = selectedIds.length > 1 && selectedIds.includes(drag.elementId)
              ? [...selectedIds]
              : [drag.elementId];
            dispatch({ type: 'DUPLICATE_ELEMENTS', ids: idsToClone, offset: { dx: 0, dy: 0 } });
          }
          didDrag.current = true;
          dispatch({ type: 'MOVE_ELEMENT', id: drag.elementId, dx, dy });
          accDx.current += dx;
          accDy.current += dy;
        }
      } else if (drag.type === 'move-graph-node') {
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
          didDrag.current = true;
          dispatch({ type: 'MOVE_GRAPH_NODE', graphId: drag.elementId, nodeId: drag.graphNodeId!, dx, dy });
          accDx.current += dx;
          accDy.current += dy;
        }
      } else if (drag.type === 'resize') {
        const handle = drag.handle!;
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
          didDrag.current = true;
          dispatch({ type: 'RESIZE_ELEMENT', id: drag.elementId, handle, dx, dy, constrain: point.shiftKey });
          accDx.current += dx;
          accDy.current += dy;
        }
      } else if (drag.type === 'rotate') {
        const angleDelta = dx * 0.5;
        if (Math.abs(angleDelta) >= 0.5) {
          didDrag.current = true;
          dispatch({ type: 'ROTATE_ELEMENT', id: drag.elementId, angleDeg: angleDelta });
          accDx.current += dx;
          accDy.current += dy;
        }
      }
    };

    startRafDrag({
      event: e,
      moveThreshold: 1,
      onFrame: applyDragFrame,
      onCommit: () => {
        const drag = dragRef.current;
        if (drag && !didDrag.current) {
          // No significant drag movement — treat as a click → select
          if (modifierKeyRef.current) {
            dispatch({ type: 'SELECT_TOGGLE', id: drag.elementId });
          } else {
            dispatch({ type: 'SELECT', ids: [drag.elementId] });
          }
        }
        dragRef.current = null;
        activeDragType.current = null;
      },
      onCancel: () => {
        dragRef.current = null;
        activeDragType.current = null;
      },
    });
  }, [dispatch, svgRef, sceneWidth, sceneHeight, selectedIds]);

  const handlePointerMove = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {}, []);

  const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {}, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp, activeDragType };
}
