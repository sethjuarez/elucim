import type React from 'react';
import { TRACK_HEIGHT } from './constants';

export function AnimationBar({
  left,
  width,
  color,
  title,
  onEdgeDrag,
  onClick,
  edgeSide = 'right',
}: {
  left: number;
  width: number;
  color: string;
  title: string;
  onEdgeDrag: (e: React.PointerEvent) => void;
  onClick: () => void;
  edgeSide?: 'left' | 'right';
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: 4,
        width: `${width}%`,
        height: TRACK_HEIGHT - 8,
        background: `color-mix(in srgb, ${color} 40%, transparent)`,
        borderRadius: 2,
        cursor: 'pointer',
      }}
    >
      <div
        onPointerDown={onEdgeDrag}
        style={{
          position: 'absolute',
          ...(edgeSide === 'left' ? { left: -2 } : { right: -2 }),
          top: 0,
          width: 5,
          height: '100%',
          cursor: 'ew-resize',
          background: `color-mix(in srgb, ${color} 80%, transparent)`,
          borderRadius: edgeSide === 'left' ? '2px 0 0 2px' : '0 2px 2px 0',
        }}
      />
    </div>
  );
}
