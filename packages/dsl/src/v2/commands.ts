import type { ElucimV2Document, ElucimV2Element, ElucimV2Layout, ElucimV2Timeline } from './types';
import { applyTimelineFrame } from './timeline';

export type ElucimV2Command =
  | { op: 'addElement'; element: ElucimV2Element; parentId?: string; index?: number }
  | { op: 'updateElement'; id: string; patch: Partial<Omit<ElucimV2Element, 'id'>> }
  | { op: 'deleteElement'; id: string }
  | { op: 'moveElement'; id: string; layout: Partial<ElucimV2Layout> }
  | { op: 'reparentElement'; id: string; parentId?: string; index?: number }
  | { op: 'applyAnimationPreset'; ids: string[]; preset: 'intro' | 'reveal' | 'outro'; duration?: number }
  | { op: 'upsertTimeline'; timeline: ElucimV2Timeline }
  | { op: 'deleteTimeline'; id: string }
  | { op: 'applyTimelineFrame'; timelineId: string; frame: number }
  | { op: 'updateMetadata'; metadata: Partial<ElucimV2Document['metadata']> };

export interface ElucimV2CommandResult {
  document: ElucimV2Document;
  changed: boolean;
  summary: string;
}

export function applyCommand(doc: ElucimV2Document, command: ElucimV2Command): ElucimV2CommandResult {
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
    case 'reparentElement':
      return reparentElement(next, command);
    case 'applyAnimationPreset':
      return applyAnimationPreset(next, command);
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
  doc: ElucimV2Document,
  command: Extract<ElucimV2Command, { op: 'addElement' }>,
): ElucimV2CommandResult {
  const { element, parentId, index } = command;
  if (doc.elements[element.id]) throw new Error(`Element "${element.id}" already exists`);
  if (parentId && !doc.elements[parentId]) throw new Error(`Parent "${parentId}" does not exist`);

  const nextElement: ElucimV2Element = {
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
  doc: ElucimV2Document,
  command: Extract<ElucimV2Command, { op: 'updateElement' }>,
): ElucimV2CommandResult {
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

function deleteElement(doc: ElucimV2Document, id: string): ElucimV2CommandResult {
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
  doc: ElucimV2Document,
  command: Extract<ElucimV2Command, { op: 'moveElement' }>,
): ElucimV2CommandResult {
  const element = doc.elements[command.id];
  if (!element) throw new Error(`Element "${command.id}" does not exist`);
  element.layout = { ...element.layout, ...command.layout };
  return { document: doc, changed: true, summary: `Moved element "${command.id}".` };
}

function reparentElement(
  doc: ElucimV2Document,
  command: Extract<ElucimV2Command, { op: 'reparentElement' }>,
): ElucimV2CommandResult {
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

function applyAnimationPreset(
  doc: ElucimV2Document,
  command: Extract<ElucimV2Command, { op: 'applyAnimationPreset' }>,
): ElucimV2CommandResult {
  const duration = command.duration ?? (command.preset === 'reveal' ? 45 : 20);
  for (const id of command.ids) {
    const element = doc.elements[id];
    if (!element) throw new Error(`Element "${id}" does not exist`);
    element.props = {
      ...element.props,
      ...(command.preset === 'intro' ? { fadeIn: duration } : {}),
      ...(command.preset === 'reveal' ? { draw: duration } : {}),
      ...(command.preset === 'outro' ? { fadeOut: duration } : {}),
    };
  }
  return { document: doc, changed: command.ids.length > 0, summary: `Applied "${command.preset}" preset to ${command.ids.length} element(s).` };
}

function upsertTimeline(doc: ElucimV2Document, timeline: ElucimV2Timeline): ElucimV2CommandResult {
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

function deleteTimelineCommand(doc: ElucimV2Document, id: string): ElucimV2CommandResult {
  if (!doc.timelines?.[id]) throw new Error(`Timeline "${id}" does not exist`);
  delete doc.timelines[id];
  return { document: doc, changed: true, summary: `Deleted timeline "${id}".` };
}

function insertChild(doc: ElucimV2Document, parentId: string | undefined, childId: string, index?: number) {
  const children = parentId ? (doc.elements[parentId].children ??= []) : doc.scene.children;
  const existingIndex = children.indexOf(childId);
  if (existingIndex >= 0) children.splice(existingIndex, 1);
  const insertAt = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
  children.splice(insertAt, 0, childId);
}

function removeFromParent(doc: ElucimV2Document, id: string) {
  const parentId = doc.elements[id]?.parentId;
  const siblings = parentId ? doc.elements[parentId]?.children : doc.scene.children;
  const index = siblings?.indexOf(id) ?? -1;
  if (index >= 0) siblings?.splice(index, 1);
}

function collectDescendants(doc: ElucimV2Document, id: string): Set<string> {
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

function cleanupTimelineReferences(doc: ElucimV2Document, deletedIds: Set<string>) {
  for (const timeline of Object.values(doc.timelines ?? {})) {
    timeline.tracks = timeline.tracks.filter(track => !deletedIds.has(track.target));
  }
}

function cloneDoc(doc: ElucimV2Document): ElucimV2Document {
  return JSON.parse(JSON.stringify(doc)) as ElucimV2Document;
}
