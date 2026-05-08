import type {
  ElucimV2AnimatableProperty,
  ElucimV2Element,
  ElucimV2Intent,
  ElucimV2Keyframe,
  ElucimV2Layout,
  ElucimV2Metadata,
  ElucimV2StateMachine,
  ElucimV2Timeline,
  ElucimV2TimelineTrack,
} from './v2/types';
import type { ElucimDocument } from './index';
import { applyCommand, type ElucimV2Command, type ElucimV2CommandResult } from './v2/commands';
import { applyNudge, suggestDocumentNudges, type ElucimDocumentNudge } from './v2/nudges';
import { inspectPolishHeuristics, type ElucimPolishHeuristicReport, type ElucimPolishReport } from './v2/polish';
import {
  createCardGridPreset,
  createConnectorPreset,
  createStepCardPreset,
  createTextBlockPreset,
  type ElucimCardGridPresetSpec,
  type ElucimConnectorPresetSpec,
  type ElucimStepCardPresetSpec,
  type ElucimTextBlockPresetSpec,
} from './v2/composites';
import {
  planSemanticLayout,
  suggestSemanticLayoutNudges,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
} from './v2/semanticLayout';
import { applyTimelineFrame } from './v2/timeline';
import {
  diffDocuments,
  summarizeDocument,
  validateForAgent,
  type ElucimV2AgentValidationResult,
  type ElucimV2DocumentSummary,
  type JsonPatchOperation,
} from './v2/services';
import { validateV2 } from './v2/validateV2';

export type AgentDocument = ElucimDocument;
export type AgentValidationResult = ElucimV2AgentValidationResult;
export type AgentDocumentSummary = ElucimV2DocumentSummary;
export type AgentMetadata = NonNullable<AgentDocument['metadata']>;
export type AgentIntent = NonNullable<AgentDocument['elements'][string]['intent']>;
export type AgentLayout = NonNullable<AgentDocument['elements'][string]['layout']>;
export type AgentAnimatableProperty = ElucimV2AnimatableProperty;
export type AgentKeyframe = ElucimV2Keyframe;
export type AgentNudge = ElucimDocumentNudge;

export type AgentOperationKind = 'author' | 'validate' | 'inspect' | 'polish' | 'layout';

export interface AgentOperationDescriptor {
  name: string;
  kind: AgentOperationKind;
  async: boolean;
  description: string;
}

const AGENT_OPERATION_CATALOG: readonly AgentOperationDescriptor[] = [
  { name: 'createDocument', kind: 'author', async: false, description: 'Create an empty normalized ElucimDocument with scene metadata and defaults.' },
  { name: 'addElement', kind: 'author', async: false, description: 'Add a stable-ID element with props, layout, role, and semantic intent.' },
  { name: 'createConnectorPreset', kind: 'author', async: false, description: 'Create an editable semantic connector from source/target bounds with optional label and ELK-readable flow intent.' },
  { name: 'createTextBlockPreset', kind: 'author', async: false, description: 'Create editable wrapped text as grouped text lines with stable IDs and readable sizing.' },
  { name: 'createStepCardPreset', kind: 'author', async: false, description: 'Create an editable step card group with title, body, optional index/status, token colors, and layout rank.' },
  { name: 'createCardGridPreset', kind: 'author', async: false, description: 'Create an editable grid of step cards with deterministic sizing, gutters, order, and semantic ranks.' },
  { name: 'updateElement', kind: 'author', async: false, description: 'Patch element props, layout, role, intent, parent, or children without mutating the document.' },
  { name: 'applyAgentCommands', kind: 'author', async: false, description: 'Apply a batch of high-level authoring commands and return summaries plus validation.' },
  { name: 'validateForAgent', kind: 'validate', async: false, description: 'Validate document structure and references with agent-readable errors and warnings.' },
  { name: 'evaluateSceneForAgent', kind: 'inspect', async: false, description: 'Return quality issues, polish diagnostics, summaries, and available deterministic nudges.' },
  { name: 'inspectSceneForAgent', kind: 'inspect', async: false, description: 'Sample rendered frames for visibility, occupancy, off-canvas, contrast, and animation issues.' },
  { name: 'inspectPolishHeuristics', kind: 'inspect', async: false, description: 'Return raw polish evidence: bounds, intersections, off-canvas overflow, text, colors, graph details, and semantic relationships.' },
  { name: 'suggestDocumentNudges', kind: 'polish', async: false, description: 'Return command-backed safe and review polish nudges for metadata, motion, readability, and graph layout.' },
  { name: 'suggestSemanticLayoutNudges', kind: 'layout', async: true, description: 'Use ELK to produce review-only layout nudges from semantic relationships and connector hints.' },
  { name: 'applyNudge', kind: 'polish', async: false, description: 'Apply a selected command-backed nudge and return the updated editable document.' },
] as const;

export interface AgentElementPatch {
  type?: string;
  props?: Record<string, unknown>;
  layout?: Partial<AgentLayout>;
  role?: string;
  intent?: Partial<AgentIntent>;
  parentId?: string;
  children?: string[];
}

export interface AgentEditResult {
  document: AgentDocument;
  changed: boolean;
  summary: string;
}

export type AgentScenePreset = 'card' | 'slide' | 'square';

export interface AgentSceneSpec {
  type?: 'scene' | 'player';
  preset?: AgentScenePreset;
  width?: number;
  height?: number;
  fps?: number;
  background?: string;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  metadata?: AgentMetadata;
}

export interface AgentElementSpec {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  layout?: AgentLayout;
  role?: string;
  intent?: AgentIntent;
  parentId?: string;
  index?: number;
  children?: string[];
}

