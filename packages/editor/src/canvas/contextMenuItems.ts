import type { Dispatch } from 'react';
import type { ElementNode, EditorProjection as ElucimDocument } from '@elucim/editor-projection';
import { findElementById } from '../state/reducer';
import { CANVAS_ID, type EditorAction } from '../state/types';
import type { ContextMenuItem } from './ContextMenu';

function groupableIds(root: ElucimDocument['root'], ids: string[]): string[] {
  const realIds = ids.filter(id => id !== CANVAS_ID);
  const locations = realIds.map(id => findElementById(root as any, id)).filter(Boolean);
  if (locations.length < 2) return [];
  const parent = locations[0]?.parent;
  if (!parent || locations.some(loc => loc?.parent !== parent)) return [];
  return realIds;
}

export function buildElementContextMenuItems({
  root,
  children,
  elementIds,
  selectedIds,
  contextElementId,
  dispatch,
}: {
  root: ElucimDocument['root'];
  children: ElementNode[];
  elementIds: string[];
  selectedIds: string[];
  contextElementId?: string;
  dispatch: Dispatch<EditorAction>;
}): ContextMenuItem[] {
  const ids = contextElementId && !selectedIds.includes(contextElementId) ? [contextElementId] : [...selectedIds];
  const realIds = ids.filter(id => id !== CANVAS_ID);
  const idsToGroup = groupableIds(root, ids);
  const hasSelection = realIds.length > 0;
  const singleEl = hasSelection ? findElementById(root as any, ids[0])?.element : undefined;
  const isGroup = singleEl?.type === 'group';

  return [
    {
      label: 'Group',
      shortcut: 'Ctrl+G',
      disabled: idsToGroup.length < 2,
      onClick: () => dispatch({ type: 'GROUP_ELEMENTS', ids: idsToGroup }),
      separator: false,
    },
    {
      label: 'Ungroup',
      shortcut: 'Ctrl+Shift+G',
      disabled: !isGroup,
      onClick: () => { if (ids[0]) dispatch({ type: 'UNGROUP', id: ids[0] }); },
      separator: false,
    },
    { label: '', onClick: () => {}, separator: true },
    {
      label: 'Duplicate',
      shortcut: 'Ctrl+D',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'DUPLICATE_ELEMENTS', ids }),
      separator: false,
    },
    {
      label: 'Copy',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      onClick: () => { /* handled by keyboard */ },
      separator: false,
    },
    {
      label: 'Paste',
      shortcut: 'Ctrl+V',
      disabled: false,
      onClick: () => { /* handled by keyboard */ },
      separator: false,
    },
    {
      label: 'Delete',
      shortcut: 'Del',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'DELETE_ELEMENTS', ids }),
      separator: false,
    },
    { label: '', onClick: () => {}, separator: true },
    {
      label: 'Bring Forward',
      shortcut: 'Ctrl+]',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'BRING_FORWARD', ids }),
      separator: false,
    },
    {
      label: 'Send Backward',
      shortcut: 'Ctrl+[',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'SEND_BACKWARD', ids }),
      separator: false,
    },
    {
      label: 'Bring to Front',
      shortcut: 'Ctrl+Shift+]',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'BRING_TO_FRONT', ids }),
      separator: false,
    },
    {
      label: 'Send to Back',
      shortcut: 'Ctrl+Shift+[',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'SEND_TO_BACK', ids }),
      separator: false,
    },
    { label: '', onClick: () => {}, separator: true },
    ...(ids.length >= 2 ? [
      {
        label: 'Align Left',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'left' as const }),
        separator: false,
      },
      {
        label: 'Align Right',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'right' as const }),
        separator: false,
      },
      {
        label: 'Align Top',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'top' as const }),
        separator: false,
      },
      {
        label: 'Align Bottom',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'bottom' as const }),
        separator: false,
      },
      {
        label: 'Align Center Horizontal',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'center-h' as const }),
        separator: false,
      },
      {
        label: 'Align Center Vertical',
        disabled: false,
        onClick: () => dispatch({ type: 'ALIGN_ELEMENTS', ids, direction: 'center-v' as const }),
        separator: false,
      },
      { label: '', onClick: () => {}, separator: true },
    ] : []),
    ...(ids.length >= 3 ? [
      {
        label: 'Distribute Horizontal',
        disabled: false,
        onClick: () => dispatch({ type: 'DISTRIBUTE_ELEMENTS', ids, direction: 'horizontal' as const }),
        separator: false,
      },
      {
        label: 'Distribute Vertical',
        disabled: false,
        onClick: () => dispatch({ type: 'DISTRIBUTE_ELEMENTS', ids, direction: 'vertical' as const }),
        separator: false,
      },
      { label: '', onClick: () => {}, separator: true },
    ] : []),
    {
      label: 'Select All',
      shortcut: 'Ctrl+A',
      disabled: children.length === 0,
      onClick: () => dispatch({ type: 'SELECT', ids: [...elementIds] }),
      separator: false,
    },
    {
      label: 'Deselect All',
      shortcut: 'Esc',
      disabled: !hasSelection,
      onClick: () => dispatch({ type: 'DESELECT_ALL' }),
      separator: false,
    },
  ];
}
