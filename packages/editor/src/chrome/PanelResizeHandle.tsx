import type React from 'react';

export function PanelResizeHandle({
  side,
  label,
  onPointerDown,
}: {
  side: 'left' | 'right' | 'top';
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const horizontal = side === 'top';
  return (
    <div
      role="separator"
      aria-label={label}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        ...(side === 'left' ? { left: -3, top: 0, bottom: 0, width: 6 } : {}),
        ...(side === 'right' ? { right: -3, top: 0, bottom: 0, width: 6 } : {}),
        ...(side === 'top' ? { left: 0, right: 0, top: -3, height: 6 } : {}),
        zIndex: 5,
        cursor: horizontal ? 'ns-resize' : 'ew-resize',
        background: 'transparent',
      }}
    />
  );
}