export interface AgentElementOrderItem {
  id: string;
  parentId?: string;
  index: number;
  siblingCount: number;
  children: string[];
}

export interface AgentTimelineTrackSpec {
  target: string;
  property: AgentAnimatableProperty;
  keyframes: AgentKeyframe[];
}

export interface AgentTimelineSpec {
  id: string;
  duration: number;
  tracks: AgentTimelineTrackSpec[];
}

export type AgentRevealPreset = 'fadeIn' | 'fadeOut' | 'staggeredFadeIn' | 'draw' | 'pulse';

export interface AgentRevealTimelineSpec {
  id?: string;
  targets: string[];
  preset?: AgentRevealPreset;
  duration?: number;
  stagger?: number;
}

export interface AgentStateMachineSpec {
  id?: string;
  timelineId?: string;
  start?: 'onStart' | 'onClick' | 'onKey';
  key?: string;
  exitTo?: 'exit' | 'hold';
}

export type AgentCommand =
  | { op: 'addElement'; element: AgentElementSpec }
  | { op: 'updateElement'; id: string; patch: AgentElementPatch }
  | { op: 'moveElement'; id: string; layout: Partial<AgentLayout> }
  | { op: 'deleteElement'; id: string }
  | { op: 'reorderElement'; id: string; index: number }
  | { op: 'bringElementForward'; id: string }
  | { op: 'sendElementBackward'; id: string }
  | { op: 'bringElementToFront'; id: string }
  | { op: 'sendElementToBack'; id: string }
  | { op: 'reparentElement'; id: string; parentId?: string; index?: number }
  | { op: 'addTimeline'; timeline: AgentTimelineSpec }
  | { op: 'addRevealTimeline'; timeline: AgentRevealTimelineSpec }
  | { op: 'createStateMachine'; stateMachine: AgentStateMachineSpec }
  | { op: 'updateMetadata'; metadata: Partial<AgentMetadata> }
  | { op: 'applyNudge'; id: string };

export interface AgentCommandResult {
  document: AgentDocument;
  changed: boolean;
  summaries: string[];
  validation: AgentValidationResult;
}

export interface AgentQualityIssue {
  severity: 'info' | 'warning' | 'error';
  code:
    | 'invalid-document'
    | 'empty-scene'
    | 'missing-metadata'
    | 'missing-intent'
    | 'missing-timeline'
    | 'missing-state-machine'
    | 'missing-default-state-machine'
    | 'unthemed-colors'
    | 'large-scene';
  path: string;
  message: string;
  suggestions?: string[];
}

export interface AgentQualityReport {
  valid: boolean;
  score: number;
  issues: AgentQualityIssue[];
  validation: AgentValidationResult;
  summary?: AgentDocumentSummary;
  nudges: ElucimDocumentNudge[];
  polish?: ElucimPolishReport;
  heuristics?: ElucimPolishHeuristicReport;
}

export interface AgentTimelineTrackBounds {
  target: string;
  property: AgentAnimatableProperty;
  firstFrame: number;
  lastFrame: number;
  keyframeCount: number;
  exceedsDuration: boolean;
}

export interface AgentTimelineBounds {
  id: string;
  duration: number;
  firstFrame: number;
  lastFrame: number;
  trackCount: number;
  keyframeCount: number;
  exceedsDuration: boolean;
  tracks: AgentTimelineTrackBounds[];
}

export interface AgentTimelineBoundsReport {
  timelines: AgentTimelineBounds[];
  maxFrame: number;
  issues: Array<{ path: string; message: string; suggestedDuration?: number }>;
}

export interface AgentRepairResult {
  document: AgentDocument;
  changed: boolean;
  summaries: string[];
  validation: AgentValidationResult;
  diff: JsonPatchOperation[];
}

export interface AgentAnimationSample {
  frame: number;
  changedElements: string[];
  changedProperties: Array<{ target: string; property: string; before: unknown; after: unknown }>;
}

export interface AgentAnimationSampleReport {
  timelineId: string;
  frames: number[];
  animated: boolean;
  samples: AgentAnimationSample[];
}

export interface AgentSceneInspectionOptions {
  timelineId?: string;
  frames?: number[];
  minOccupancyRatio?: number;
  maxOccupancyRatio?: number;
}

export interface AgentElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AgentInspectedElement {
  id: string;
  type: string;
  visible: boolean;
  opacity: number;
  bounds?: AgentElementBounds;
  issues: AgentSceneInspectionIssue[];
}

export interface AgentSceneInspectionIssue {
  severity: 'info' | 'warning' | 'error';
  code:
    | 'invalid-document'
    | 'no-visible-elements'
    | 'tiny-scene'
    | 'crowded-scene'
    | 'off-canvas-elements'
    | 'zero-size-elements'
    | 'low-contrast-elements'
    | 'static-animation';
  path: string;
  message: string;
  suggestions?: string[];
}

export interface AgentSceneFrameInspection {
  frame: number;
  scene: { width: number; height: number };
  totalElementCount: number;
  visibleElementCount: number;
  occupiedArea: AgentElementBounds | null;
  occupancyRatio: number;
  elements: AgentInspectedElement[];
  issues: AgentSceneInspectionIssue[];
}

export interface AgentSceneInspectionReport {
  valid: boolean;
  score: number;
  timelineId?: string;
  frames: number[];
  animated: boolean;
  issues: AgentSceneInspectionIssue[];
  frameReports: AgentSceneFrameInspection[];
  animation?: AgentAnimationSampleReport;
  validation: AgentValidationResult;
}

