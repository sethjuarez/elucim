/**
 * Standardized icon set for the Elucim editor.
 *
 * Uses Lucide icons where available, with small custom SVGs for
 * domain-specific icons (LaTeX, matrix, vector, axes, function plot, etc.).
 *
 * All icons use `currentColor` — size and color inherited from parent.
 *
 * **Overridable**: Wrap your editor in `<EditorIconProvider icons={...}>` to
 * replace any icon. Partial overrides merge with defaults.
 *
 * Three size tiers:
 *   16  — toolbar element palette
 *   14  — timeline & zoom controls
 *   12  — panel chrome (pin, collapse, drag)
 */
import React, { createContext, useContext } from 'react';
import {
  Square, Circle, Image, Minus, MoveRight,
  Type, Sigma,
  BarChart3, Network,
  Undo2, Redo2,
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward,
  ZoomIn, ZoomOut, Maximize,
  Pin, PinOff, ChevronDown, ChevronRight, GripVertical,
  Save, FolderOpen, Copy, Spline, Pentagon,
  Group, Ungroup, Layers,
} from 'lucide-react';

// ─── Size constants ─────────────────────────────────────────────────────────
const TB = 16;  // toolbar
const TL = 14;  // timeline / zoom
const PC = 12;  // panel chrome

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface PinIconProps extends IconProps {
  pinned?: boolean;
}

/** A function that renders an icon given optional props. */
export type IconComponent = (props?: IconProps) => React.ReactNode;
export type PinIconComponent = (props?: PinIconProps) => React.ReactNode;

/** All overridable icons in the editor. */
export interface EditorIcons {
  // Toolbar — element palette
  Rect: IconComponent;
  Circle: IconComponent;
  Image: IconComponent;
  Line: IconComponent;
  Arrow: IconComponent;
  Text: IconComponent;
  Latex: IconComponent;
  Axes: IconComponent;
  Function: IconComponent;
  Vector: IconComponent;
  Matrix: IconComponent;
  BarChart: IconComponent;
  Graph: IconComponent;
  Bezier: IconComponent;
  Polygon: IconComponent;
  VectorField: IconComponent;
  // History
  Undo: IconComponent;
  Redo: IconComponent;
  // Grouping & structure
  Group: IconComponent;
  Ungroup: IconComponent;
  Sequence: IconComponent;
  // Timeline / playback
  Play: IconComponent;
  Pause: IconComponent;
  StepForward: IconComponent;
  StepBackward: IconComponent;
  SkipStart: IconComponent;
  SkipEnd: IconComponent;
  // Zoom
  ZoomIn: IconComponent;
  ZoomOut: IconComponent;
  FitToView: IconComponent;
  // Panel chrome
  Pin: PinIconComponent;
  ChevronDown: IconComponent;
  ChevronRight: IconComponent;
  DragHandle: IconComponent;
  // File operations
  Save: IconComponent;
  Open: IconComponent;
  Copy: IconComponent;
}

// ─── Custom SVG helper ─────────────────────────────────────────────────────

const customSvg = (defaultSize: number, children: React.ReactNode, props?: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props?.size ?? defaultSize}
    height={props?.size ?? defaultSize}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props?.className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...props?.style }}
  >
    {children}
  </svg>
);

// ─── Default icon implementations ──────────────────────────────────────────

