import { useEffect, useState } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import { ObjectsPanel } from '../objects/ObjectsPanel';
import { PolishPanel } from '../panels/PolishPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { v } from '../theme/tokens';
import { PanelToggle } from '../chrome/PanelToggle';

export function LeftDock({ document, onDocumentChange, onClose, preferredTab }: { document?: ElucimDocument; onDocumentChange?: (document: ElucimDocument) => void; onClose?: () => void; preferredTab?: 'objects' | 'create' | 'polish' }) {
  const [tab, setTab] = useState<'objects' | 'create' | 'polish'>('objects');
  useEffect(() => {
    if (preferredTab === 'objects' || preferredTab === 'create' || preferredTab === 'polish') setTab(preferredTab);
  }, [preferredTab]);
  return (
    <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        role="tablist"
        aria-label="Left editor panel"
        style={{
          display: 'grid',
          gridTemplateColumns: onClose ? '1fr 1fr 1fr auto' : '1fr 1fr 1fr',
          alignItems: 'center',
          gap: 6,
          minHeight: 34,
          padding: '3px 8px 3px 10px',
          borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
          flexShrink: 0,
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <DockTab label="Objects" selected={tab === 'objects'} onClick={() => setTab('objects')} />
        <DockTab label="Create" selected={tab === 'create'} onClick={() => setTab('create')} />
        <DockTab label="Polish" selected={tab === 'polish'} onClick={() => setTab('polish')} />
        {onClose && <PanelToggle label="left panel" panel="left" active onClick={onClose} />}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'create'
          ? <Toolbar />
          : tab === 'polish'
            ? <PolishPanel document={document} onDocumentChange={onDocumentChange} />
            : <ObjectsPanel document={document} />}
      </div>
    </section>
  );
}

function DockTab({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      style={{
        height: 28,
        border: 'none',
        borderBottom: `2px solid ${selected ? v('--elucim-editor-accent') : 'transparent'}`,
        borderRadius: 0,
        background: selected ? v('--elucim-editor-surface') : 'transparent',
        color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  );
}