export {
  applyNudge,
  diffDocuments,
  planSemanticLayout,
  createCardGridPreset,
  createConnectorPreset,
  createStepCardPreset,
  createTextBlockPreset,
  inspectPolishHeuristics,
  suggestDocumentNudges,
  suggestSemanticLayoutNudges,
  summarizeDocument,
  validateForAgent,
  type ElucimPolishHeuristicReport,
  type ElucimCardGridPresetSpec,
  type ElucimConnectorPresetSpec,
  type ElucimStepCardPresetSpec,
  type ElucimTextBlockPresetSpec,
  type ElucimSemanticLayoutOptions,
  type ElucimSemanticLayoutPlan,
  type JsonPatchOperation,
};

export function getAgentOperationCatalog(): readonly AgentOperationDescriptor[] {
  return AGENT_OPERATION_CATALOG;
}

export function createDocument(spec: AgentSceneSpec = {}): AgentDocument {
  return {
    version: '2.0',
    scene: {
      type: spec.type ?? 'player',
      preset: spec.preset,
      width: spec.width,
      height: spec.height,
      fps: spec.fps,
      background: spec.background ?? '$background',
      controls: spec.controls,
      loop: spec.loop,
      autoPlay: spec.autoPlay,
      children: [],
    },
    elements: {},
    metadata: spec.metadata,
  };
}

export function addElement(doc: AgentDocument, spec: AgentElementSpec): AgentEditResult {
  return toAgentEditResult(applyCommand(doc, {
    op: 'addElement',
    element: toElement(spec),
    parentId: spec.parentId,
    index: spec.index,
  }));
}

export function updateElement(
  doc: AgentDocument,
  id: string,
  patch: AgentElementPatch,
): AgentEditResult {
  return toAgentEditResult(applyCommand(doc, { op: 'updateElement', id, patch: patch as Partial<Omit<ElucimV2Element, 'id'>> }));
}

export function getElementOrder(doc: AgentDocument, id?: string): AgentElementOrderItem[] {
  const items: AgentElementOrderItem[] = [];
  const visit = (childIds: string[], parentId?: string) => {
    childIds.forEach((childId, index) => {
      const element = doc.elements[childId];
      if (!element) return;
      const item: AgentElementOrderItem = {
        id: childId,
        parentId,
        index,
        siblingCount: childIds.length,
        children: [...(element.children ?? [])],
      };
      if (!id || id === childId) items.push(item);
      visit(element.children ?? [], childId);
    });
  };
  visit(doc.scene.children);
  return items;
}

export function reorderElement(doc: AgentDocument, id: string, index: number): AgentEditResult {
  return toAgentEditResult(applyCommand(doc, { op: 'reorderElement', id, index }));
}

export function bringElementForward(doc: AgentDocument, id: string): AgentEditResult {
  const order = getRequiredElementOrder(doc, id);
  return reorderElement(doc, id, order.index + 1);
}

export function sendElementBackward(doc: AgentDocument, id: string): AgentEditResult {
  const order = getRequiredElementOrder(doc, id);
  return reorderElement(doc, id, order.index - 1);
}

export function bringElementToFront(doc: AgentDocument, id: string): AgentEditResult {
  const order = getRequiredElementOrder(doc, id);
  return reorderElement(doc, id, order.siblingCount - 1);
}

export function sendElementToBack(doc: AgentDocument, id: string): AgentEditResult {
  getRequiredElementOrder(doc, id);
  return reorderElement(doc, id, 0);
}

export function addTimeline(doc: AgentDocument, spec: AgentTimelineSpec): AgentEditResult {
  return toAgentEditResult(applyCommand(doc, { op: 'upsertTimeline', timeline: toTimeline(spec) }));
}

export function addRevealTimeline(doc: AgentDocument, spec: AgentRevealTimelineSpec): AgentEditResult {
  return addTimeline(doc, buildRevealTimeline(doc, spec));
}

export function createStateMachine(doc: AgentDocument, spec: AgentStateMachineSpec = {}): AgentEditResult {
  const timelineIds = Object.keys(doc.timelines ?? {});
  const timelineId = spec.timelineId ?? timelineIds[0];
  if (!timelineId || !doc.timelines?.[timelineId]) {
    throw new Error('createStateMachine requires an existing timeline. Add a timeline first or pass timelineId.');
  }

  const id = reserveId(spec.id ?? 'main', new Set(Object.keys(doc.stateMachines ?? {})));
  const stateId = reserveId(timelineId, new Set(['entry', 'any', 'exit']));
  const trigger = spec.start ?? 'onStart';
  const transitions = [
    {
      id: 'entry-start',
      from: 'entry' as const,
      to: stateId,
      trigger,
      ...(trigger === 'onKey' && spec.key ? { key: spec.key } : {}),
    },
    ...(spec.exitTo === 'exit'
      ? [{ id: `${stateId}-exit`, from: stateId, to: 'exit' as const, exitTime: 1 }]
      : []),
  ];
  const machine: ElucimV2StateMachine = {
    id,
    entry: stateId,
    states: { [stateId]: { timeline: timelineId } },
    transitions,
  };
  return {
    document: {
      ...doc,
      stateMachines: { ...doc.stateMachines, [id]: machine },
      defaultStateMachine: doc.defaultStateMachine ?? id,
    },
    changed: true,
    summary: `Added state machine "${id}".`,
  };
}

