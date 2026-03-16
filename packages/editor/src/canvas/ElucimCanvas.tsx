import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Scene } from '@elucim/core';
import { renderElement } from '@elucim/dsl';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
import { SelectionOverlay } from './SelectionOverlay';
import { v, ROTATE_CURSOR } from '../theme/tokens';
import { useDrag } from './useDrag';
import { useKeyboardShortcuts } from './useKeyboard';
import { useViewport, screenToScene, fitToView } from './useViewport';
import { useMeasuredBounds } from './useMeasuredBounds';
import { useMarquee } from './useMarquee';
import { DotGrid } from './DotGrid';
import { Minimap } from './Minimap';
import { ZoomControls } from './ZoomControls';
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
  const sceneSvgRef = useRef<SVGSVGElement>(null);
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
  const { handlePointerDown, handlePointerMove, handlePointerUp, activeDragType } = useDrag({
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

  // DOM-measured bounds — pixel-perfect for every element type
  const measuredBounds = useMeasuredBounds(sceneSvgRef, elementIds, children);

  // Marquee (lasso) selection — drag on empty canvas to select
  const {
    marquee,
    handleMarqueeStart,
    handleMarqueeMove,
    handleMarqueeEnd,
  } = useMarquee({
    dispatch,
    viewport,
    containerRef,
    isPanning,
    activeTool: state.activeTool,
    boundsMap: measuredBounds,
  });

  // Collect selected element bounds for the overlay
  const selectedBounds = selectedIds
    .map(id => {
      const bounds = measuredBounds.get(id);
      return bounds ? { id, bounds } : null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Build hit-test targets for all elements
  const hitTargets = elementIds
    .map(id => {
      const bounds = measuredBounds.get(id);
      return bounds ? { id, bounds } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  // Cursor based on state — rotation drag shows custom rotation icon
  const cursor = activeDragType.current === 'rotate'
    ? ROTATE_CURSOR
    : isPanning ? 'grab' : state.activeTool !== 'select' ? 'crosshair' : 'default';

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
      onPointerDown={(e) => { handlePanStart(e); handleMarqueeStart(e); }}
      onPointerMove={(e) => { handlePanMove(e); handleMarqueeMove(e); }}
      onPointerUp={(e) => { handlePanEnd(e); handleMarqueeEnd(e); }}
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
          border: `1px solid ${v('--elucim-editor-border')}`,
          boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
          borderRadius: 2,
        }}
      >
        {/* Scene layer */}
        <Scene
          ref={sceneSvgRef}
          width={width}
          height={height}
          fps={fps}
          durationInFrames={durationInFrames}
          background={background}
          frame={currentFrame}
        >
          {children.map((child, i) => (
            <g key={elementIds[i]} data-measure-id={elementIds[i]}>
              {renderElement(child, i)}
            </g>
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
          {/* Marquee selection rectangle */}
          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill={v('--elucim-editor-accent')}
              fillOpacity={0.1}
              stroke={v('--elucim-editor-accent')}
              strokeWidth={1}
              strokeDasharray="6 3"
              style={{ pointerEvents: 'none' }}
            />
          )}
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
