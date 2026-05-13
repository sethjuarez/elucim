import type { ElucimDocument, ElucimElement, ElucimLayout, ElucimTimeline } from './types';
import { applyTimelineFrame } from './timeline';

export type ElucimCommand =
  | { op: 'addElement'; element: ElucimElement; parentId?: string; index?: number }
  | { op: 'updateElement'; id: string; patch: Partial<Omit<ElucimElement, 'id'>> }
  | { op: 'deleteElement'; id: string }
  | { op: 'moveElement'; id: string; layout: Partial<ElucimLayout> }
  | { op: 'reorderElement'; id: string; index: number }
  | { op: 'reparentElement'; id: string; parentId?: string; index?: number }
  | { op: 'upsertTimeline'; timeline: ElucimTimeline }
  | { op: 'deleteTimeline'; id: string }
  | { op: 'applyTimelineFrame'; timelineId: string; frame: number }
  | { op: 'updateMetadata'; metadata: Partial<ElucimDocument['metadata']> };

export interface ElucimCommandResult {
  document: ElucimDocument;
  changed: boolean;
  summary: string;
}

export function applyCommand(doc: ElucimDocument, command: ElucimCommand): ElucimCommandResult {
  const next = cloneDoc(doc);
  switch (command.op) {
    case 'addElement':
      return addElement(next, command);
    case 'updateElement':
      return updateElement(next, command);
    case 'deleteElement':
      return deleteElement(next, command.id);
    case 'moveElement':
      return moveElement(next, command);
    case 'reorderElement':
      return reorderElement(next, command);
    case 'reparentElement':
      return reparentElement(next, command);
    case 'upsertTimeline':
      return upsertTimeline(next, command.timeline);
    case 'deleteTimeline':
      return deleteTimelineCommand(next, command.id);
    case 'applyTimelineFrame':
      return {
        document: applyTimelineFrame(next, command.timelineId, command.frame),
        changed: true,
        summary: `Applied timeline "${command.timelineId}" at frame ${command.frame}.`,
      };
    case 'updateMetadata':
      next.metadata = { ...next.metadata, ...command.metadata };
      return { document: next, changed: true, summary: 'Updated document metadata.' };
  }
}

function addElement(
  doc: ElucimDocument,
  command: Extract<ElucimCommand, { op: 'addElement' }>,
): ElucimCommandResult {
  const { element, parentId, index } = command;
  if (doc.elements[element.id]) throw new Error(`Element "${element.id}" already exists`);
  if (parentId && !doc.elements[parentId]) throw new Error(`Parent "${parentId}" does not exist`);

  const nextElement: ElucimElement = {
    ...element,
    parentId,
    children: element.children ? [...element.children] : undefined,
    props: { ...element.props },
    layout: element.layout ? { ...element.layout } : undefined,
  };
  doc.elements[element.id] = nextElement;
  insertChild(doc, parentId, element.id, index);
  return { document: doc, changed: true, summary: `Added element "${element.id}".` };
}

function updateElement(
  doc: ElucimDocument,
  command: Extract<ElucimCommand, { op: 'updateElement' }>,
): ElucimCommandResult {
  const current = doc.elements[command.id];
  if (!current) throw new Error(`Element "${command.id}" does not exist`);
  doc.elements[command.id] = {
    ...current,
    ...command.patch,
    id: current.id,
    props: command.patch.props ? { ...current.props, ...command.patch.props } : current.props,
    layout: command.patch.layout ? { ...current.layout, ...command.patch.layout } : current.layout,
    intent: command.patch.intent ? { ...current.intent, ...command.patch.intent } : current.intent,
    children: command.patch.children ? [...command.patch.children] : current.children,
  };
  return { document: doc, changed: true, summary: `Updated element "${command.id}".` };
}

function deleteElement(doc: ElucimDocument, id: string): ElucimCommandResult {
  if (!doc.elements[id]) throw new Error(`Element "${id}" does not exist`);
  const idsToDelete = collectDescendants(doc, id);
  idsToDelete.add(id);

  for (const deleteId of idsToDelete) {
    removeFromParent(doc, deleteId);
    delete doc.elements[deleteId];
  }
  cleanupTimelineReferences(doc, idsToDelete);
  return { document: doc, changed: true, summary: `Deleted ${idsToDelete.size} element(s).` };
}