export function applyAgentCommand(doc: AgentDocument, command: AgentCommand): AgentEditResult {
  switch (command.op) {
    case 'addElement':
      return addElement(doc, command.element);
    case 'updateElement':
      return updateElement(doc, command.id, command.patch);
    case 'moveElement':
    case 'deleteElement':
    case 'reorderElement':
    case 'reparentElement':
    case 'updateMetadata':
      return toAgentEditResult(applyCommand(doc, command as ElucimV2Command));
    case 'bringElementForward':
      return bringElementForward(doc, command.id);
    case 'sendElementBackward':
      return sendElementBackward(doc, command.id);
    case 'bringElementToFront':
      return bringElementToFront(doc, command.id);
    case 'sendElementToBack':
      return sendElementToBack(doc, command.id);
    case 'addTimeline':
      return addTimeline(doc, command.timeline);
    case 'addRevealTimeline':
      return addRevealTimeline(doc, command.timeline);
    case 'createStateMachine':
      return createStateMachine(doc, command.stateMachine);
    case 'applyNudge': {
      const nudge = suggestDocumentNudges(doc).find(candidate => candidate.id === command.id);
      if (!nudge) throw new Error(`Nudge "${command.id}" is not available for this document`);
      const result = applyNudge(doc, nudge);
      return {
        document: result.document,
        changed: result.summaries.length > 0,
        summary: result.summaries.join(' '),
      };
    }
  }
}

export function applyAgentCommands(doc: AgentDocument, commands: AgentCommand[]): AgentCommandResult {
  let current = doc;
  const summaries: string[] = [];
  let changed = false;
  for (const command of commands) {
    const result = applyAgentCommand(current, command);
    current = result.document;
    changed ||= result.changed;
    summaries.push(result.summary);
  }
  return {
    document: current,
    changed,
    summaries,
    validation: validateForAgent(current),
  };
}

export function evaluateSceneForAgent(doc: AgentDocument): AgentQualityReport {
  const validation = validateForAgent(doc);
  const issues: AgentQualityIssue[] = validation.errors.map(error => ({
    severity: error.severity,
    code: 'invalid-document',
    path: error.path,
    message: error.message,
  }));

  const elementIds = Object.keys(doc.elements ?? {});
  if (elementIds.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'empty-scene',
      path: 'elements',
      message: 'The document has no elements.',
      suggestions: ['Add a title and at least one explanatory visual element.'],
    });
  }
  if (!doc.metadata?.title && !doc.metadata?.intent) {
    issues.push({
      severity: 'info',
      code: 'missing-metadata',
      path: 'metadata',
      message: 'Add metadata.title or metadata.intent so hosts and agents can understand the scene purpose.',
    });
  }
  const elementsWithoutIntent = Object.values(doc.elements ?? {}).filter(element => !element.intent && !element.role);
  if (elementIds.length > 0 && elementsWithoutIntent.length / elementIds.length > 0.5) {
    issues.push({
      severity: 'info',
      code: 'missing-intent',
      path: 'elements',
      message: 'Most elements do not describe their semantic role or intent.',
      suggestions: elementsWithoutIntent.slice(0, 5).map(element => element.id),
    });
  }
  if (!doc.timelines || Object.keys(doc.timelines).length === 0) {
    issues.push({
      severity: 'info',
      code: 'missing-timeline',
      path: 'timelines',
      message: 'No timelines are defined. Add explicit timelines for generated motion.',
    });
  }
  if (doc.timelines && Object.keys(doc.timelines).length > 0 && (!doc.stateMachines || Object.keys(doc.stateMachines).length === 0)) {
    issues.push({
      severity: 'info',
      code: 'missing-state-machine',
      path: 'stateMachines',
      message: 'Timelines exist without a state machine. Add a default state machine for viewer playback.',
    });
  }
  if (doc.stateMachines && Object.keys(doc.stateMachines).length > 0 && !doc.defaultStateMachine) {
    issues.push({
      severity: 'warning',
      code: 'missing-default-state-machine',
      path: 'defaultStateMachine',
      message: 'State machines exist but no defaultStateMachine is set.',
      suggestions: Object.keys(doc.stateMachines),
    });
  }
  const unthemed = findUnthemedColorElements(doc);
  if (unthemed.length > Math.max(3, elementIds.length / 2)) {
    issues.push({
      severity: 'info',
      code: 'unthemed-colors',
      path: 'elements',
      message: 'Many elements use literal colors. Prefer semantic tokens for theme-aware generated scenes.',
      suggestions: unthemed.slice(0, 5),
    });
  }
  if (elementIds.length > 40) {
    issues.push({
      severity: 'info',
      code: 'large-scene',
      path: 'elements',
      message: 'The scene has many elements. Consider grouping or splitting dense explanations into multiple host-managed scenes.',
    });
  }

  const errorPenalty = issues.filter(issue => issue.severity === 'error').length * 25;
  const warningPenalty = issues.filter(issue => issue.severity === 'warning').length * 12;
  const infoPenalty = issues.filter(issue => issue.severity === 'info').length * 5;
  const heuristics = validation.valid ? inspectPolishHeuristics(doc) : undefined;
  return {
    valid: validation.valid,
    score: Math.max(0, 100 - errorPenalty - warningPenalty - infoPenalty),
    issues,
    validation,
    summary: validation.valid ? summarizeDocument(doc) : undefined,
    polish: heuristics ? { score: heuristics.score, diagnostics: heuristics.diagnostics } : undefined,
    heuristics,
    nudges: validation.valid ? suggestDocumentNudges(doc) : [],
  };
}

