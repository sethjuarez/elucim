/**
 * Standardized monochrome SVG icon set for the Elucim editor.
 *
 * All icons use `currentColor` — size and color are inherited from
 * the parent element's `font-size` and `color`.
 *
 * Three size tiers:
 *   16×16  — toolbar element palette
 *   14×14  — timeline & zoom controls
 *   12×12  — panel chrome (pin, collapse, drag)
 */
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const svg = (size: number, children: React.ReactNode, props?: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props?.size ?? size}
    height={props?.size ?? size}
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

// ─── Toolbar element palette (default 16px) ────────────────────────────────

/** Rectangle — rounded rect outline */
export const IconRect = (p?: IconProps) => svg(16, <>
  <rect x="3" y="5" width="18" height="14" rx="2" />
</>, p);

/** Circle — ellipse outline */
export const IconCircle = (p?: IconProps) => svg(16, <>
  <circle cx="12" cy="12" r="9" />
</>, p);

/** Image — landscape frame with mountain */
export const IconImage = (p?: IconProps) => svg(16, <>
  <rect x="3" y="5" width="18" height="14" rx="2" />
  <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
  <path d="M21 15l-5-5L5 19" strokeWidth={1.5} />
</>, p);

/** Line — diagonal stroke */
export const IconLine = (p?: IconProps) => svg(16, <>
  <line x1="5" y1="19" x2="19" y2="5" />
</>, p);

/** Arrow — line with arrowhead */
export const IconArrow = (p?: IconProps) => svg(16, <>
  <line x1="5" y1="12" x2="19" y2="12" />
  <polyline points="15,8 19,12 15,16" />
</>, p);

/** Text — capital T */
export const IconText = (p?: IconProps) => svg(16, <>
  <line x1="6" y1="4" x2="18" y2="4" />
  <line x1="12" y1="4" x2="12" y2="20" />
  <line x1="9" y1="20" x2="15" y2="20" />
</>, p);

/** LaTeX — sigma/summation */
export const IconLatex = (p?: IconProps) => svg(16, <>
  <path d="M5 4h14M5 4l7 8-7 8h14" />
</>, p);

/** Axes — coordinate grid */
export const IconAxes = (p?: IconProps) => svg(16, <>
  <line x1="3" y1="21" x2="3" y2="3" />
  <line x1="3" y1="21" x2="21" y2="21" />
  <line x1="3" y1="14" x2="8" y2="14" strokeWidth={1} strokeDasharray="2 2" />
  <line x1="3" y1="7" x2="13" y2="7" strokeWidth={1} strokeDasharray="2 2" />
  <line x1="10" y1="21" x2="10" y2="14" strokeWidth={1} strokeDasharray="2 2" />
</>, p);

/** Function plot — sine-ish curve */
export const IconFunction = (p?: IconProps) => svg(16, <>
  <path d="M3 17c3-12 6 0 9-6s6 0 9-6" strokeWidth={2} fill="none" />
</>, p);

/** Vector — arrow from origin */
export const IconVector = (p?: IconProps) => svg(16, <>
  <line x1="4" y1="20" x2="18" y2="6" />
  <polyline points="12,5 18,6 17,12" />
  <circle cx="4" cy="20" r="1.5" fill="currentColor" stroke="none" />
</>, p);

/** Matrix — bracket grid */
export const IconMatrix = (p?: IconProps) => svg(16, <>
  <path d="M6 3H4v18h2M18 3h2v18h-2" />
  <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
  <circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" />
  <circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" />
  <circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" />
</>, p);

/** Bar chart — three bars */
export const IconBarChart = (p?: IconProps) => svg(16, <>
  <rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" stroke="none" />
  <rect x="10" y="6" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
  <rect x="16" y="9" width="4" height="11" rx="1" fill="currentColor" stroke="none" />
  <line x1="2" y1="21" x2="22" y2="21" strokeWidth={1.5} />
</>, p);

/** Graph / network — connected nodes */
export const IconGraph = (p?: IconProps) => svg(16, <>
  <line x1="5" y1="7" x2="19" y2="7" strokeWidth={1.5} />
  <line x1="19" y1="7" x2="12" y2="19" strokeWidth={1.5} />
  <line x1="12" y1="19" x2="5" y2="7" strokeWidth={1.5} />
  <circle cx="5" cy="7" r="2.5" fill="currentColor" />
  <circle cx="19" cy="7" r="2.5" fill="currentColor" />
  <circle cx="12" cy="19" r="2.5" fill="currentColor" />
</>, p);

