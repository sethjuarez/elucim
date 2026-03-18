import React, { useCallback, useRef } from 'react';
import type { PanelPosition } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';

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
  const icons = useEditorIcons();
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
        zIndex: 120,
        background: v('--elucim-editor-panel'),
        backdropFilter: 'blur(8px)',
        border: `1px solid ${v('--elucim-editor-border')}`,
        borderRadius: 8,
        boxShadow: v('--elucim-editor-shadow-panel'),
        color: v('--elucim-editor-fg'),
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
          background: `color-mix(in srgb, ${v('--elucim-editor-input-bg')} 53%, transparent)`,
          cursor: 'grab',
          userSelect: 'none',
          minHeight: 28,
          borderBottom: collapsed ? 'none' : `1px solid ${v('--elucim-editor-border-subtle')}`,
        }}
      >
        <span style={{ color: v('--elucim-editor-text-disabled'), lineHeight: 0 }}>{icons.DragHandle()}</span>
        {title && (
          <span style={{ flex: 1, fontSize: 10, fontWeight: 600, color: v('--elucim-editor-text-secondary'), textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
              color: v('--elucim-editor-text-muted'),
              cursor: 'pointer',
              padding: '0 2px',
              lineHeight: 0,
            }}
          >
            {collapsed ? icons.ChevronRight() : icons.ChevronDown()}
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