export function getTimelineBounds(doc: AgentDocument): AgentTimelineBoundsReport {
  const timelines = Object.entries(doc.timelines ?? {}).map(([id, timeline]) => {
    const tracks = timeline.tracks.map((track): AgentTimelineTrackBounds => {
      const frames = track.keyframes.map(keyframe => keyframe.frame);
      const firstFrame = frames.length > 0 ? Math.min(...frames) : 0;
      const lastFrame = frames.length > 0 ? Math.max(...frames) : 0;
      return {
        target: track.target,
        property: track.property,
        firstFrame,
        lastFrame,
        keyframeCount: track.keyframes.length,
        exceedsDuration: lastFrame > timeline.duration,
      };
    });
    const firstFrame = tracks.length > 0 ? Math.min(...tracks.map(track => track.firstFrame)) : 0;
    const lastFrame = tracks.length > 0 ? Math.max(...tracks.map(track => track.lastFrame)) : 0;
    return {
      id,
      duration: timeline.duration,
      firstFrame,
      lastFrame,
      trackCount: timeline.tracks.length,
      keyframeCount: tracks.reduce((sum, track) => sum + track.keyframeCount, 0),
      exceedsDuration: lastFrame > timeline.duration,
      tracks,
    };
  });
  return {
    timelines,
    maxFrame: timelines.length > 0 ? Math.max(...timelines.map(timeline => timeline.lastFrame)) : 0,
    issues: timelines
      .filter(timeline => timeline.exceedsDuration)
      .map(timeline => ({
        path: `timelines.${timeline.id}.duration`,
        message: `Timeline "${timeline.id}" duration ${timeline.duration} is shorter than its last keyframe ${timeline.lastFrame}.`,
        suggestedDuration: timeline.lastFrame,
      })),
  };
}

export function repairDocumentForAgent(doc: AgentDocument): AgentRepairResult {
  const before = cloneDocument(doc);
  const next = cloneDocument(doc);
  const summaries: string[] = [];
  for (const timeline of getTimelineBounds(next).timelines) {
    if (!timeline.exceedsDuration || !next.timelines?.[timeline.id]) continue;
    next.timelines[timeline.id] = {
      ...next.timelines[timeline.id],
      duration: timeline.lastFrame,
    };
    summaries.push(`Extended timeline "${timeline.id}" duration from ${timeline.duration} to ${timeline.lastFrame}.`);
  }

  return {
    document: next,
    changed: summaries.length > 0,
    summaries,
    validation: validateForAgent(next),
    diff: diffDocuments(before, next),
  };
}

export function sampleAnimationForAgent(
  doc: AgentDocument,
  timelineId?: string,
  frames?: number[],
): AgentAnimationSampleReport {
  const id = timelineId ?? Object.keys(doc.timelines ?? {})[0];
  if (!id || !doc.timelines?.[id]) throw new Error('sampleAnimationForAgent requires an existing timeline.');
  const timeline = doc.timelines[id];
  const sampleFrames = frames ?? uniqueSortedFrames([0, Math.round(timeline.duration / 2), timeline.duration]);
  const baseline = applyTimelineFrame(doc, id, sampleFrames[0]);
  const samples = sampleFrames.map((frame): AgentAnimationSample => {
    const sampled = applyTimelineFrame(doc, id, frame);
    const changedProperties = diffElementProperties(baseline, sampled);
    return {
      frame,
      changedElements: [...new Set(changedProperties.map(change => change.target))],
      changedProperties,
    };
  });
  return {
    timelineId: id,
    frames: sampleFrames,
    animated: samples.some(sample => sample.changedProperties.length > 0),
    samples,
  };
}

export function createLoopingStateMachine(doc: AgentDocument, spec: AgentStateMachineSpec = {}): AgentEditResult {
  const result = createStateMachine(doc, { ...spec, start: spec.start ?? 'onStart' });
  return {
    ...result,
    document: {
      ...result.document,
      scene: { ...result.document.scene, loop: true },
    },
    summary: `${result.summary} Enabled scene loop playback.`,
  };
}

export function inspectSceneForAgent(
  doc: AgentDocument,
  options: AgentSceneInspectionOptions = {},
): AgentSceneInspectionReport {
  const validation = validateForAgent(doc);
  const scene = resolveSceneSize(doc);
  const timelineId = options.timelineId ?? Object.keys(doc.timelines ?? {})[0];
  const timeline = timelineId ? doc.timelines?.[timelineId] : undefined;
  const frames = options.frames
    ? uniqueSortedFrames(options.frames)
    : timeline
      ? uniqueSortedFrames([0, Math.round(timeline.duration / 2), timeline.duration])
      : [0];
  const animation = timelineId && timeline ? sampleAnimationForAgent(doc, timelineId, frames) : undefined;
  const minOccupancyRatio = options.minOccupancyRatio ?? 0.08;
  const maxOccupancyRatio = options.maxOccupancyRatio ?? 0.92;
  const frameReports = frames.map((frame): AgentSceneFrameInspection => {
    const sampled = timelineId && timeline ? applyTimelineFrame(doc, timelineId, frame) : doc;
    return inspectFrame(sampled, frame, scene, minOccupancyRatio, maxOccupancyRatio);
  });
  const issues: AgentSceneInspectionIssue[] = [
    ...validation.errors.map((error): AgentSceneInspectionIssue => ({
      severity: error.severity,
      code: 'invalid-document',
      path: error.path,
      message: error.message,
    })),
    ...dedupeInspectionIssues(frameReports.flatMap(report => report.issues)),
  ];
  if (animation && !animation.animated && frames.length > 1) {
    issues.push({
      severity: 'warning',
      code: 'static-animation',
      path: timelineId ? `timelines.${timelineId}` : 'timelines',
      message: 'Sampled frames did not change any element properties.',
      suggestions: ['Add keyframes that change opacity, position, scale, rotation, fill, or stroke.'],
    });
  }

  const errorPenalty = issues.filter(issue => issue.severity === 'error').length * 30;
  const warningPenalty = issues.filter(issue => issue.severity === 'warning').length * 12;
  const infoPenalty = issues.filter(issue => issue.severity === 'info').length * 5;
  return {
    valid: validation.valid && !issues.some(issue => issue.severity === 'error'),
    score: Math.max(0, 100 - errorPenalty - warningPenalty - infoPenalty),
    timelineId: timelineId && timeline ? timelineId : undefined,
    frames,
    animated: animation?.animated ?? false,
    issues,
    frameReports,
    animation,
    validation,
  };
}

