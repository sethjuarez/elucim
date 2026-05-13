import { useEffect, useState } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import { HierarchyPanel } from '../hierarchy/HierarchyPanel';
import { PanelShell } from '../panels/PanelShell';
import { PolishPanel } from '../panels/PolishPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { v } from '../theme/tokens';

export function LeftDock({ document, onDocumentChange, preferredTab }: { document?: ElucimDocument; onDocumentChange?: (document: ElucimDocument) => void; preferredTab?: 'objects' | 'create' | 'polish' }) {
  const [tab, setTab] = useState<'objects' | 'create'>('objects');
  useEffect(() => {
    if (preferredTab === 'objects' || preferredTab === 'create') setTab(preferredTab);
  }, [preferredTab]);
  if (preferredTab === 'polish') {
    return (
      <PanelShell title="Polish">
        <PolishPanel document={document} onDocumentChange={onDocumentChange} />
      </PanelShell>
    );
  }
  return (
    <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        role="tablist"
        aria-label="Left editor panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          padding: '0 8px',
          borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}`,
          flexShrink: 0,
          background: v('--elucim-editor-input-bg'),
        }}
      >
        <DockTab label="Objects" selected={tab === 'objects'} onClick={() => setTab('objects')} />
        <DockTab label="Create" selected={tab === 'create'} onClick={() => setTab('create')} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tab === 'create' ? <Toolbar /> : <HierarchyPanel document={document} />}
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
        height: 26,
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
