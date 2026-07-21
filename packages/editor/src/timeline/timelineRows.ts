import type { ElementNode } from '@elucim/editor-projection';
import { getElementId } from '../state/types';
import type { TrackRow } from './types';

export function getChildren(element: ElementNode): ElementNode[] {
  return 'children' in element && Array.isArray((element as { children?: unknown }).children)
    ? (element as { children: ElementNode[] }).children
    : [];
}

export function getRows(elements: ElementNode[], expandedIds: Set<string>, parentPath = 'root', depth = 0): TrackRow[] {
  return elements.flatMap((element, index) => {
    const id = getElementId(element, index, parentPath);
    const children = getChildren(element);
    const label = ('id' in element && element.id) ? element.id : `${element.type}[${index}]`;
    const row: TrackRow = {
      element,
      id,
      label,
      rootIndex: depth === 0 ? index : -1,
      depth,
      hasChildren: children.length > 0,
      isTopLevel: depth === 0,
    };
    return expandedIds.has(id)
      ? [row, ...getRows(children, expandedIds, id, depth + 1)]
      : [row];
  });
}
