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
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenu';

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

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Determine which element was right-clicked
    const target = e.target as HTMLElement | SVGElement;
    const editorId = target.getAttribute?.('data-editor-id') ??
      (target as Element).closest?.('[data-editor-id]')?.getAttribute('data-editor-id');

    // If right-clicked on an element, select it first
    if (editorId && !selectedIds.includes(editorId)) {
      dispatch({ type: 'SELECT', ids: [editorId] });
    }

    const ids = editorId && !selectedIds.includes(editorId) ? [editorId] : [...selectedIds];
    const hasSelection = ids.length > 0;
    const singleEl = hasSelection ? children.find((c, i) => elementIds[i] === ids[0]) : undefined;
    const isGroup = singleEl?.type === 'group';

    const items: ContextMenuItem[] = [
      {
        label: 'Group',
        shortcut: 'Ctrl+G',
        disabled: ids.length < 2,
        onClick: () => dispatch({ type: 'GROUP_ELEMENTS', ids }),
        separator: false,
      },
      {
        label: 'Ungroup',
        shortcut: 'Ctrl+Shift+G',
        disabled: !isGroup,
        onClick: () => { if (ids[0]) dispatch({ type: 'UNGROUP', id: ids[0] }); },
        separator: false,
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Duplicate',
        disabled: !hasSelection,
        onClick: () => {
          for (const id of ids) {
            const idx = elementIds.indexOf(id);
            if (idx >= 0) {
              const clone = JSON.parse(JSON.stringify(children[idx]));
              if ('id' in clone) clone.id = `${clone.id}-copy-${Date.now().toString(36).slice(-4)}`;
              if ('x' in clone && typeof clone.x === 'number') clone.x += 20;
              if ('y' in clone && typeof clone.y === 'number') clone.y += 20;
              if ('cx' in clone && typeof clone.cx === 'number') clone.cx += 20;
              if ('cy' in clone && typeof clone.cy === 'number') clone.cy += 20;
              dispatch({ type: 'ADD_ELEMENT', element: clone });
            }
          }
        },
        separator: false,
      },
      {
        label: 'Delete',
        shortcut: 'Del',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'DELETE_ELEMENTS', ids }),
        separator: false,
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Select All',
        shortcut: 'Ctrl+A',
        disabled: children.length === 0,
        onClick: () => dispatch({ type: 'SELECT', ids: [...elementIds] }),
        separator: false,
      },
      {
        label: 'Deselect All',
        shortcut: 'Esc',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'DESELECT_ALL' }),
        separator: false,
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [selectedIds, children, elementIds, dispatch]);

  return (
    <div
      ref={containerRef}
      className={`elucim-editor-canvas ${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 15,
        overflow: 'hidden',
        cursor,
        borderRadius: 6,
        border: `1px solid ${v('--elucim-editor-border')}`,
        boxShadow: `inset 0 0 0 0 transparent, 0 2px 8px rgba(0,0,0,0.25)`,
        ...style,
      }}
      onPointerDown={(e) => { handlePanStart(e); handleMarqueeStart(e); }}
      onPointerMove={(e) => { handlePanMove(e); handleMarqueeMove(e); }}
      onPointerUp={(e) => { handlePanEnd(e); handleMarqueeEnd(e); }}
      onContextMenu={handleContextMenu}
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
                style={{ pointerEvents: 'all', cursor: isPanning ? 'grab' : 'default' }}
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

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
