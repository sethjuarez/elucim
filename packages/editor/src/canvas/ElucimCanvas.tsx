import React, { useRef, useCallback, type MouseEvent } from 'react';
import { Scene } from '@elucim/core';
import { renderElement } from '@elucim/dsl';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { SelectionOverlay } from './SelectionOverlay';
import { useDrag } from './useDrag';
import { useKeyboardShortcuts } from './useKeyboard';
import { getElementBounds } from '../utils/bounds';
import { exportToJson, importFromJson } from '../utils/io';

export interface ElucimCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The main editor canvas — renders the Elucim scene with an interactive overlay
 * for selecting and manipulating elements.
 */
export function ElucimCanvas({ className, style }: ElucimCanvasProps) {
  const { state, dispatch } = useEditorState();
  const { document, selectedIds, currentFrame } = state;
  const root = document.root;
  const overlaySvgRef = useRef<SVGSVGElement>(null);

  // Resolve scene dimensions
  const width = ('width' in root ? root.width : undefined) ?? 800;
  const height = ('height' in root ? root.height : undefined) ?? 600;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const background = ('background' in root ? root.background : undefined) ?? '#0f172a';

  // Get children from root
  const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];

  // Build element ID map for hit testing
  const elementIds = children.map((el, i) => getElementId(el, i));

  // Drag interactions
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDrag({
    dispatch,
    svgRef: overlaySvgRef,
    sceneWidth: width,
    sceneHeight: height,
  });

  // Keyboard shortcuts
  const getDocumentJson = useCallback(() => exportToJson(document), [document]);
  const handleImport = useCallback((json: string) => {
    const result = importFromJson(json);
    if (result.document) {
      dispatch({ type: 'SET_DOCUMENT', document: result.document });
    }
  }, [dispatch]);

  useKeyboardShortcuts({
    dispatch,
    selectedIds,
    getDocumentJson: getDocumentJson,
    importDocument: handleImport,
  });

  // Click handler — select element or deselect
  const handleCanvasClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const elementId = target.closest('[data-editor-id]')?.getAttribute('data-editor-id');

    if (elementId) {
      if (e.shiftKey) {
        dispatch({ type: 'SELECT_TOGGLE', id: elementId });
      } else {
        dispatch({ type: 'SELECT', ids: [elementId] });
      }
    } else {
      dispatch({ type: 'DESELECT_ALL' });
    }
  }, [dispatch]);

  // Collect selected element bounds for the overlay
  const selectedBounds = selectedIds
    .map(id => {
      const idx = elementIds.indexOf(id);
      if (idx < 0) return null;
      const bounds = getElementBounds(children[idx]);
      return bounds ? { id, bounds } : null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Build hit-test targets for all elements
  const hitTargets = children
    .map((el, i) => {
      const bounds = getElementBounds(el);
      return bounds ? { id: elementIds[i], bounds } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return (
    <div
      className={`elucim-editor-canvas ${className ?? ''}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
      onClick={handleCanvasClick}
    >
      {/* Scene layer — renders the actual Elucim content */}
      <Scene
        width={width}
        height={height}
        fps={fps}
        durationInFrames={durationInFrames}
        background={background}
        frame={currentFrame}
      >
        {children.map((child, i) => (
          <React.Fragment key={elementIds[i]}>
            {renderElement(child, i)}
          </React.Fragment>
        ))}
      </Scene>

      {/* Overlay layer — selection handles and hit targets */}
      <svg
        ref={overlaySvgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
        className="elucim-editor-overlay"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Invisible hit targets for each element */}
        {hitTargets.map(({ id, bounds }) => (
          <rect
            key={`hit-${id}`}
            data-editor-id={id}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="transparent"
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
          />
        ))}

        {/* Selection overlay for selected elements */}
        <SelectionOverlay selections={selectedBounds} />
      </svg>
    </div>
  );
}
