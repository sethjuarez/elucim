import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Scene } from '@elucim/core';
import { renderElement } from '@elucim/dsl';
import type { ElucimDocument, ElementNode } from '@elucim/dsl';
import { resolveColor, DARK_THEME, LIGHT_THEME, normalizeTheme, themeToVars, type ElucimTheme } from '@elucim/core';
import { useEditorState } from '../state/EditorProvider';
import { CANVAS_ID, getElementId } from '../state/types';
import { findElementById } from '../state/reducer';
import { getElementBounds, type BoundingBox } from '../utils/bounds';
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
  /** Optional render-only document, used for timeline/state preview without mutating editor state. */
  previewDocument?: ElucimDocument;
  /** Whether a state-machine preview is actively driving the canvas. */
  stateMachinePreviewActive?: boolean;
  /** Fired for canvas clicks while state-machine preview is active. Return true when handled. */
  onStateMachinePreviewClick?: () => boolean;
  /** Fired for canvas key presses while state-machine preview is active. Return true when handled. */
  onStateMachinePreviewKeyDown?: (key: string) => boolean;
  /** Explicitly exits state-machine preview mode. */
  onStateMachinePreviewExit?: () => void;
  /** Editor color scheme — used to pick content theme when background is a $token. */
  editorColorScheme?: string;
  /** Explicit content theme — when provided, used for scene CSS vars instead of built-in presets. */
  contentTheme?: ElucimTheme;
}

function groupableIds(root: ElucimDocument['root'], ids: string[]): string[] {
  const realIds = ids.filter(id => id !== CANVAS_ID);
  const locations = realIds.map(id => findElementById(root as any, id)).filter(Boolean);
  if (locations.length < 2) return [];
  const parent = locations[0]?.parent;
  if (!parent || locations.some(loc => loc?.parent !== parent)) return [];
  return realIds;
}

function shouldPreservePointerFocus(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'));
}

function resolveSelectionBounds(
  root: ElucimDocument['root'],
  measuredBounds: Map<string, BoundingBox>,
  sceneSvg: SVGSVGElement | null,
  id: string,
): BoundingBox | null {
  const measured = measuredBounds.get(id);
  if (measured) return measured;
  const loc = findElementById(root, id);
  if (!loc) return null;
  const domBounds = measureNestedElementBounds(sceneSvg, root, loc.element, loc.parentPath);
  if (domBounds) return domBounds;
  const bounds = getElementBounds(loc.element);
  if (!bounds) return null;
  return applyAncestorTransforms(root, loc.parentPath, bounds);
}

function measureNestedElementBounds(
  sceneSvg: SVGSVGElement | null,
  root: ElucimDocument['root'],
  element: ElementNode,
  parentPath: string,
): BoundingBox | null {
  if (!sceneSvg || parentPath === 'root') return null;
  const topLevelId = getTopLevelAncestorId(root, parentPath);
  if (!topLevelId) return null;
  const topWrapper = sceneSvg.querySelector(`[data-measure-id="${CSS.escape(topLevelId)}"]`);
  if (!topWrapper) return null;

  const target = findRenderedElement(topWrapper, element);
  return target ? measureGraphicsElementInScene(target, sceneSvg) : null;
}

function getTopLevelAncestorId(root: ElucimDocument['root'], parentPath: string): string | null {
  let currentPath = parentPath;
  let topId: string | null = null;

  while (currentPath !== 'root') {
    const loc = findElementById(root, currentPath);
    if (!loc) break;
    topId = loc.id;
    currentPath = loc.parentPath;
  }

  return topId;
}

