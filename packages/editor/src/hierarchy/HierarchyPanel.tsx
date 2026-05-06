import React, { useCallback, useState } from 'react';
import type { ElementNode, ElucimV2Document } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { CANVAS_ID, getElementId } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';

export interface HierarchyPanelProps {
  className?: string;
  style?: React.CSSProperties;
  v2Document?: ElucimV2Document;
}

interface HierarchyRow {
  element: ElementNode;
  id: string;
  label: string;
  type: string;
  depth: number;
  hasChildren: boolean;
}

function getChildren(element: ElementNode): ElementNode[] {
  return 'children' in element && Array.isArray((element as { children?: unknown }).children)
    ? (element as { children: ElementNode[] }).children
    : [];
}

function getRows(elements: ElementNode[], collapsedIds: Set<string>, parentPath = 'root', depth = 0): HierarchyRow[] {
  return elements.flatMap((element, index) => {
    const id = getElementId(element, index, parentPath);
    const children = getChildren(element);
    const label = ('id' in element && element.id) ? element.id : `${element.type}[${index}]`;
    const row: HierarchyRow = {
      element,
      id,
      label,
      type: element.type,
      depth,
      hasChildren: children.length > 0,
    };
    return collapsedIds.has(id)
      ? [row]
      : [row, ...getRows(children, collapsedIds, id, depth + 1)];
  });
}

function getTypeColor(type: string): string {
  if (type === 'group') return v('--elucim-editor-accent');
  if (['fadeIn', 'fadeOut', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel'].includes(type)) {
    return v('--elucim-editor-warning');
  }
  if (['text', 'latex'].includes(type)) return v('--elucim-editor-success');
  return v('--elucim-editor-text-secondary');
}

/**
 * Persistent scene hierarchy inspired by motion-design editors.
 * Keeps nested groups and animation wrappers visible without opening the inspector.
 */
export function HierarchyPanel({ className, style, v2Document }: HierarchyPanelProps) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const root = state.document.root;
  const children: ElementNode[] = 'children' in root && Array.isArray(root.children) ? root.children : [];
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const rows = getRows(children, collapsedIds);
  const rootSelected = state.selectedIds.length === 1 && state.selectedIds[0] === CANVAS_ID;

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const beginRename = useCallback((id: string, label: string) => {
    setEditingId(id);
    setEditValue(label);
  }, []);

  const commitRename = useCallback(() => {
    const nextId = editValue.trim();
    if (editingId && nextId && nextId !== editingId) {
      dispatch({ type: 'RENAME_ELEMENT', id: editingId, newId: nextId });
    }
    setEditingId(null);
  }, [dispatch, editingId, editValue]);

  return (
    <div
      className={`elucim-editor-hierarchy ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        fontSize: 11,
        ...style,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 4px 8px' }}>
        <HierarchyButton
          label="Canvas"
          type="scene"
          selected={rootSelected}
          depth={0}
          onClick={() => dispatch({ type: 'SELECT', ids: [CANVAS_ID] })}
        />

        {rows.length === 0 ? (
          <div style={{ padding: '14px 8px', color: v('--elucim-editor-text-muted'), lineHeight: 1.4 }}>
            Add a shape, text, graph, or template to start building the scene.
          </div>
        ) : rows.map(row => {
          const selected = state.selectedIds.includes(row.id);
          const collapsed = collapsedIds.has(row.id);
          const semanticRole = v2Document?.elements[row.id]?.intent?.role ?? v2Document?.elements[row.id]?.role;
          return (
            <div
              key={row.id}
              role="treeitem"
              aria-selected={selected}
              aria-expanded={row.hasChildren ? !collapsed : undefined}
              tabIndex={-1}
              onClick={event => {
                event.currentTarget.focus({ preventScroll: true });
                dispatch({ type: 'SELECT', ids: [row.id] });
              }}
              onDoubleClick={() => beginRename(row.id, row.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 26,
                gap: 4,
                padding: '0 6px 0 4px',
                borderRadius: 4,
                background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
                color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
                cursor: 'default',
              }}
            >
              <span style={{ width: row.depth * 12, flexShrink: 0 }} />
              {row.hasChildren ? (
                <button
                  type="button"
                  aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${row.label}`}
                  title={collapsed ? 'Expand children' : 'Collapse children'}
                  onClick={event => {
                    event.stopPropagation();
                    toggleCollapsed(row.id);
                  }}
                  style={{
                    width: 16,
                    height: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: v('--elucim-editor-text-muted'),
                    cursor: 'pointer',
                  }}
                >
                  {collapsed ? icons.ChevronRight({ size: 12 }) : icons.ChevronDown({ size: 12 })}
                </button>
              ) : (
                <span style={{ width: 16, flexShrink: 0 }} />
              )}
              <span
                title={row.type}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: getTypeColor(row.type),
                  boxShadow: selected ? `0 0 0 2px color-mix(in srgb, ${v('--elucim-editor-accent')} 18%, transparent)` : undefined,
                  flexShrink: 0,
                }}
              />
              {editingId === row.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={event => setEditValue(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={event => {
                    if (event.key === 'Enter') commitRename();
                    if (event.key === 'Escape') setEditingId(null);
                  }}
                  onClick={event => event.stopPropagation()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 20,
                    fontSize: 11,
                    border: `1px solid ${v('--elucim-editor-accent')}`,
                    borderRadius: 3,
                    background: v('--elucim-editor-input-bg'),
                    color: v('--elucim-editor-fg'),
                    padding: '0 4px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.label}
                </span>
              )}
              <span style={{ color: v('--elucim-editor-text-muted'), fontSize: 9, textTransform: 'uppercase' }}>
                {semanticRole ?? row.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HierarchyButton({
  label,
  type,
  selected,
  depth,
  onClick,
}: {
  label: string;
  type: string;
  selected: boolean;
  depth: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: `0 6px 0 ${8 + depth * 12}px`,
        border: 'none',
        borderRadius: 4,
        background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
        color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 11,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 2, background: v('--elucim-editor-accent'), flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: v('--elucim-editor-text-muted'), fontSize: 9, textTransform: 'uppercase' }}>{type}</span>
    </button>
  );
}
