import type { ElementNode } from '@elucim/dsl';
import { getElementId } from '../state/types';
import { WRAPPER_TYPES } from './constants';
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

export function getAnimationValues(element: ElementNode): { fadeIn: number; fadeOut: number; draw: number } {
  const el = element as ElementNode & { duration?: number; fadeIn?: number; fadeOut?: number; draw?: number };
  if (el.type === 'fadeIn') return { fadeIn: el.duration ?? 0, fadeOut: 0, draw: 0 };
  if (el.type === 'fadeOut') return { fadeIn: 0, fadeOut: el.duration ?? 0, draw: 0 };
  if (el.type === 'draw' || el.type === 'write') return { fadeIn: 0, fadeOut: 0, draw: el.duration ?? 0 };
  if (WRAPPER_TYPES.has(el.type)) return { fadeIn: 0, fadeOut: 0, draw: el.duration ?? 0 };
  return { fadeIn: el.fadeIn ?? 0, fadeOut: el.fadeOut ?? 0, draw: el.draw ?? 0 };
}

export function getAnimationUpdateProp(element: ElementNode, prop: 'fadeIn' | 'fadeOut' | 'draw'): 'fadeIn' | 'fadeOut' | 'draw' | 'duration' {
  return WRAPPER_TYPES.has(element.type) ? 'duration' : prop;
}
