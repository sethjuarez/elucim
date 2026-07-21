import React, { useCallback, useState } from 'react';
import type { ElementNode, ElucimDocument } from '@elucim/editor-projection';
import { useEditorState } from '../state/EditorProvider';
import { CANVAS_ID, getElementId } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';
import { ContextMenu } from '../canvas/ContextMenu';
import type { ContextMenuItem } from '../canvas/ContextMenu';
import { buildElementContextMenuItems } from '../canvas/contextMenuItems';

export interface ObjectsPanelProps {
  className?: string;
  style?: React.CSSProperties;
  document?: ElucimDocument;
}

interface ObjectRow {
  element: ElementNode;
  id: string;
  label: string;
  type: string;
  depth: number;
  parentPath: string;
  index: number;
  hasChildren: boolean;
}

interface DragState {
  id: string;
  parentPath: string;
  index: number;
}

interface DropIndicator {
  id: string;
  position: 'before' | 'after';
}

function getChildren(element: ElementNode): ElementNode[] {
  return 'children' in element && Array.isArray((element as { children?: unknown }).children)
    ? (element as { children: ElementNode[] }).children
    : [];
}

function getRows(elements: ElementNode[], collapsedIds: Set<string>, parentPath = 'root', depth = 0): ObjectRow[] {
  return elements.map((element, index) => {
    const id = getElementId(element, index, parentPath);
    const children = getChildren(element);
    const label = ('id' in element && element.id) ? element.id : `${element.type}[${index}]`;
    return {
      element,
      id,
      label,
      type: element.type,
      depth,
      parentPath,
      index,
      hasChildren: children.length > 0,
      children,
    };
  }).reverse().flatMap(({ children: rowChildren, ...row }) => {
    return collapsedIds.has(row.id)
      ? [row]
      : [row, ...getRows(rowChildren, collapsedIds, row.id, depth + 1)];
  });
}

function getTypeColor(type: string): string {
  if (type === 'group') return v('--elucim-editor-accent');
  return v('--elucim-editor-text-secondary');
}

/**
 * Persistent Objects tree inspired by motion-design editors.
 * Keeps nested groups visible without opening the inspector.
 */
export function ObjectsPanel({ className, style, document: documentModel }: ObjectsPanelProps) {
  const { state, dispatch } = useEditorState();
  const icons = useEditorIcons();
  const activeDocument = documentModel;
  const root = state.document.root;
  const children: ElementNode[] = 'children' in root && Array.isArray(root.children) ? root.children : [];
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const rows = getRows(children, collapsedIds);
  const elementIds = children.map((element, index) => getElementId(element, index));
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

  const getDropPosition = useCallback((event: React.DragEvent<HTMLElement>): 'before' | 'after' => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
  }, []);

  const finishDrop = useCallback((row: ObjectRow, position: 'before' | 'after') => {
    if (!dragging || dragging.id === row.id || dragging.parentPath !== row.parentPath) return;
    const siblingRows = rows.filter(candidate => candidate.parentPath === row.parentPath);
    const draggingDisplayIndex = siblingRows.findIndex(candidate => candidate.id === dragging.id);
    const targetDisplayIndex = siblingRows.findIndex(candidate => candidate.id === row.id);
    if (draggingDisplayIndex < 0 || targetDisplayIndex < 0) return;
    const nextDisplayRows = [...siblingRows];
    const [draggedRow] = nextDisplayRows.splice(draggingDisplayIndex, 1);
    const targetDisplayIndexAfterRemoval = nextDisplayRows.findIndex(candidate => candidate.id === row.id);
    const insertDisplayIndex = targetDisplayIndexAfterRemoval + (position === 'after' ? 1 : 0);
    nextDisplayRows.splice(insertDisplayIndex, 0, draggedRow);
    const newDisplayIndex = nextDisplayRows.findIndex(candidate => candidate.id === dragging.id);
    const newIndex = nextDisplayRows.length - 1 - newDisplayIndex;
    dispatch({ type: 'REORDER_ELEMENT', id: dragging.id, newIndex });
  }, [dispatch, dragging, rows]);

  const openContextMenu = useCallback((event: React.MouseEvent<HTMLElement>, id: string) => {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    if (!state.selectedIds.includes(id)) {
      dispatch({ type: 'SELECT', ids: [id] });
    }
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: buildElementContextMenuItems({
        root,
        children,
        elementIds,
        selectedIds: state.selectedIds,
        contextElementId: id,
        dispatch,
      }),
    });
  }, [children, dispatch, elementIds, root, state.selectedIds]);

  return (
    <div
      className={`elucim-editor-objects ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        fontSize: 11,
        ...style,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 4px 8px' }}>
        <ObjectTreeButton
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
          const semanticRole = activeDocument?.elements[row.id]?.intent?.role ?? activeDocument?.elements[row.id]?.role;
          return (
            <div
              key={row.id}
              role="treeitem"
              aria-selected={selected}
              aria-expanded={row.hasChildren ? !collapsed : undefined}
              tabIndex={-1}
              draggable={editingId !== row.id}
              title="Drag to reorder within this parent group"
              aria-grabbed={dragging?.id === row.id ? true : undefined}
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', row.id);
                setDragging({ id: row.id, parentPath: row.parentPath, index: row.index });
              }}
              onDragOver={event => {
                if (!dragging || dragging.id === row.id || dragging.parentPath !== row.parentPath) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropIndicator({ id: row.id, position: getDropPosition(event) });
              }}
              onDragLeave={() => {
                setDropIndicator(current => current?.id === row.id ? null : current);
              }}
              onDrop={event => {
                event.preventDefault();
                const position = getDropPosition(event);
                finishDrop(row, position);
                setDragging(null);
                setDropIndicator(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDropIndicator(null);
              }}
              onClick={event => {
                event.currentTarget.focus({ preventScroll: true });
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                  dispatch({ type: 'SELECT_TOGGLE', id: row.id });
                } else {
                  dispatch({ type: 'SELECT', ids: [row.id] });
                }
              }}
              onContextMenu={event => openContextMenu(event, row.id)}
              onDoubleClick={() => beginRename(row.id, row.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 26,
                gap: 4,
                padding: '0 6px 0 4px',
                borderRadius: 4,
                background: selected ? `color-mix(in srgb, ${v('--elucim-editor-accent')} 16%, transparent)` : 'transparent',
                boxShadow: dropIndicator?.id === row.id
                  ? `inset 0 ${dropIndicator.position === 'before' ? '2px' : '-2px'} 0 ${v('--elucim-editor-accent')}`
                  : undefined,
                opacity: dragging?.id === row.id ? 0.55 : 1,
                color: selected ? v('--elucim-editor-fg') : v('--elucim-editor-text-secondary'),
                cursor: editingId === row.id ? 'text' : 'default',
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function ObjectTreeButton({
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
