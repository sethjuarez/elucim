import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { v } from '../theme/tokens';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - items.length * 30 - 20),
    left: Math.min(x, window.innerWidth - 180),
    zIndex: 10000,
    minWidth: 160,
    background: v('--elucim-editor-surface'),
    border: `1px solid ${v('--elucim-editor-border')}`,
    borderRadius: 4,
    padding: '4px 0',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    fontSize: 11,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  return createPortal(
    <div ref={ref} style={style}>
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ height: 1, background: v('--elucim-editor-border'), margin: '4px 0' }} />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '5px 12px',
              border: 'none',
              background: 'transparent',
              color: item.disabled ? v('--elucim-editor-text-disabled') : v('--elucim-editor-fg'),
              cursor: item.disabled ? 'default' : 'pointer',
              textAlign: 'left',
              fontSize: 11,
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, marginLeft: 16 }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
