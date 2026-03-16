import React, { useRef, useCallback, useState, useEffect, type MouseEvent } from 'react';
import { Scene } from '@elucim/core';
import { renderElement } from '@elucim/dsl';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { SelectionOverlay } from './SelectionOverlay';
import { useDrag } from './useDrag';
import { useKeyboardShortcuts } from './useKeyboard';
import { useViewport, screenToScene, fitToView } from './useViewport';
import { DotGrid } from './DotGrid';
import { Minimap } from './Minimap';
import { ZoomControls } from './ZoomControls';
import { getElementBounds } from '../utils/bounds';
import { exportToJson, importFromJson } from '../utils/io';

export interface ElucimCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Full-bleed editor canvas with viewport pan/zoom, dot grid, minimap, and zoom controls.
 */
export function ElucimCanvas({ className, style }: ElucimCanvasProps) {
  const { state, dispatch } = useEditorState();
  const { document, selectedIds, currentFrame, viewport, isPanning } = state;
  const root = document.root;
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Resolve scene dimensions
  const width = ('width' in root ? root.width : undefined) ?? 800;
  const height = ('height' in root ? root.height : undefined) ?? 600;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const background = ('background' in root ? root.background : undefined) ?? '#0f172a';

  // Get children from root
  const children: ElementNode[] = ('children' in root && Array.isArray(root.children)) ? root.children : [];
  const elementIds = children.map((el, i) => getElementId(el, i));

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Fit to view on first render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const vp = fitToView(rect.width, rect.height, width, height);
      dispatch({ type: 'SET_VIEWPORT', viewport: vp });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewport interactions (wheel handler attached via useEffect inside useViewport)
  const {
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleFitToView,
    zoomIn,
    zoomOut,
  } = useViewport({
    dispatch,
    viewport,
    isPanning,
    containerRef,
    sceneWidth: width,
    sceneHeight: height,
  });

  // Drag interactions (element move/resize/rotate)
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
    getDocumentJson,
    importDocument: handleImport,
  });

  // Click handler — deselect when clicking empty canvas space
  const handleCanvasClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) return;
    const target = e.target as HTMLElement;
    // If click hit an element (handled by useDrag pointer handlers), do nothing
    if (target.closest('[data-editor-id]')) return;
    // If click hit a panel or control, do nothing
    if (target.closest('.elucim-editor-overlay')) return;
    dispatch({ type: 'DESELECT_ALL' });
  }, [dispatch, isPanning]);

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

  // Cursor based on state
  const cursor = isPanning ? 'grab' : state.activeTool !== 'select' ? 'crosshair' : 'default';

  return (
    <div
      ref={containerRef}
      className={`elucim-editor-canvas ${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor,
        ...style,
      }}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onClick={handleCanvasClick}
    >
      {/* Dot grid background */}
      <DotGrid spacing={20} />

      {/* Scene + overlay: transformed by viewport */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        {/* Scene layer */}
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

        {/* Overlay layer */}
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
          {hitTargets.map(({ id, bounds }) => {
            const { rotation, rotationCenter } = bounds;
            const transform = rotation && rotationCenter
              ? `rotate(${rotation}, ${rotationCenter[0]}, ${rotationCenter[1]})`
              : undefined;
            return (
              <rect
                key={`hit-${id}`}
                data-editor-id={id}
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="transparent"
                transform={transform}
                style={{ pointerEvents: 'all', cursor: isPanning ? 'grab' : 'pointer' }}
              />
            );
          })}
          <SelectionOverlay selections={selectedBounds} />
        </svg>
      </div>

      {/* Minimap */}
      <Minimap
        viewport={viewport}
        sceneWidth={width}
        sceneHeight={height}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        elements={children}
        onViewportChange={(vp) => dispatch({ type: 'SET_VIEWPORT', viewport: vp })}
      />

      {/* Zoom controls */}
      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToView={handleFitToView}
      />
    </div>
  );
}