// ─── History ────────────────────────────────────────────────────────────────

/** Undo — counterclockwise arrow */
export const IconUndo = (p?: IconProps) => svg(16, <>
  <path d="M3 10a9 9 0 1 1 3 6.7" />
  <polyline points="3 4 3 10 9 10" />
</>, p);

/** Redo — clockwise arrow */
export const IconRedo = (p?: IconProps) => svg(16, <>
  <path d="M21 10a9 9 0 1 0-3 6.7" />
  <polyline points="21 4 21 10 15 10" />
</>, p);

// ─── Timeline / playback (default 14px) ─────────────────────────────────────

/** Play — right-pointing triangle */
export const IconPlay = (p?: IconProps) => svg(14, <>
  <polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none" />
</>, p);

/** Pause — two bars */
export const IconPause = (p?: IconProps) => svg(14, <>
  <rect x="5" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  <rect x="15" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
</>, p);

/** Step forward — bar + triangle */
export const IconStepForward = (p?: IconProps) => svg(14, <>
  <polygon points="4,4 14,12 4,20" fill="currentColor" stroke="none" />
  <rect x="17" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
</>, p);

/** Step backward — triangle + bar */
export const IconStepBackward = (p?: IconProps) => svg(14, <>
  <polygon points="20,4 10,12 20,20" fill="currentColor" stroke="none" />
  <rect x="4" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
</>, p);

/** Skip to start — double triangle + bar */
export const IconSkipStart = (p?: IconProps) => svg(14, <>
  <polygon points="18,4 10,12 18,20" fill="currentColor" stroke="none" />
  <rect x="4" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
</>, p);

/** Skip to end — bar + double triangle */
export const IconSkipEnd = (p?: IconProps) => svg(14, <>
  <polygon points="6,4 14,12 6,20" fill="currentColor" stroke="none" />
  <rect x="17" y="4" width="3" height="16" rx="0.5" fill="currentColor" stroke="none" />
</>, p);

// ─── Zoom controls (default 14px) ──────────────────────────────────────────

/** Zoom in — magnifier + */
export const IconZoomIn = (p?: IconProps) => svg(14, <>
  <circle cx="10" cy="10" r="7" />
  <line x1="10" y1="7" x2="10" y2="13" />
  <line x1="7" y1="10" x2="13" y2="10" />
  <line x1="15.5" y1="15.5" x2="21" y2="21" strokeWidth={2.5} />
</>, p);

/** Zoom out — magnifier − */
export const IconZoomOut = (p?: IconProps) => svg(14, <>
  <circle cx="10" cy="10" r="7" />
  <line x1="7" y1="10" x2="13" y2="10" />
  <line x1="15.5" y1="15.5" x2="21" y2="21" strokeWidth={2.5} />
</>, p);

/** Fit to view — expand arrows */
export const IconFitToView = (p?: IconProps) => svg(14, <>
  <polyline points="4,9 4,4 9,4" />
  <polyline points="20,9 20,4 15,4" />
  <polyline points="4,15 4,20 9,20" />
  <polyline points="20,15 20,20 15,20" />
</>, p);

// ─── Panel chrome (default 12px) ───────────────────────────────────────────

/** Pin — thumbtack; rotated 45° when unpinned, straight when pinned */
export const IconPin = ({ pinned, ...p }: IconProps & { pinned?: boolean }) => svg(12, <>
  <g transform={pinned ? '' : 'rotate(-45 12 12)'}>
    <line x1="12" y1="17" x2="12" y2="21" />
    <path d="M7 11V7l2-2h6l2 2v4" />
    <rect x="6" y="11" width="12" height="2" rx="1" fill="currentColor" stroke="none" />
  </g>
</>, p);

/** Chevron down — collapse indicator */
export const IconChevronDown = (p?: IconProps) => svg(12, <>
  <polyline points="6,9 12,15 18,9" />
</>, p);

/** Chevron right — expand indicator */
export const IconChevronRight = (p?: IconProps) => svg(12, <>
  <polyline points="9,6 15,12 9,18" />
</>, p);

/** Drag handle — six dots */
export const IconDragHandle = (p?: IconProps) => svg(12, <>
  <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="6" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="18" r="1.5" fill="currentColor" stroke="none" />
</>, p);