export const DEFAULT_ICONS: EditorIcons = {
  // Toolbar — element palette (16px)
  Rect:    (p) => <Square size={p?.size ?? TB} />,
  Circle:  (p) => <Circle size={p?.size ?? TB} />,
  Image:   (p) => <Image size={p?.size ?? TB} />,
  Line:    (p) => <Minus size={p?.size ?? TB} />,
  Arrow:   (p) => <MoveRight size={p?.size ?? TB} />,
  Text:    (p) => <Type size={p?.size ?? TB} />,
  Latex:   (p) => <Sigma size={p?.size ?? TB} />,
  BarChart:(p) => <BarChart3 size={p?.size ?? TB} />,
  Graph:   (p) => <Network size={p?.size ?? TB} />,
  Bezier:  (p) => <Spline size={p?.size ?? TB} />,
  Polygon: (p) => <Pentagon size={p?.size ?? TB} />,

  // Custom domain-specific icons (no good Lucide match)
  Axes: (p) => customSvg(p?.size ?? TB, <>
    <line x1="3" y1="21" x2="3" y2="3" />
    <polyline points="3,3 5,5" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <polyline points="21,21 19,19" />
    <line x1="3" y1="14" x2="8" y2="14" strokeWidth={1} strokeDasharray="2 2" />
    <line x1="3" y1="7" x2="13" y2="7" strokeWidth={1} strokeDasharray="2 2" />
    <line x1="10" y1="21" x2="10" y2="14" strokeWidth={1} strokeDasharray="2 2" />
  </>, p),

  Function: (p) => customSvg(p?.size ?? TB, <>
    <path d="M3 17c3-12 6 0 9-6s6 0 9-6" strokeWidth={2} fill="none" />
  </>, p),

  Vector: (p) => customSvg(p?.size ?? TB, <>
    <line x1="4" y1="20" x2="18" y2="6" />
    <polyline points="12,5 18,6 17,12" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
  </>, p),

  Matrix: (p) => customSvg(p?.size ?? TB, <>
    <path d="M6 3H4v18h2M18 3h2v18h-2" />
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
  </>, p),

  VectorField: (p) => customSvg(p?.size ?? TB, <>
    <line x1="4" y1="8" x2="10" y2="5" strokeWidth={1.5} />
    <polyline points="8,4 10,5 9,7" strokeWidth={1.5} />
    <line x1="14" y1="8" x2="20" y2="5" strokeWidth={1.5} />
    <polyline points="18,4 20,5 19,7" strokeWidth={1.5} />
    <line x1="4" y1="18" x2="10" y2="15" strokeWidth={1.5} />
    <polyline points="8,14 10,15 9,17" strokeWidth={1.5} />
    <line x1="14" y1="18" x2="20" y2="15" strokeWidth={1.5} />
    <polyline points="18,14 20,15 19,17" strokeWidth={1.5} />
  </>, p),

  // History (16px)
  Undo: (p) => <Undo2 size={p?.size ?? TB} />,
  Redo: (p) => <Redo2 size={p?.size ?? TB} />,

  // Grouping & structure (16px)
  Group:    (p) => <Group size={p?.size ?? TB} />,
  Ungroup:  (p) => <Ungroup size={p?.size ?? TB} />,
  Sequence: (p) => <Layers size={p?.size ?? TB} />,

  // Timeline / playback (14px)
  Play:         (p) => <Play size={p?.size ?? TL} fill="currentColor" />,
  Pause:        (p) => <Pause size={p?.size ?? TL} fill="currentColor" />,
  StepForward:  (p) => <StepForward size={p?.size ?? TL} fill="currentColor" />,
  StepBackward: (p) => <StepBack size={p?.size ?? TL} fill="currentColor" />,
  SkipStart:    (p) => <SkipBack size={p?.size ?? TL} fill="currentColor" />,
  SkipEnd:      (p) => <SkipForward size={p?.size ?? TL} fill="currentColor" />,

  // Zoom (14px)
  ZoomIn:    (p) => <ZoomIn size={p?.size ?? TL} />,
  ZoomOut:   (p) => <ZoomOut size={p?.size ?? TL} />,
  FitToView: (p) => <Maximize size={p?.size ?? TL} />,

  // Panel chrome (12px)
  Pin: (p?: PinIconProps) => p?.pinned
    ? <Pin size={p?.size ?? PC} fill="currentColor" />
    : <PinOff size={p?.size ?? PC} />,
  ChevronDown:  (p) => <ChevronDown size={p?.size ?? PC} />,
  ChevronRight: (p) => <ChevronRight size={p?.size ?? PC} />,
  DragHandle:   (p) => <GripVertical size={p?.size ?? PC} />,

  // File operations (16px)
  Save: (p) => <Save size={p?.size ?? TB} />,
  Open: (p) => <FolderOpen size={p?.size ?? TB} />,
  Copy: (p) => <Copy size={p?.size ?? TB} />,
};

