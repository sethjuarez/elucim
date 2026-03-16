import React from 'react';
import { v } from '../theme/tokens';

interface DotGridProps {
  /** Spacing between dots in scene pixels */
  spacing?: number;
  /** Dot radius */
  dotRadius?: number;
  /** Dot color — defaults to the editor border token */
  color?: string;
}

/**
 * SVG-based dot grid that tiles behind the scene.
 * Rendered as a full-viewport background pattern.
 */
export function DotGrid({ spacing = 20, dotRadius = 1, color }: DotGridProps) {
  const dotColor = color ?? v('--elucim-editor-border');
  const patternId = 'elucim-dot-grid';
  return (
    <svg
      className="elucim-editor-dot-grid"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern
          id={patternId}
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={spacing / 2} cy={spacing / 2} r={dotRadius} fill={dotColor} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
