import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Scene } from '@elucim/core';
import { resolveCameraViewport, SceneCameraViewport, renderElement } from '@elucim/dsl';
import type { CameraNode, RenderableDocument as ElucimDocument, ElementNode } from '@elucim/dsl';
import { resolveColor, DARK_THEME, LIGHT_THEME, normalizeTheme, themeToVars, type ElucimTheme } from '@elucim/core';
import { useEditorState } from '../state/EditorProvider';
import { getElementId } from '../state/types';
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
import { exportEditorDocumentToJson, importFromJson } from '../utils/io';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenu';
import { buildElementContextMenuItems } from './contextMenuItems';
import {
  CameraFramingOverlay,
  constrainCameraFrame,
  focusCameraFrame,
  getSceneCameraViewport,
  type CameraFrameViewport,
} from './CameraFramingOverlay';
import { upsertTimelineCameraKeyframe } from '../timeline/cameraKeyframes';

export interface ElucimCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  /** Optional render-only document, used for timeline/state preview without mutating editor state. */
  previewDocument?: ElucimDocument;
  /** Evaluated camera for a render-only timeline/state preview. */
  previewCamera?: CameraNode;
  /** Optional preview mode chrome and event routing for render-only document previews. */
  previewMode?: {
    active: boolean;
    label: string;
    exitLabel?: string;
    onClick?: () => boolean;
    onKeyDown?: (key: string) => boolean;
    onExit?: () => void;
  };
  /** Editor color scheme — used to pick content theme when background is a $token. */
  editorColorScheme?: string;
  /** Explicit content theme — when provided, used for scene CSS vars instead of built-in presets. */
  contentTheme?: ElucimTheme;
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

function resolveLogicalSelectionBounds(root: ElucimDocument['root'], id: string): BoundingBox | null {
  const loc = findElementById(root, id);
  if (!loc) return null;
  const bounds = getElementBounds(loc.element);
  return bounds ? applyAncestorTransforms(root, loc.parentPath, bounds) : null;
}

