import type { ElucimDocument, ElucimStateMachine, ElucimTimeline, RenderableDocument } from '@elucim/dsl';
import { migrateV1ToV2, migrateV2ToV1, validate, validateDocument } from '@elucim/dsl';

export interface RestoredEditorDocument {
  document: ElucimDocument;
  warnings: string[];
}

/**
 * Returns the renderable tree consumed by the current editor reducer.
 * Canonical Elucim Documents are validated first, then adapted for editing.
 */
export function normalizeInitialDocument(document: RenderableDocument | ElucimDocument | undefined): RenderableDocument | undefined {
  if (!document || document.version === '1.0') return document;
  const result = validate(document);
  if (!result.valid) {
    throw new Error(`Invalid editor document: ${result.errors.map(error => `${error.path}: ${error.message}`).join('; ')}`);
  }
  return migrateV2ToV1(document);
}

export function createDocumentFromEditorState(doc: RenderableDocument): ElucimDocument {
  return migrateV1ToV2(doc);
}

export function restoreDocumentFromEditorState(doc: RenderableDocument, sourceDocument: ElucimDocument): RestoredEditorDocument {
  if (sourceDocument.version !== '2.0') {
    throw new Error('restoreDocumentFromEditorState requires a canonical Elucim Document source.');
  }
  const migrated = migrateV1ToV2(doc);
  const idMap = mapSourceIdsToRestoredIds(sourceDocument, migrated);
  // Collision guards in mapSourceIdsToRestoredIds keep restored IDs unique.
  const reverseIdMap = new Map([...idMap.entries()].map(([sourceId, migratedId]) => [migratedId, sourceId]));
  for (const [id, element] of Object.entries(migrated.elements)) {
    const sourceElement = sourceDocument.elements[reverseIdMap.get(id) ?? id];
    if (sourceElement) {
      migrated.elements[id] = {
        ...element,
        layout: sourceElement.layout || element.layout
          ? { ...sourceElement.layout, ...element.layout }
          : element.layout,
        role: sourceElement.role ?? element.role,
        intent: sourceElement.intent ? { ...sourceElement.intent, ...element.intent } : element.intent,
      };
    }
  }
  const elementIds = new Set(Object.keys(migrated.elements));
  const warnings: string[] = [];
  for (const sourceId of Object.keys(sourceDocument.elements)) {
    const mappedId = idMap.get(sourceId);
    if (!mappedId) {
      warnings.push(`Element "${sourceId}" is no longer present in editor output; related references may be pruned.`);
    } else if (mappedId !== sourceId) {
      warnings.push(`Element "${sourceId}" was renamed to "${mappedId}"; timeline references were updated.`);
    }
  }
  const timelines: Record<string, ElucimTimeline> = {};
  for (const [id, timeline] of Object.entries(sourceDocument.timelines ?? {})) {
    const tracks = timeline.tracks
      .map(track => ({ ...track, target: idMap.get(track.target) ?? track.target }))
      .filter(track => elementIds.has(track.target));
    if (tracks.length < timeline.tracks.length) {
      warnings.push(`Timeline "${id}" has ${timeline.tracks.length - tracks.length} track(s) targeting missing elements and will be omitted from document output.`);
    }
    if (tracks.length > 0) timelines[id] = { ...timeline, tracks };
  }
  const timelineIds = new Set(Object.keys(timelines));
  const stateMachines: Record<string, ElucimStateMachine> = {};
  for (const [id, machine] of Object.entries(sourceDocument.stateMachines ?? {})) {
    stateMachines[id] = {
      ...machine,
      states: Object.fromEntries(
        Object.entries(machine.states).map(([stateId, state]) => {
          const nextState = { ...state };
          if (nextState.timeline && !timelineIds.has(nextState.timeline)) {
            warnings.push(`State "${stateId}" in machine "${id}" references missing timeline "${nextState.timeline}" and will lose that timeline link.`);
            nextState.timeline = undefined;
          }
          return [stateId, nextState];
        }),
      ),
      transitions: machine.transitions,
    };
  }
  const document = {
    ...migrated,
    metadata: { ...migrated.metadata, ...sourceDocument.metadata },
    ...(Object.keys(timelines).length > 0 ? { timelines } : {}),
    ...(Object.keys(stateMachines).length > 0 ? { stateMachines } : {}),
    ...(sourceDocument.defaultStateMachine && stateMachines[sourceDocument.defaultStateMachine]
      ? { defaultStateMachine: sourceDocument.defaultStateMachine }
      : {}),
  };
  const validation = validateDocument(document);
  for (const error of validation.errors) {
    warnings.push(`Document output ${error.severity}: ${error.path}: ${error.message}`);
  }
  return { document, warnings };
}

export function mapSourceIdsToRestoredIds(sourceDocument: ElucimDocument, restoredDocument: ElucimDocument): Map<string, string> {
  const idMap = new Map<string, string>();
  const visit = (sourceIds: string[], restoredIds: string[]) => {
    const count = Math.min(sourceIds.length, restoredIds.length);
    for (let index = 0; index < count; index += 1) {
      const sourceId = sourceIds[index];
      const restoredId = restoredIds[index];
      const sourceElement = sourceDocument.elements[sourceId];
      const restoredElement = restoredDocument.elements[restoredId];
      if (!sourceElement || !restoredElement) continue;
      if (sourceId !== restoredId && sourceDocument.elements[restoredId]) {
        continue;
      }
      idMap.set(sourceId, restoredId);
      visit(sourceElement.children ?? [], restoredElement.children ?? []);
    }
  };
  visit(sourceDocument.scene.children, restoredDocument.scene.children);
  for (const id of Object.keys(sourceDocument.elements)) {
    if (!idMap.has(id) && restoredDocument.elements[id]) idMap.set(id, id);
  }
  return idMap;
}