function moveElement(
  doc: ElucimDocument,
  command: Extract<ElucimCommand, { op: 'moveElement' }>,
): ElucimCommandResult {
  const element = doc.elements[command.id];
  if (!element) throw new Error(`Element "${command.id}" does not exist`);
  element.layout = { ...element.layout, ...command.layout };
  return { document: doc, changed: true, summary: `Moved element "${command.id}".` };
}

function reorderElement(
  doc: ElucimDocument,
  command: Extract<ElucimCommand, { op: 'reorderElement' }>,
): ElucimCommandResult {
  const element = doc.elements[command.id];
  if (!element) throw new Error(`Element "${command.id}" does not exist`);
  insertChild(doc, element.parentId, command.id, command.index);
  return { document: doc, changed: true, summary: `Reordered element "${command.id}".` };
}

function reparentElement(
  doc: ElucimDocument,
  command: Extract<ElucimCommand, { op: 'reparentElement' }>,
): ElucimCommandResult {
  const element = doc.elements[command.id];
  if (!element) throw new Error(`Element "${command.id}" does not exist`);
  if (command.parentId && !doc.elements[command.parentId]) throw new Error(`Parent "${command.parentId}" does not exist`);
  if (command.parentId && collectDescendants(doc, command.id).has(command.parentId)) {
    throw new Error(`Cannot reparent "${command.id}" into one of its descendants`);
  }
  removeFromParent(doc, command.id);
  element.parentId = command.parentId;
  insertChild(doc, command.parentId, command.id, command.index);
  return { document: doc, changed: true, summary: `Reparented element "${command.id}".` };
}

function upsertTimeline(doc: ElucimDocument, timeline: ElucimTimeline): ElucimCommandResult {
  doc.timelines ??= {};
  const existed = Boolean(doc.timelines[timeline.id]);
  doc.timelines[timeline.id] = {
    ...timeline,
    tracks: timeline.tracks.map(track => ({
      ...track,
      keyframes: track.keyframes.map(keyframe => ({ ...keyframe })),
    })),
  };
  return { document: doc, changed: true, summary: `${existed ? 'Updated' : 'Added'} timeline "${timeline.id}".` };
}

function deleteTimelineCommand(doc: ElucimDocument, id: string): ElucimCommandResult {
  if (!doc.timelines?.[id]) throw new Error(`Timeline "${id}" does not exist`);
  delete doc.timelines[id];
  return { document: doc, changed: true, summary: `Deleted timeline "${id}".` };
}

function insertChild(doc: ElucimDocument, parentId: string | undefined, childId: string, index?: number) {
  const children = parentId ? (doc.elements[parentId].children ??= []) : doc.scene.children;
  const existingIndex = children.indexOf(childId);
  if (existingIndex >= 0) children.splice(existingIndex, 1);
  const insertAt = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(insertAt, 0, childId);
}

function removeFromParent(doc: ElucimDocument, id: string) {
  const parentId = doc.elements[id]?.parentId;
  const siblings = parentId ? doc.elements[parentId]?.children : doc.scene.children;
  const index = siblings?.indexOf(id) ?? -1;
  if (index >= 0) siblings?.splice(index, 1);
}

function collectDescendants(doc: ElucimDocument, id: string): Set<string> {
  const descendants = new Set<string>();
  const visit = (currentId: string) => {
    for (const childId of doc.elements[currentId]?.children ?? []) {
      descendants.add(childId);
      visit(childId);
    }
  };
  visit(id);
  return descendants;
}

function cleanupTimelineReferences(doc: ElucimDocument, deletedIds: Set<string>) {
  for (const timeline of Object.values(doc.timelines ?? {})) {
    timeline.tracks = timeline.tracks.filter(track => !deletedIds.has(track.target));
  }
}

function cloneDoc(doc: ElucimDocument): ElucimDocument {
  return JSON.parse(JSON.stringify(doc)) as ElucimDocument;
}
