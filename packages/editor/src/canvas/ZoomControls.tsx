import React from 'react';

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
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#0f172acc',
        backdropFilter: 'blur(4px)',
        border: '1px solid #334155',
        borderRadius: 6,
        padding: '2px 4px',
      }}
    >
      <ZoomButton icon="−" title="Zoom out" onClick={onZoomOut} />
      <span
        style={{
          minWidth: 40,
          textAlign: 'center',
          fontSize: 10,
          color: '#94a3b8',
          fontVariantNumeric: 'tabular-nums',
          userSelect: 'none',
          cursor: 'pointer',
        }}
        title="Fit to view"
        onClick={onFitToView}
      >
        {pct}%
      </span>
      <ZoomButton icon="+" title="Zoom in" onClick={onZoomIn} />
      <div style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />
      <ZoomButton icon="⊞" title="Fit to view" onClick={onFitToView} />
    </div>
  );
}

function ZoomButton({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        color: '#e0e0e0',
        cursor: 'pointer',
        fontSize: 14,
      }}
    >
      {icon}
    </button>
  );
}
