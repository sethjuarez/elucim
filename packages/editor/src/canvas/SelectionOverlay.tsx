import React from 'react';
import type { BoundingBox } from '../utils/bounds';
import { v, ROTATE_CURSOR } from '../theme/tokens';

interface SelectionEntry {
  id: string;
  bounds: BoundingBox;
}

export interface SelectionOverlayProps {
  selections: SelectionEntry[];
}

const HANDLE_SIZE = 8;
const ROTATION_ARM = 24;

/**
 * Renders selection rectangles with corner handles around selected elements.
 * Applies the same rotation transform as the element so the box rotates with it.
 */
export function SelectionOverlay({ selections }: SelectionOverlayProps) {
  if (selections.length === 0) return null;

  return (
    <g className="elucim-editor-selection">
      {selections.map(({ id, bounds }) => {
        const { rotation, rotationCenter } = bounds;
        const transform = rotation && rotationCenter
          ? `rotate(${rotation}, ${rotationCenter[0]}, ${rotationCenter[1]})`
          : undefined;

        return (
          <g key={`sel-${id}`} data-selection-id={id} transform={transform}>
            {/* Selection rectangle */}
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              fill="none"
              stroke={v('--elucim-editor-accent')}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />

            {/* Corner handles */}
            {getCornerHandles(bounds).map((handle) => (
              <rect
                key={handle.position}
                data-handle={handle.position}
                data-editor-id={id}
                x={handle.x - HANDLE_SIZE / 2}
                y={handle.y - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                fill="#fff"
                stroke={v('--elucim-editor-accent')}
                strokeWidth={1.5}
                rx={1}
                style={{ pointerEvents: 'all', cursor: handle.cursor }}
              />
            ))}

            {/* Rotation handle — above top center */}
            <line
              x1={bounds.x + bounds.width / 2}
              y1={bounds.y}
              x2={bounds.x + bounds.width / 2}
              y2={bounds.y - ROTATION_ARM}
              stroke={v('--elucim-editor-accent')}
              strokeWidth={1}
              style={{ pointerEvents: 'none' }}
            />
            <circle
              data-handle="rotate"
              data-editor-id={id}
              cx={bounds.x + bounds.width / 2}
              cy={bounds.y - ROTATION_ARM}
              r={HANDLE_SIZE / 2}
              fill="#fff"
              stroke={v('--elucim-editor-accent')}
              strokeWidth={1.5}
              style={{ pointerEvents: 'all', cursor: ROTATE_CURSOR }}
            />
          </g>
        );
      })}
    </g>
  );
}

interface HandleInfo {
  position: string;
  x: number;
  y: number;
  cursor: string;
}

function getCornerHandles(bounds: BoundingBox): HandleInfo[] {
  const { x, y, width, height } = bounds;
  return [
    { position: 'nw', x, y, cursor: 'nw-resize' },
    { position: 'ne', x: x + width, y, cursor: 'ne-resize' },
    { position: 'sw', x, y: y + height, cursor: 'sw-resize' },
    { position: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
    // Edge midpoints
    { position: 'n', x: x + width / 2, y, cursor: 'n-resize' },
    { position: 's', x: x + width / 2, y: y + height, cursor: 's-resize' },
    { position: 'w', x, y: y + height / 2, cursor: 'w-resize' },
    { position: 'e', x: x + width, y: y + height / 2, cursor: 'e-resize' },
  ];
}
