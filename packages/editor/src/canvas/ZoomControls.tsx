import React from 'react';
import { IconZoomIn, IconZoomOut, IconFitToView } from '../theme/icons';
import { v } from '../theme/tokens';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
}

/**
 * Zoom controls widget: +/−/fit buttons with current zoom percentage.
 * Positioned at bottom-left of the canvas.
 */
export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFitToView }: ZoomControlsProps) {
  const pct = Math.round(zoom * 100);

  return (
    <div
      className="elucim-editor-zoom-controls"
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: v('--elucim-editor-chrome'),
        backdropFilter: 'blur(4px)',
        border: `1px solid ${v('--elucim-editor-border')}`,
        borderRadius: 6,
        padding: '2px 4px',
      }}
    >
      <ZoomButton icon={<IconZoomOut />} title="Zoom out" onClick={onZoomOut} />
      <span
        style={{
          minWidth: 40,
          textAlign: 'center',
          fontSize: 10,
          color: v('--elucim-editor-text-secondary'),
          fontVariantNumeric: 'tabular-nums',
          userSelect: 'none',
          cursor: 'pointer',
        }}
        title="Current zoom"
        onClick={onFitToView}
      >
        {pct}%
      </span>
      <ZoomButton icon={<IconZoomIn />} title="Zoom in" onClick={onZoomIn} />
      <div style={{ width: 1, height: 16, background: v('--elucim-editor-border'), margin: '0 2px' }} />
      <ZoomButton icon={<IconFitToView />} title="Fit to view" onClick={onFitToView} />
    </div>
  );
}

function ZoomButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        color: v('--elucim-editor-fg'),
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {icon}
    </button>
  );
}