function toElement(spec: AgentElementSpec): ElucimV2Element {
  return {
    id: spec.id,
    type: spec.type,
    parentId: spec.parentId,
    children: spec.children ? [...spec.children] : undefined,
    role: spec.role,
    intent: spec.intent,
    layout: spec.layout ? { ...spec.layout } : undefined,
    props: { type: spec.type, ...spec.props },
  };
}

function toAgentEditResult(result: ElucimV2CommandResult): AgentEditResult {
  return {
    document: result.document,
    changed: result.changed,
    summary: result.summary,
  };
}

function toTimeline(spec: AgentTimelineSpec): ElucimV2Timeline {
  return {
    id: spec.id,
    duration: spec.duration,
    tracks: spec.tracks.map(track => ({
      target: track.target,
      property: track.property,
      keyframes: track.keyframes.map(keyframe => ({ ...keyframe })),
    })),
  };
}

function getRequiredElementOrder(doc: AgentDocument, id: string): AgentElementOrderItem {
  const order = getElementOrder(doc, id)[0];
  if (!order) throw new Error(`Element "${id}" does not exist`);
  return order;
}

function buildRevealTimeline(doc: AgentDocument, spec: AgentRevealTimelineSpec): AgentTimelineSpec {
  const targets = spec.targets.filter(target => doc.elements[target]);
  if (targets.length === 0) throw new Error('addRevealTimeline requires at least one existing target');
  const preset = spec.preset ?? 'staggeredFadeIn';
  const duration = spec.duration ?? (preset === 'pulse' ? 60 : 45);
  const stagger = spec.stagger ?? (preset === 'staggeredFadeIn' ? 6 : 0);
  const fadeDuration = Math.max(1, duration - Math.max(0, targets.length - 1) * stagger);
  return {
    id: spec.id ?? reserveId('intro', new Set(Object.keys(doc.timelines ?? {}))),
    duration,
    tracks: targets.flatMap((target, index): ElucimV2TimelineTrack[] => {
      const start = Math.min(index * stagger, Math.max(0, duration - 1));
      const end = Math.min(duration, start + fadeDuration);
      if (preset === 'draw') return [track(target, 'opacity', [{ frame: start, value: 0 }, { frame: end, value: 1, easing: 'easeOutCubic' }])];
      if (preset === 'fadeOut') return [track(target, 'opacity', [{ frame: start, value: 1 }, { frame: end, value: 0, easing: 'easeOutCubic' }])];
      if (preset === 'pulse') {
        return [
          track(target, 'scale', [{ frame: 0, value: 1 }, { frame: Math.round(duration / 2), value: 1.08, easing: 'easeOutCubic' }, { frame: duration, value: 1 }]),
        ];
      }
      return [track(target, 'opacity', [{ frame: start, value: 0 }, { frame: end, value: 1, easing: 'easeOutCubic' }])];
    }),
  };
}

function track(target: string, property: ElucimV2AnimatableProperty, keyframes: ElucimV2Keyframe[]): ElucimV2TimelineTrack {
  return { target, property, keyframes };
}

function reserveId(base: string, used: Set<string>): string {
  let id = sanitizeId(base);
  if (!used.has(id)) return id;
  let suffix = 2;
  while (used.has(`${id}-${suffix}`)) suffix++;
  return `${id}-${suffix}`;
}

function sanitizeId(value: string): string {
  const id = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return id || 'item';
}

function findUnthemedColorElements(doc: AgentDocument): string[] {
  const colorKeys = new Set(['fill', 'stroke', 'color', 'background', 'barColor', 'labelColor', 'edgeColor', 'nodeColor']);
  const ids: string[] = [];
  for (const element of Object.values(doc.elements ?? {})) {
    if (Object.entries(element.props).some(([key, value]) => colorKeys.has(key) && isLiteralColor(value))) ids.push(element.id);
  }
  return ids;
}