function findRenderedElement(wrapper: Element, element: ElementNode): SVGGraphicsElement | null {
  const el = element as Record<string, any>;

  if (el.type === 'text' && typeof el.content === 'string') {
    const candidates = Array.from(wrapper.querySelectorAll<SVGTextElement>('text[data-testid="elucim-text"], text'));
    return candidates.find(candidate => {
      const textMatches = (candidate.textContent ?? '') === el.content;
      const xMatches = typeof el.x !== 'number' || Math.abs(parseFloat(candidate.getAttribute('x') ?? 'NaN') - el.x) < 0.1;
      const yMatches = typeof el.y !== 'number' || Math.abs(parseFloat(candidate.getAttribute('y') ?? 'NaN') - el.y) < 0.1;
      return textMatches && xMatches && yMatches;
    }) ?? null;
  }

  if (el.type === 'latex' && typeof el.expression === 'string') {
    const candidates = Array.from(wrapper.querySelectorAll<SVGForeignObjectElement>('foreignObject[data-testid="elucim-latex"]'));
    if (candidates.length === 1) return candidates[0] as unknown as SVGGraphicsElement;
    const match = candidates.find(candidate => {
      const xMatches = typeof el.x !== 'number' || Math.abs(parseFloat(candidate.getAttribute('x') ?? 'NaN') - el.x) < Math.max(1, ((el.fontSize as number | undefined) ?? 24) * 8);
      const yMatches = typeof el.y !== 'number' || Math.abs(parseFloat(candidate.getAttribute('y') ?? 'NaN') - (el.y - ((el.fontSize as number | undefined) ?? 24) * 1.5)) < 0.1;
      return xMatches && yMatches;
    });
    return match ? match as unknown as SVGGraphicsElement : null;
  }

  if (el.type === 'graph' && Array.isArray(el.nodes)) {
    const graphs = Array.from(wrapper.querySelectorAll<SVGGElement>('[data-testid="elucim-graph"]'));
    if (graphs.length === 1) return graphs[0];
    return graphs.find(graph => el.nodes.every((node: any) => (
      typeof node.id === 'string' && graph.querySelector(`[data-graph-node-id="${CSS.escape(node.id)}"]`)
    ))) ?? null;
  }

  return null;
}

function measureGraphicsElementInScene(target: SVGGraphicsElement, sceneSvg: SVGSVGElement): BoundingBox | null {
  try {
    const bbox = target.getBBox();
    if (bbox.width === 0 && bbox.height === 0) return null;
    const targetCtm = target.getScreenCTM();
    const sceneCtm = sceneSvg.getScreenCTM();
    if (!targetCtm || !sceneCtm) return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    const matrix = sceneCtm.inverse().multiply(targetCtm);
    const corners = [
      new DOMPoint(bbox.x, bbox.y),
      new DOMPoint(bbox.x + bbox.width, bbox.y),
      new DOMPoint(bbox.x, bbox.y + bbox.height),
      new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
    ].map(point => point.matrixTransform(matrix));

    const xs = corners.map(point => point.x);
    const ys = corners.map(point => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } catch {
    return null;
  }
}

function applyAncestorTransforms(
  root: ElucimDocument['root'],
  parentPath: string,
  bounds: BoundingBox,
): BoundingBox {
  const ancestors: ElementNode[] = [];
  let currentPath = parentPath;

  while (currentPath !== 'root') {
    const loc = findElementById(root, currentPath);
    if (!loc) break;
    ancestors.unshift(loc.element);
    currentPath = loc.parentPath;
  }

  return ancestors.reduce((currentBounds, ancestor) => transformBoundsByElement(currentBounds, ancestor), bounds);
}

function transformBoundsByElement(bounds: BoundingBox, element: ElementNode): BoundingBox {
  const el = element as Record<string, any>;
  if (
    !Array.isArray(el.translate) &&
    el.scale === undefined &&
    !el.rotation
  ) {
    return bounds;
  }

  const corners: [number, number][] = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ].map(([x, y]) => transformPointByElement(x, y, el));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of corners) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function transformPointByElement(x: number, y: number, el: Record<string, any>): [number, number] {
  let nextX = x;
  let nextY = y;

  const scale = el.scale;
  if (scale !== undefined && scale !== 1) {
    const sx = Array.isArray(scale) ? scale[0] : scale;
    const sy = Array.isArray(scale) ? scale[1] : scale;
    if (typeof sx === 'number' && typeof sy === 'number') {
      nextX *= sx;
      nextY *= sy;
    }
  }

  const rotation = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rotation) {
    const [ox, oy] = Array.isArray(el.rotationOrigin) ? el.rotationOrigin : [0, 0];
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = nextX - ox;
    const dy = nextY - oy;
    nextX = ox + dx * cos - dy * sin;
    nextY = oy + dx * sin + dy * cos;
  }

  if (Array.isArray(el.translate)) {
    nextX += el.translate[0];
    nextY += el.translate[1];
  }

  return [nextX, nextY];
}