function mapBoundsThroughCamera(bounds: BoundingBox, camera: CameraNode, width: number, height: number): BoundingBox {
  const transform = resolveCameraViewport(camera, width, height);
  return {
    x: transform.offsetX + (bounds.x - transform.viewport.x) * transform.scale,
    y: transform.offsetY + (bounds.y - transform.viewport.y) * transform.scale,
    width: bounds.width * transform.scale,
    height: bounds.height * transform.scale,
  };
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
export function ElucimCanvas({ className, style, previewDocument, previewCamera, previewMode, editorColorScheme, contentTheme }: ElucimCanvasProps) {
  const { state, dispatch } = useEditorState();
  const {
    document: editorDocument,
    selectedIds,
    currentFrame,
    viewport,
    isPanning,
    isCameraFraming,
    cameraFramingTimelineId,
    cameraFramingFrame,
  } = state;
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
  const [cameraDraft, setCameraDraft] = useState<CameraFrameViewport | null>(null);
  const [cameraAspectLocked, setCameraAspectLocked] = useState(true);
  const [isDrawingCameraFrame, setIsDrawingCameraFrame] = useState(false);
  const cameraFramingSessionRef = useRef<string>();
  const previewModeActive = Boolean(previewMode?.active);

  // Resolve scene dimensions
  const width = ('width' in root ? root.width : undefined) ?? 1920;
  const height = ('height' in root ? root.height : undefined) ?? 1080;
  const fps = ('fps' in root ? root.fps : undefined) ?? 60;
  const durationInFrames = ('durationInFrames' in root ? root.durationInFrames : undefined) ?? 120;
  const rawBackground = ('background' in root ? root.background : undefined) as string | undefined;
  const background = resolveColor(rawBackground) ?? '#0f172a';
  const camera = previewDocument ? previewCamera : undefined;
  const renderedCamera = isCameraFraming ? undefined : camera;

  useEffect(() => {
    if (!isCameraFraming) {
      cameraFramingSessionRef.current = undefined;
      return;
    }
    const session = `${cameraFramingTimelineId ?? ''}:${cameraFramingFrame ?? currentFrame}`;
    if (cameraFramingSessionRef.current === session) return;
    cameraFramingSessionRef.current = session;
    setCameraDraft(getSceneCameraViewport(camera, width, height));
    setCameraAspectLocked(true);
    setIsDrawingCameraFrame(false);
  }, [camera, cameraFramingFrame, cameraFramingTimelineId, currentFrame, height, isCameraFraming, width]);

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
    camera: renderedCamera,
  });

  // Keyboard shortcuts
  const getDocumentJson = useCallback(() => exportEditorDocumentToJson(state.document, state.canonicalDocument), [state.canonicalDocument, state.document]);
  const handleImport = useCallback((json: string) => {
    const result = importFromJson(json);
    if (result.canonicalDocument) {
      dispatch({ type: 'SET_CANONICAL_DOCUMENT', document: result.canonicalDocument, syncProjection: true });
    } else if (result.document) {
      dispatch({ type: 'IMPORT_RENDERABLE_DOCUMENT', document: result.document });
    }
  }, [dispatch]);

  useKeyboardShortcuts({
    dispatch,
    selectedIds,
    document: state.document,
    zoom: state.viewport.zoom,
    isPlaying: state.isPlaying,
    isCanvasHovered,
    isCameraFraming,
    getDocumentJson,
    importDocument: handleImport,
  });

  // DOM-measured bounds — pixel-perfect for every element type
  const measuredBounds = useMeasuredBounds(sceneSvgRef, elementIds, children);
  const interactionBounds = useMemo(() => {
    if (!renderedCamera) return measuredBounds;
    return new Map(elementIds.flatMap(id => {
      const bounds = resolveLogicalSelectionBounds(root, id);
      return bounds ? [[id, bounds] as const] : [];
    }));
  }, [elementIds, measuredBounds, renderedCamera, root]);

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
    boundsMap: interactionBounds,
    sceneWidth: width,
    sceneHeight: height,
    camera: renderedCamera,
  });

  // Collect selected element bounds for the overlay
  const selectedBounds = selectedIds
    .map(id => {
      const bounds = renderedCamera
        ? resolveLogicalSelectionBounds(root, id)
        : resolveSelectionBounds(root, measuredBounds, sceneSvgRef.current, id);
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

    const logicalBounds = renderedCamera
      ? resolveLogicalSelectionBounds(root, id)
      : resolveSelectionBounds(root, measuredBounds, sceneSvgRef.current, id);
    const bounds = logicalBounds && renderedCamera
      ? mapBoundsThroughCamera(logicalBounds, renderedCamera, width, height)
      : logicalBounds;
    if (!bounds) return false;
    setInlineEdit({ id, field, value: element[field] ?? '', bounds });
    dispatch({ type: 'SELECT', ids: [id] });
    return true;
  }, [dispatch, height, measuredBounds, renderedCamera, root, width]);

  const commitCameraFrame = useCallback((nextViewport: CameraFrameViewport) => {
    const canonicalDocument = state.canonicalDocument;
    const timeline = cameraFramingTimelineId
      ? canonicalDocument?.timelines?.[cameraFramingTimelineId]
      : undefined;
    if (!canonicalDocument || !timeline) return;
    const nextTimeline = upsertTimelineCameraKeyframe(
      timeline,
      camera,
      cameraFramingFrame ?? currentFrame,
      nextViewport,
      width,
      height,
    );
    dispatch({ type: 'UPDATE_TIMELINE_CAMERA', timelineId: timeline.id, camera: nextTimeline.camera! });
  }, [camera, cameraFramingFrame, cameraFramingTimelineId, currentFrame, dispatch, height, state.canonicalDocument, width]);

  const completeCameraFraming = useCallback(() => {
    if (cameraDraft) commitCameraFrame(cameraDraft);
    dispatch({ type: 'SET_CAMERA_FRAMING', framing: false });
  }, [cameraDraft, commitCameraFrame, dispatch]);

  const cancelCameraFraming = useCallback(() => {
    dispatch({ type: 'SET_CAMERA_FRAMING', framing: false });
  }, [dispatch]);

  const focusSelectedCameraFrame = useCallback(() => {
    if (selectedIds.length !== 1 || selectedIds[0] === '__canvas__') return;
    const bounds = resolveLogicalSelectionBounds(root, selectedIds[0]);
    if (bounds) setCameraDraft(focusCameraFrame(bounds, width, height));
  }, [height, root, selectedIds, width]);

  const updateCameraDraftField = useCallback((field: keyof CameraFrameViewport, value: string) => {
    if (value === '') return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    setCameraDraft(current => current
      ? constrainCameraFrame({ ...current, [field]: numericValue }, width, height)
      : current,
    );
  }, [height, width]);

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
      const bounds = interactionBounds.get(id);
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

    const items = buildElementContextMenuItems({
      root,
      children,
      elementIds,
      selectedIds,
      contextElementId: editorId ?? undefined,
      dispatch,
    });

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [selectedIds, root, children, elementIds, dispatch]);

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
    if (shouldPreservePointerFocus(e.target)) return;
    if (isCameraFraming) return;
    e.currentTarget.focus({ preventScroll: true });
    if (previewModeActive && previewMode?.onClick?.()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    handlePanStart(e);
    handleMarqueeStart(e);
  }, [handleMarqueeStart, handlePanStart, isCameraFraming, previewMode, previewModeActive]);

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!previewModeActive || shouldPreservePointerFocus(e.target)) return;
    if (previewMode?.onKeyDown?.(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [previewMode, previewModeActive]);

  useEffect(() => {
    if (previewModeActive) containerRef.current?.focus({ preventScroll: true });
  }, [previewModeActive]);

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

      {previewModeActive && (
        <div
          aria-label={`${previewMode?.label ?? 'Preview mode'} canvas`}
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
          <span>{previewMode?.label ?? 'Preview mode'}</span>
          <button
            type="button"
            aria-label={previewMode?.exitLabel ?? 'Exit preview mode'}
            onPointerDown={event => event.stopPropagation()}
            onClick={previewMode?.onExit}
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
          border: previewModeActive ? `3px solid ${v('--elucim-editor-accent')}` : `1px solid ${v('--elucim-editor-border')}`,
          boxShadow: previewModeActive
            ? `0 0 0 4px color-mix(in srgb, ${v('--elucim-editor-accent')} 22%, transparent), ${v('--elucim-editor-shadow-canvas')}`
            : v('--elucim-editor-shadow-canvas'),
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
          <SceneCameraViewport camera={renderedCamera} width={width} height={height}>
            {children.map((child, i) => (
              <g key={elementIds[i]} data-measure-id={elementIds[i]}>
                {renderElement(child, i)}
              </g>
            ))}
          </SceneCameraViewport>
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
          <SceneCameraViewport camera={renderedCamera} width={width} height={height}>
            {!isCameraFraming && hitTargets.map(({ id, bounds }) => {
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
            {!isCameraFraming && <SelectionOverlay selections={selectedBounds} />}
            {/* Marquee selection rectangle */}
            {!isCameraFraming && marquee && (
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
          </SceneCameraViewport>
          {isCameraFraming && cameraDraft && (
            <CameraFramingOverlay
              viewport={cameraDraft}
              sceneWidth={width}
              sceneHeight={height}
              aspectLocked={cameraAspectLocked}
              drawing={isDrawingCameraFrame}
              onViewportChange={setCameraDraft}
              onViewportCommit={setCameraDraft}
              onDrawingComplete={() => setIsDrawingCameraFrame(false)}
            />
          )}
        </svg>
        {isCameraFraming && cameraDraft && (
          <div
            aria-label="Camera framing controls"
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              border: `1px solid ${v('--elucim-editor-accent')}`,
              borderRadius: 6,
              background: v('--elucim-editor-panel'),
              boxShadow: v('--elucim-editor-shadow-dropdown'),
            }}
          >
            <strong style={{ fontSize: 11, color: v('--elucim-editor-fg') }}>Camera frame</strong>
          {(['x', 'y', 'width', 'height'] as const).map(field => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
              {field === 'width' ? 'W' : field === 'height' ? 'H' : field.toUpperCase()}
              <input
                aria-label={`Camera frame ${field}`}
                type="number"
                min={field === 'width' || field === 'height' ? 1 : 0}
                step={1}
                value={cameraDraft[field]}
                onChange={event => updateCameraDraftField(field, event.currentTarget.value)}
                style={{ width: 54 }}
              />
            </label>
          ))}
          <button type="button" aria-pressed={cameraAspectLocked} onClick={() => setCameraAspectLocked(locked => !locked)}>
              {cameraAspectLocked ? 'Lock aspect' : 'Free aspect'}
            </button>
            <button type="button" aria-pressed={isDrawingCameraFrame} onClick={() => setIsDrawingCameraFrame(drawing => !drawing)}>
              {isDrawingCameraFrame ? 'Cancel draw' : 'Draw frame'}
            </button>
            <button type="button" disabled={selectedIds.length !== 1 || selectedIds[0] === '__canvas__'} onClick={focusSelectedCameraFrame}>
              Focus selection
            </button>
            <button type="button" onClick={() => setCameraDraft({ x: 0, y: 0, width, height })}>Reset</button>
            <button type="button" onClick={completeCameraFraming}>Done</button>
            <button type="button" onClick={cancelCameraFraming}>Cancel</button>
          </div>
        )}
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