function isLiteralColor(value: unknown): boolean {
  return typeof value === 'string'
    && !value.startsWith('$')
    && !value.startsWith('var(')
    && (/^#(?:[0-9a-f]{3}){1,2}$/i.test(value) || /^rgb/i.test(value));
}

function cloneDocument(doc: AgentDocument): AgentDocument {
  return JSON.parse(JSON.stringify(doc)) as AgentDocument;
}

function uniqueSortedFrames(frames: number[]): number[] {
  return [...new Set(frames.map(frame => Math.max(0, Math.round(frame))))].sort((a, b) => a - b);
}

function diffElementProperties(before: AgentDocument, after: AgentDocument): AgentAnimationSample['changedProperties'] {
  const changes: AgentAnimationSample['changedProperties'] = [];
  for (const [target, element] of Object.entries(after.elements ?? {})) {
    const previous = before.elements[target];
    if (!previous) continue;
    for (const [property, value] of Object.entries(element.props ?? {})) {
      const beforeValue = previous.props?.[property];
      if (!isSameValue(beforeValue, value)) {
        changes.push({ target, property, before: beforeValue, after: value });
      }
    }
    for (const [property, value] of Object.entries(element.layout ?? {})) {
      const beforeValue = previous.layout?.[property as keyof AgentLayout];
      if (!isSameValue(beforeValue, value)) {
        changes.push({ target, property, before: beforeValue, after: value });
      }
    }
  }
  return changes;
}

function isSameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function inspectFrame(
  doc: AgentDocument,
  frame: number,
  scene: { width: number; height: number },
  minOccupancyRatio: number,
  maxOccupancyRatio: number,
): AgentSceneFrameInspection {
  const elements = Object.values(doc.elements ?? {}).map(element => inspectElement(element, scene, doc.scene.background));
  const visibleInScene = elements.filter(element => element.visible && element.bounds && intersectsScene(element.bounds, scene));
  const occupiedArea = unionBounds(visibleInScene.map(element => element.bounds).filter(isBounds));
  const occupancyRatio = occupiedArea ? (occupiedArea.width * occupiedArea.height) / (scene.width * scene.height) : 0;
  const issues: AgentSceneInspectionIssue[] = [];
  if (visibleInScene.length === 0 && elements.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'no-visible-elements',
      path: `frames.${frame}`,
      message: `Frame ${frame} has elements but none are visible.`,
      suggestions: ['Check opacity, visibility, zero-size geometry, and timeline keyframes.'],
    });
  }
  if (visibleInScene.length > 0 && occupancyRatio < minOccupancyRatio) {
    issues.push({
      severity: 'warning',
      code: 'tiny-scene',
      path: `frames.${frame}`,
      message: `Frame ${frame} uses only ${(occupancyRatio * 100).toFixed(1)}% of the scene bounds.`,
      suggestions: ['Scale up the main elements or spread the explanation across more of the viewport.'],
    });
  }
  if (occupancyRatio > maxOccupancyRatio) {
    issues.push({
      severity: 'info',
      code: 'crowded-scene',
      path: `frames.${frame}`,
      message: `Frame ${frame} fills ${(occupancyRatio * 100).toFixed(1)}% of the scene bounds.`,
      suggestions: ['Add margins, reduce element sizes, or split dense content into stages.'],
    });
  }
  const offCanvas = elements.filter(element => isPotentiallyVisible(element) && element.bounds && !intersectsScene(element.bounds, scene));
  if (offCanvas.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'off-canvas-elements',
      path: `frames.${frame}`,
      message: `Frame ${frame} has visible elements outside the scene bounds.`,
      suggestions: offCanvas.map(element => element.id),
    });
  }
  const zeroSize = elements.filter(element => element.issues.some(issue => issue.code === 'zero-size-elements'));
  if (zeroSize.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'zero-size-elements',
      path: `frames.${frame}`,
      message: `Frame ${frame} has elements with no measurable bounds.`,
      suggestions: zeroSize.map(element => element.id),
    });
  }
  const lowContrast = elements.filter(element => element.issues.some(issue => issue.code === 'low-contrast-elements'));
  if (lowContrast.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'low-contrast-elements',
      path: `frames.${frame}`,
      message: `Frame ${frame} has text-like elements with low literal color contrast.`,
      suggestions: lowContrast.map(element => element.id),
    });
  }

  return {
    frame,
    scene,
    totalElementCount: elements.length,
    visibleElementCount: visibleInScene.length,
    occupiedArea,
    occupancyRatio,
    elements,
    issues,
  };
}

function inspectElement(
  element: ElucimV2Element,
  scene: { width: number; height: number },
  background?: string,
): AgentInspectedElement {
  const opacity = readOpacity(element);
  const bounds = estimateElementBounds(element);
  const issues: AgentSceneInspectionIssue[] = [];
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    issues.push({
      severity: 'warning',
      code: 'zero-size-elements',
      path: `elements.${element.id}`,
      message: `Element "${element.id}" has no measurable bounds.`,
    });
  }
  if (bounds && readString(element.props.fill) && element.type === 'text') {
    const contrast = contrastRatio(readString(element.props.fill), background);
    if (contrast !== undefined && contrast < 3) {
      issues.push({
        severity: 'warning',
        code: 'low-contrast-elements',
        path: `elements.${element.id}.props.fill`,
        message: `Element "${element.id}" has low contrast against the scene background.`,
      });
    }
  }
  const visible = opacity > 0.01
    && element.props.visible !== false
    && element.props.display !== 'none'
    && element.props.visibility !== 'hidden'
    && !!bounds
    && bounds.width > 0
    && bounds.height > 0
    && intersectsScene(bounds, scene);
  return {
    id: element.id,
    type: element.type,
    visible,
    opacity,
    bounds,
    issues,
  };
}

function resolveSceneSize(doc: AgentDocument): { width: number; height: number } {
  if (typeof doc.scene.width === 'number' && typeof doc.scene.height === 'number') {
    return { width: doc.scene.width, height: doc.scene.height };
  }
  if (doc.scene.preset === 'card') return { width: 640, height: 360 };
  if (doc.scene.preset === 'square') return { width: 600, height: 600 };
  if (doc.scene.preset === 'slide') return { width: 1280, height: 720 };
  return { width: doc.scene.width ?? 800, height: doc.scene.height ?? 600 };
}