/**
 * Build --elucim-* CSS custom properties from a core theme preset so that
 * $token references in element color props resolve correctly.
 */
function contentThemeVars(t: typeof DARK_THEME): React.CSSProperties {
  return themeToVars(t) as React.CSSProperties;
}

/** Determine whether a resolved background color is dark. */
function isDarkBackground(bg: string): boolean {
  // Extract hex color from var() fallback or raw hex
  const match = bg.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (!match) return true; // assume dark by default
  const hex = match[1];
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
  // Relative luminance approximation
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

/**
 * Full-bleed editor canvas with viewport pan/zoom, dot grid, minimap, and zoom controls.
 */
export function ElucimCanvas({ className, style, previewDocument, stateMachinePreviewActive, onStateMachinePreviewClick, onStateMachinePreviewKeyDown, onStateMachinePreviewExit, editorColorScheme, contentTheme }: ElucimCanvasProps) {
  const { state, dispatch } = useEditorState();
  const { document: editorDocument, selectedIds, currentFrame, viewport, isPanning } = state;
  const document = previewDocument ?? editorDocument;
  const root = document.root;
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneSvgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });
  const [inlineEdit, setInlineEdit] = useState<{
    id: string;
    field: 'content' | 'expression';
    value: string;
    bounds: BoundingBox;
  } | null>(null);
  const inlineEditRef = useRef<HTMLTextAreaElement>(null);
  const [isCanvasHovered, setIsCanvasHovered] = useState(false);

  // Resolve scene dimensions
  const width = ('width' in root ? root.width : undefined) ?? 1920;
  const height = ('height' in root ? root.height : undefined) ?? 1080;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const rawBackground = ('background' in root ? root.background : undefined) as string | undefined;
  const background = resolveColor(rawBackground) ?? '#0f172a';

  // Set --elucim-* content theme CSS vars so $token references in elements resolve correctly.
  // When editorColorScheme is explicitly light/dark, use it directly — this avoids
  // luminance detection failures with var() or $token backgrounds.
  const sceneThemeVars = useMemo(() => {
    const resolvedScheme = editorColorScheme === 'light' || editorColorScheme === 'dark'
      ? editorColorScheme
      : isDarkBackground(background) ? 'dark' : 'light';
    if (contentTheme) {
      return themeToVars(normalizeTheme(contentTheme, resolvedScheme)) as React.CSSProperties;
    }
    // No explicit scheme — fall back to luminance detection from background hex
    return contentThemeVars(resolvedScheme === 'dark' ? DARK_THEME : LIGHT_THEME);
  }, [background, editorColorScheme, contentTheme]);

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
    selectedIds,
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
    document: state.document,
    zoom: state.viewport.zoom,
    isPlaying: state.isPlaying,
    isCanvasHovered,
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
      const bounds = resolveSelectionBounds(root, measuredBounds, sceneSvgRef.current, id);
      return bounds ? { id, bounds } : null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const beginInlineEdit = useCallback((id: string) => {
    const loc = findElementById(root, id);
    if (!loc) return false;
    const element = loc.element as Record<string, any>;
    const field: 'content' | 'expression' | null =
      element.type === 'text' && typeof element.content === 'string' ? 'content'
      : element.type === 'latex' && typeof element.expression === 'string' ? 'expression'
      : null;
    if (!field) return false;

    const bounds = resolveSelectionBounds(root, measuredBounds, sceneSvgRef.current, id);
    if (!bounds) return false;
    setInlineEdit({ id, field, value: element[field] ?? '', bounds });
    dispatch({ type: 'SELECT', ids: [id] });
    return true;
  }, [dispatch, measuredBounds, root]);

  const commitInlineEdit = useCallback(() => {
    if (!inlineEdit) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: inlineEdit.id, changes: { [inlineEdit.field]: inlineEdit.value } as any });
    setInlineEdit(null);
  }, [dispatch, inlineEdit]);

  const cancelInlineEdit = useCallback(() => {
    setInlineEdit(null);
  }, []);

  useEffect(() => {
    if (!inlineEdit) return;
    inlineEditRef.current?.focus();
    inlineEditRef.current?.select();
  }, [inlineEdit?.id]);

  useEffect(() => {
    if (inlineEdit || selectedIds.length !== 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' && beginInlineEdit(selectedIds[0])) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [beginInlineEdit, inlineEdit, selectedIds]);

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
    const realIds = ids.filter(id => id !== CANVAS_ID);
    const idsToGroup = groupableIds(root, ids);
    const hasSelection = realIds.length > 0;
    const singleEl = hasSelection ? children.find((c, i) => elementIds[i] === ids[0]) : undefined;
    const isGroup = singleEl?.type === 'group';

    const items: ContextMenuItem[] = [
      {
        label: 'Group',
        shortcut: 'Ctrl+G',
        disabled: idsToGroup.length < 2,
        onClick: () => dispatch({ type: 'GROUP_ELEMENTS', ids: idsToGroup }),
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
        shortcut: 'Ctrl+D',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'DUPLICATE_ELEMENTS', ids }),
        separator: false,
      },
      {
        label: 'Copy',
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        onClick: () => { /* handled by keyboard */ },
        separator: false,
      },
      {
        label: 'Paste',
        shortcut: 'Ctrl+V',
        disabled: false,
        onClick: () => { /* handled by keyboard */ },
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
        label: 'Bring Forward',
        shortcut: 'Ctrl+]',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'BRING_FORWARD', ids }),
        separator: false,
      },
      {
        label: 'Send Backward',
        shortcut: 'Ctrl+[',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'SEND_BACKWARD', ids }),
        separator: false,
      },
      {
        label: 'Bring to Front',
        shortcut: 'Ctrl+Shift+]',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'BRING_TO_FRONT', ids }),
        separator: false,
      },
      {
        label: 'Send to Back',
        shortcut: 'Ctrl+Shift+[',
        disabled: !hasSelection,
        onClick: () => dispatch({ type: 'SEND_TO_BACK', ids }),
        separator: false,
      },
      { label: '', onClick: () => {}, separator: true },
      ...(ids.length >= 2 ? [
        {
          label: 'Align Left',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'left' as const }),
          separator: false,
        },
        {
          label: 'Align Right',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'right' as const }),
          separator: false,
        },
        {
          label: 'Align Top',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'top' as const }),
          separator: false,
        },
        {
          label: 'Align Bottom',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'bottom' as const }),
          separator: false,
        },
        {
          label: 'Align Center ↔',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'center-h' as const }),
          separator: false,
        },
        {
          label: 'Align Center ↕',
          disabled: false,
          onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'center-v' as const }),
          separator: false,
        },
        { label: '', onClick: () => {}, separator: true },
      ] : []),
      ...(ids.length >= 3 ? [
        {
          label: 'Distribute Horizontal',
          disabled: false,
          onClick: () => dispatch({ type: 'DISTRIBUTE_ELEMENTS', ids, direction: 'horizontal' as const }),
          separator: false,
        },
        {
          label: 'Distribute Vertical',
          disabled: false,
          onClick: () => dispatch({ type: 'DISTRIBUTE_ELEMENTS', ids, direction: 'vertical' as const }),
          separator: false,
        },
        { label: '', onClick: () => {}, separator: true },
      ] : []),
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

  const handleOverlayDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const editorId = target.getAttribute?.('data-editor-id') ??
      (target as Element).closest?.('[data-editor-id]')?.getAttribute('data-editor-id');
    if (editorId && beginInlineEdit(editorId)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [beginInlineEdit]);

  const handleContainerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (stateMachinePreviewActive && !shouldPreservePointerFocus(e.target) && onStateMachinePreviewClick?.()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!shouldPreservePointerFocus(e.target)) {
      e.currentTarget.focus({ preventScroll: true });
    }
    handlePanStart(e);
    handleMarqueeStart(e);
  }, [handleMarqueeStart, handlePanStart, onStateMachinePreviewClick, stateMachinePreviewActive]);

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!stateMachinePreviewActive || shouldPreservePointerFocus(e.target)) return;
    if (onStateMachinePreviewKeyDown?.(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [onStateMachinePreviewKeyDown, stateMachinePreviewActive]);

  useEffect(() => {
    if (stateMachinePreviewActive) containerRef.current?.focus({ preventScroll: true });
  }, [stateMachinePreviewActive]);

  const previewPillLeft = Math.min(Math.max(viewport.x, 12), Math.max(12, containerSize.width - 180));
  const previewPillTop = Math.min(Math.max(12, viewport.y - 56), Math.max(12, containerSize.height - 40));

  return (
    <div
      ref={containerRef}
      className={`elucim-editor-canvas ${className ?? ''}`}
      tabIndex={-1}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        outline: 'none',
        cursor,
        ...style,
      }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={(e) => { handlePanMove(e); handleMarqueeMove(e); }}
      onPointerUp={(e) => { handlePanEnd(e); handleMarqueeEnd(e); }}
      onPointerEnter={() => setIsCanvasHovered(true)}
      onPointerLeave={() => setIsCanvasHovered(false)}
      onKeyDown={handleContainerKeyDown}
      onContextMenu={handleContextMenu}
    >
      {/* Dot grid background */}
      <DotGrid spacing={20} />

      {stateMachinePreviewActive && (
        <div
          aria-label="State machine preview mode canvas"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: previewPillLeft,
            top: previewPillTop,
            zIndex: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 6px 5px 10px',
            border: `1px solid ${v('--elucim-editor-accent')}`,
            borderRadius: 999,
            background: `color-mix(in srgb, ${v('--elucim-editor-accent')} 18%, ${v('--elucim-editor-surface')})`,
            color: v('--elucim-editor-fg'),
            boxShadow: `0 2px 10px color-mix(in srgb, ${v('--elucim-editor-bg')} 55%, transparent)`,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          <span>Preview mode</span>
          <button
            type="button"
            aria-label="Exit state machine preview mode"
            onPointerDown={event => event.stopPropagation()}
            onClick={onStateMachinePreviewExit}
            style={{
              border: `1px solid ${v('--elucim-editor-border-subtle')}`,
              borderRadius: 999,
              background: v('--elucim-editor-input-bg'),
              color: v('--elucim-editor-fg'),
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 7px',
            }}
          >
            Exit
          </button>
        </div>
      )}

      {/* Scene + overlay: transformed by viewport */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: 'transform',
          border: stateMachinePreviewActive ? `3px solid ${v('--elucim-editor-accent')}` : `1px solid ${v('--elucim-editor-border')}`,
          boxShadow: stateMachinePreviewActive
            ? `0 0 0 4px color-mix(in srgb, ${v('--elucim-editor-accent')} 22%, transparent), 0 2px 16px rgba(0,0,0,0.35)`
            : '0 2px 16px rgba(0,0,0,0.35)',
          borderRadius: 2,
          boxSizing: 'border-box',
          ...sceneThemeVars,
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
          onDoubleClick={handleOverlayDoubleClick}
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
        {inlineEdit && (
          <textarea
            ref={inlineEditRef}
            aria-label={inlineEdit.field === 'content' ? 'Edit text on canvas' : 'Edit LaTeX on canvas'}
            value={inlineEdit.value}
            onChange={e => setInlineEdit(current => current ? { ...current, value: e.target.value } : current)}
            onBlur={commitInlineEdit}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelInlineEdit();
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitInlineEdit();
              }
            }}
            style={{
              position: 'absolute',
              left: inlineEdit.bounds.x,
              top: inlineEdit.bounds.y,
              width: Math.max(inlineEdit.bounds.width, 120),
              minHeight: Math.max(inlineEdit.bounds.height, 28),
              resize: 'none',
              boxSizing: 'border-box',
              padding: '4px 6px',
              border: `1px solid ${v('--elucim-editor-accent')}`,
              borderRadius: 4,
              outline: 'none',
              background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 92%, transparent)`,
              color: v('--elucim-editor-fg'),
              font: inlineEdit.field === 'expression' ? '14px monospace' : '14px sans-serif',
              boxShadow: v('--elucim-editor-shadow-dropdown'),
              zIndex: 5,
            }}
          />
        )}
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