// ─── Context ───────────────────────────────────────────────────────────────

const EditorIconContext = createContext<EditorIcons>(DEFAULT_ICONS);

/**
 * Override any editor icon. Partial overrides merge with defaults.
 *
 * @example
 * ```tsx
 * import { EditorIconProvider } from '@elucim/editor';
 * import { Pencil } from 'lucide-react';
 *
 * <EditorIconProvider icons={{ Text: (p) => <Pencil size={p?.size ?? 16} /> }}>
 *   <ElucimEditor />
 * </EditorIconProvider>
 * ```
 */
export function EditorIconProvider({
  icons,
  children,
}: {
  icons: Partial<EditorIcons>;
  children: React.ReactNode;
}) {
  const parent = useContext(EditorIconContext);
  const merged = { ...parent, ...icons };
  return (
    <EditorIconContext.Provider value={merged}>
      {children}
    </EditorIconContext.Provider>
  );
}

/** Access the current icon set (respects overrides from EditorIconProvider). */
export function useEditorIcons(): EditorIcons {
  return useContext(EditorIconContext);
}

// ─── Convenience re-exports ────────────────────────────────────────────────
// Direct references to DEFAULT_ICONS for use outside React render functions
// (e.g., in templates.tsx which runs at module scope).
// Inside React components, prefer useEditorIcons() for override support.

export const IconRect = DEFAULT_ICONS.Rect;
export const IconCircle = DEFAULT_ICONS.Circle;
export const IconImage = DEFAULT_ICONS.Image;
export const IconLine = DEFAULT_ICONS.Line;
export const IconArrow = DEFAULT_ICONS.Arrow;
export const IconText = DEFAULT_ICONS.Text;
export const IconLatex = DEFAULT_ICONS.Latex;
export const IconAxes = DEFAULT_ICONS.Axes;
export const IconFunction = DEFAULT_ICONS.Function;
export const IconVector = DEFAULT_ICONS.Vector;
export const IconMatrix = DEFAULT_ICONS.Matrix;
export const IconBarChart = DEFAULT_ICONS.BarChart;
export const IconGraph = DEFAULT_ICONS.Graph;
export const IconBezier = DEFAULT_ICONS.Bezier;
export const IconPolygon = DEFAULT_ICONS.Polygon;
export const IconVectorField = DEFAULT_ICONS.VectorField;
export const IconUndo = DEFAULT_ICONS.Undo;
export const IconRedo = DEFAULT_ICONS.Redo;
export const IconGroup = DEFAULT_ICONS.Group;
export const IconUngroup = DEFAULT_ICONS.Ungroup;
export const IconSequence = DEFAULT_ICONS.Sequence;
export const IconPlay = DEFAULT_ICONS.Play;
export const IconPause = DEFAULT_ICONS.Pause;
export const IconStepForward = DEFAULT_ICONS.StepForward;
export const IconStepBackward = DEFAULT_ICONS.StepBackward;
export const IconSkipStart = DEFAULT_ICONS.SkipStart;
export const IconSkipEnd = DEFAULT_ICONS.SkipEnd;
export const IconZoomIn = DEFAULT_ICONS.ZoomIn;
export const IconZoomOut = DEFAULT_ICONS.ZoomOut;
export const IconFitToView = DEFAULT_ICONS.FitToView;
export const IconPin = DEFAULT_ICONS.Pin;
export const IconChevronDown = DEFAULT_ICONS.ChevronDown;
export const IconChevronRight = DEFAULT_ICONS.ChevronRight;
export const IconDragHandle = DEFAULT_ICONS.DragHandle;
export const IconSave = DEFAULT_ICONS.Save;
export const IconOpen = DEFAULT_ICONS.Open;
export const IconCopy = DEFAULT_ICONS.Copy;