function estimateElementBounds(element: ElucimV2Element): AgentElementBounds | undefined {
  const props = element.props;
  const layout = element.layout;
  const translate = readNumberTuple(layout?.translate) ?? [0, 0];
  const layoutX = readNumber(layout?.x) ?? 0;
  const layoutY = readNumber(layout?.y) ?? 0;
  const offsetX = layoutX + translate[0];
  const offsetY = layoutY + translate[1];
  const strokeWidth = Math.max(1, readNumber(props.strokeWidth) ?? 1);

  if (element.type === 'line' || element.type === 'arrow' || element.type === 'vector') {
    const x1 = offsetX + (readNumber(props.x1) ?? 0);
    const y1 = offsetY + (readNumber(props.y1) ?? 0);
    const x2 = offsetX + (readNumber(props.x2) ?? readNumber(props.x) ?? 0);
    const y2 = offsetY + (readNumber(props.y2) ?? readNumber(props.y) ?? 0);
    return normalizeBounds({
      x: Math.min(x1, x2) - strokeWidth,
      y: Math.min(y1, y2) - strokeWidth,
      width: Math.abs(x2 - x1) + strokeWidth * 2,
      height: Math.abs(y2 - y1) + strokeWidth * 2,
    });
  }

  if (element.type === 'circle') {
    const radius = readNumber(props.r) ?? readNumber(props.radius) ?? readNumber(layout?.width) ?? 0;
    const cx = offsetX + (readNumber(props.cx) ?? readNumber(props.x) ?? radius);
    const cy = offsetY + (readNumber(props.cy) ?? readNumber(props.y) ?? radius);
    return normalizeBounds({ x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2 });
  }

  if (element.type === 'ellipse') {
    const rx = readNumber(props.rx) ?? (readNumber(layout?.width) ?? 0) / 2;
    const ry = readNumber(props.ry) ?? (readNumber(layout?.height) ?? 0) / 2;
    const cx = offsetX + (readNumber(props.cx) ?? readNumber(props.x) ?? rx);
    const cy = offsetY + (readNumber(props.cy) ?? readNumber(props.y) ?? ry);
    return normalizeBounds({ x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 });
  }

  if (element.type === 'text' || element.type === 'latex') {
    const content = readString(props.content) ?? readString(props.text) ?? readString(props.latex) ?? '';
    const fontSize = readNumber(props.fontSize) ?? 16;
    const width = readNumber(props.width) ?? readNumber(layout?.width) ?? Math.max(fontSize, content.length * fontSize * 0.55);
    const height = readNumber(props.height) ?? readNumber(layout?.height) ?? fontSize * 1.2;
    const x = offsetX + (readNumber(props.x) ?? 0);
    const y = offsetY + (readNumber(props.y) ?? 0);
    return normalizeBounds({ x, y: y - height * 0.8, width, height });
  }

  const points = readPoints(props.points);
  if (points.length > 0) {
    const xs = points.map(point => offsetX + point[0]);
    const ys = points.map(point => offsetY + point[1]);
    return normalizeBounds({
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    });
  }

  const x = offsetX + (readNumber(props.x) ?? 0);
  const y = offsetY + (readNumber(props.y) ?? 0);
  const width = readNumber(props.width) ?? readNumber(layout?.width);
  const height = readNumber(props.height) ?? readNumber(layout?.height);
  if (width === undefined || height === undefined) return undefined;
  return normalizeBounds({ x, y, width, height });
}

function readOpacity(element: ElucimV2Element): number {
  const opacity = readNumber(element.props.opacity) ?? 1;
  const fillOpacity = readNumber(element.props.fillOpacity) ?? 1;
  const strokeOpacity = readNumber(element.props.strokeOpacity) ?? 1;
  return Math.max(0, Math.min(1, opacity * Math.max(fillOpacity, strokeOpacity)));
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumberTuple(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x = readNumber(value[0]);
  const y = readNumber(value[1]);
  return x === undefined || y === undefined ? undefined : [x, y];
}

function readPoints(value: unknown): Array<[number, number]> {
  if (Array.isArray(value)) {
    return value.flatMap(point => {
      const tuple = readNumberTuple(point);
      return tuple ? [tuple] : [];
    });
  }
  if (typeof value !== 'string') return [];
  const numbers = value.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const points: Array<[number, number]> = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
}

function normalizeBounds(bounds: AgentElementBounds): AgentElementBounds | undefined {
  const width = Math.abs(bounds.width);
  const height = Math.abs(bounds.height);
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return undefined;
  }
  return { x: bounds.width < 0 ? bounds.x + bounds.width : bounds.x, y: bounds.height < 0 ? bounds.y + bounds.height : bounds.y, width, height };
}

function unionBounds(bounds: AgentElementBounds[]): AgentElementBounds | null {
  if (bounds.length === 0) return null;
  const minX = Math.min(...bounds.map(bound => bound.x));
  const minY = Math.min(...bounds.map(bound => bound.y));
  const maxX = Math.max(...bounds.map(bound => bound.x + bound.width));
  const maxY = Math.max(...bounds.map(bound => bound.y + bound.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function intersectsScene(bounds: AgentElementBounds, scene: { width: number; height: number }): boolean {
  return bounds.x + bounds.width >= 0
    && bounds.y + bounds.height >= 0
    && bounds.x <= scene.width
    && bounds.y <= scene.height;
}

function isBounds(value: AgentElementBounds | undefined): value is AgentElementBounds {
  return value !== undefined;
}

function isPotentiallyVisible(element: AgentInspectedElement): boolean {
  return element.opacity > 0.01 && !!element.bounds && element.bounds.width > 0 && element.bounds.height > 0;
}

function contrastRatio(foreground?: string, background?: string): number | undefined {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) return undefined;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(value?: string): [number, number, number] | undefined {
  if (!value || value.startsWith('$') || value.startsWith('var(')) return undefined;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return undefined;
  const hex = match[1].length === 3
    ? match[1].split('').map(character => `${character}${character}`).join('')
    : match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function dedupeInspectionIssues(issues: AgentSceneInspectionIssue[]): AgentSceneInspectionIssue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.code}:${issue.path}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
