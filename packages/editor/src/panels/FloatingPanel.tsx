import React, { useCallback, useRef } from 'react';
import type { PanelPosition } from '../state/types';

export interface FloatingPanelProps {
  children: React.ReactNode;
  position: PanelPosition;
  onPositionChange: (pos: PanelPosition) => void;
  title?: string;
  headerExtra?: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  maxWidth?: number;
}

/**
 * A draggable floating panel with a grab handle.
 * Used for the toolbar and inspector.
 */
export function FloatingPanel({
  children,
  position,
  onPositionChange,
  title,
  headerExtra,
  collapsible,
  collapsed,
  onCollapsedChange,
  className,
  style,
  maxWidth,
}: FloatingPanelProps) {
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start drag if clicking a button inside the header
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    let newX = drag.posX + dx;
    let newY = drag.posY + dy;

    // Constrain and snap to viewport edges
    const parent = panelRef.current?.parentElement;
    if (parent && panelRef.current) {
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      const panelW = panelRef.current.offsetWidth;
      const panelH = panelRef.current.offsetHeight;
      const SNAP = 8;

      newX = Math.max(SNAP, Math.min(pw - panelW - SNAP, newX));
      newY = Math.max(SNAP, Math.min(ph - panelH - SNAP, newY));

      if (Math.abs(newX - SNAP) < 12) newX = SNAP;
      if (Math.abs(newX - (pw - panelW - SNAP)) < 12) newX = pw - panelW - SNAP;
      if (Math.abs(newY - SNAP) < 12) newY = SNAP;
      if (Math.abs(newY - (ph - panelH - SNAP)) < 12) newY = ph - panelH - SNAP;
    }

    onPositionChange({ x: newX, y: newY });
  }, [onPositionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      ref={panelRef}
      className={`elucim-floating-panel ${className ?? ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 100,
        background: '#16162aee',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        color: '#e0e0e0',
        fontSize: 11,
        overflow: 'hidden',
        maxWidth: maxWidth ?? 'none',
        ...style,
      }}
    >
      {/* Drag handle header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          background: '#0f172a88',
          cursor: 'grab',
          userSelect: 'none',
          minHeight: 28,
          borderBottom: collapsed ? 'none' : '1px solid #1e293b',
        }}
      >
        <span style={{ color: '#475569', fontSize: 10, letterSpacing: 1 }}>⠿</span>
        {title && (
          <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </span>
        )}
        {headerExtra}
        {collapsible && onCollapsedChange && (
          <button
            onClick={(e) => { e.stopPropagation(); onCollapsedChange(!collapsed); }}
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 10,
              padding: '0 2px',
            }}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}
