import React, { useMemo } from 'react';
import { DslRenderer, type DslRendererProps } from './renderer/DslRenderer';
import type {
  ElucimDocument,
  ElucimElement,
  ElucimIntent,
  ElucimLayout,
  ElucimMetadata,
  ElucimState,
  ElucimStateMachineInput,
  ElucimTimeline,
} from './documentModel/types';
import { validateDocument } from './documentModel/validateDocument';

type CanonicalKind = 'element' | 'timeline' | 'track' | 'reveal' | 'state-machine' | 'state' | 'transition';

interface CanonicalMarker<P> extends React.FC<P> {
  canonicalKind: CanonicalKind;
}

function marker<P>(canonicalKind: CanonicalKind): CanonicalMarker<P> {
  const Component = (() => null) as unknown as CanonicalMarker<P>;
  Component.canonicalKind = canonicalKind;
  return Component;
}

export interface CanonicalElementProps {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  layout?: ElucimLayout;
  intent?: ElucimIntent;
  role?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export interface CanonicalTextProps extends Omit<CanonicalElementProps, 'type' | 'children'> {
  children?: string;
  content?: string;
}

export interface CanonicalGroupProps extends Omit<CanonicalElementProps, 'type'> {
  children?: React.ReactNode;
}

export interface CanonicalTimelineProps {
  id: string;
  duration: number;
  camera?: ElucimTimeline['camera'];
  children?: React.ReactNode;
}

export interface CanonicalTrackProps {
  target: string;
  property: ElucimTimeline['tracks'][number]['property'];
  keyframes: ElucimTimeline['tracks'][number]['keyframes'];
}

export interface CanonicalRevealProps {
  id: string;
  target?: string;
  targets?: string[];
  from: number;
  duration: number;
  strategy?: 'auto' | 'type' | 'fade';
  staggerInFrames?: number;
  cursor?: boolean | { character?: string; blinkEveryFrames?: number; hideWhenComplete?: boolean };
}

export interface CanonicalStateMachineProps {
  id: string;
  entry: string;
  inputs?: Record<string, ElucimStateMachineInput>;
  children?: React.ReactNode;
}

export interface CanonicalStateProps extends ElucimState {
  id: string;
}

export interface CanonicalTransitionProps {
  id: string;
  from: string | 'entry' | 'any';
  to: string | 'entry' | 'exit';
  trigger?: string;
  key?: string;
  exitTime?: number;
}

/**
 * Declares a canonical element. Use named primitives such as `Text` and
 * `Group` where available, or this component for any DSL element type.
 */
export const Element = marker<CanonicalElementProps>('element');

/** Declares a canonical text element. */
export const Text = marker<CanonicalTextProps>('element');

/** Declares a canonical group element. */
export const Group = marker<CanonicalGroupProps>('element');

/** Declares a canonical timeline. */
export const Timeline = marker<CanonicalTimelineProps>('timeline');

/** Declares a canonical timeline keyframe track. */
export const Track = marker<CanonicalTrackProps>('track');

/** Declares a canonical reveal effect. */
export const Reveal = marker<CanonicalRevealProps>('reveal');

/** Declares a canonical state machine. */
export const StateMachine = marker<CanonicalStateMachineProps>('state-machine');

/** Declares a canonical state. */
export const State = marker<CanonicalStateProps>('state');

/** Declares a canonical state-machine transition. */
export const Transition = marker<CanonicalTransitionProps>('transition');

export interface CanonicalSceneProps extends Omit<DslRendererProps, 'dsl'> {
  type?: 'scene' | 'player';
  width?: number;
  height?: number;
  fps?: number;
  background?: string;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  defaultStateMachine?: string;
  metadata?: ElucimMetadata;
  children?: React.ReactNode;
}

type CanonicalDocumentDefinition = Pick<
  CanonicalSceneProps,
  'children'
  | 'type'
  | 'width'
  | 'height'
  | 'fps'
  | 'background'
  | 'controls'
  | 'loop'
  | 'autoPlay'
  | 'defaultStateMachine'
  | 'metadata'
>;

/**
 * A JSX projection of a canonical Elucim document.
 *
 * It only accepts canonical element, timeline, and state-machine declarations.
 * The result is rendered by `DslRenderer`, which keeps React and JSON/YAML
 * authoring on the same validation, playback, and rendering paths.
 */
export function Scene({
  children,
  type,
  width,
  height,
  fps,
  background,
  controls,
  loop,
  autoPlay,
  defaultStateMachine,
  metadata,
  ...rendererProps
}: CanonicalSceneProps) {
  const document = useMemo(
    () => createDocumentFromReact({
      children,
      type,
      width,
      height,
      fps,
      background,
      controls,
      loop,
      autoPlay,
      defaultStateMachine,
      metadata,
    }),
    [autoPlay, background, children, controls, defaultStateMachine, fps, height, loop, metadata, type, width],
  );
  return <DslRenderer dsl={document} {...rendererProps} />;
}

/** Builds a normalized document from the canonical JSX declaration tree. */
export function createDocumentFromReact({
  children,
  type = 'player',
  width,
  height,
  fps,
  background,
  controls,
  loop,
  autoPlay,
  defaultStateMachine,
  metadata,
}: CanonicalDocumentDefinition): ElucimDocument {
  const elements: Record<string, ElucimElement> = {};
  const timelines: Record<string, ElucimTimeline> = {};
  const stateMachines: NonNullable<ElucimDocument['stateMachines']> = {};
  const sceneChildren: string[] = [];

  forEachNode(children, node => {
    switch (kindOf(node)) {
      case 'element':
        sceneChildren.push(addElement(node, elements));
        return;
      case 'timeline':
        addTimeline(node, timelines);
        return;
      case 'state-machine':
        addStateMachine(node, stateMachines);
        return;
      default:
        throw new Error(`<${componentName(node)}> is not valid directly inside canonical <Scene>.`);
    }
  });

  const document: ElucimDocument = {
    version: '2.0',
    scene: omitUndefined({
      type,
      width,
      height,
      fps,
      background,
      controls,
      loop,
      autoPlay,
      children: sceneChildren,
    }),
    elements,
    ...(Object.keys(timelines).length ? { timelines } : {}),
    ...(Object.keys(stateMachines).length ? { stateMachines } : {}),
    ...(defaultStateMachine ? { defaultStateMachine } : {}),
    ...(metadata ? { metadata } : {}),
  };
  const validation = validateDocument(document);
  if (!validation.valid) {
    throw new Error(`Canonical JSX produced an invalid Elucim document:\n${validation.errors
      .filter(error => error.severity === 'error')
      .map(error => `${error.path}: ${error.message}`)
      .join('\n')}`);
  }
  return document;
}

function addElement(
  node: React.ReactElement<CanonicalElementProps | CanonicalTextProps | CanonicalGroupProps>,
  elements: Record<string, ElucimElement>,
  parentId?: string,
): string {
  const markerKind = kindOf(node);
  if (markerKind !== 'element') throw new Error(`Expected a canonical element, received <${componentName(node)}>.`);
  const raw = node.props as CanonicalElementProps & { content?: unknown };
  const type = node.type === Text ? 'text' : node.type === Group ? 'group' : raw.type;
  if (!type || typeof type !== 'string') throw new Error('Canonical elements require a non-empty type.');
  if (elements[raw.id]) throw new Error(`Duplicate canonical element ID "${raw.id}".`);

  const childIds: string[] = [];
  if (typeof raw.children !== 'string') {
    forEachNode(raw.children, child => {
      if (kindOf(child) !== 'element') {
        throw new Error(`<${componentName(child)}> is not valid inside canonical element "${raw.id}".`);
      }
      childIds.push(addElement(child, elements, raw.id));
    });
  }

  const directProps = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !ELEMENT_RESERVED_PROPS.has(key)),
  );
  const explicitContent = raw.content;
  const childContent = typeof raw.children === 'string' ? raw.children : undefined;
  if (type === 'text' && explicitContent !== undefined && childContent !== undefined && explicitContent !== childContent) {
    throw new Error(`Text element "${raw.id}" cannot define both content and string children with different values.`);
  }
  const content = explicitContent ?? childContent;
  const props = omitUndefined({
    type,
    ...(raw.props ?? {}),
    ...directProps,
    ...(content !== undefined ? { content } : {}),
  });

  elements[raw.id] = {
    id: raw.id,
    type,
    props,
    ...(parentId ? { parentId } : {}),
    ...(raw.role ? { role: raw.role } : {}),
    ...(raw.intent ? { intent: raw.intent } : {}),
    ...(raw.layout ? { layout: raw.layout } : {}),
    ...(childIds.length ? { children: childIds } : {}),
  };
  return raw.id;
}

function addTimeline(node: React.ReactElement<CanonicalTimelineProps>, timelines: Record<string, ElucimTimeline>): void {
  const { id, duration, camera, children } = node.props;
  if (timelines[id]) throw new Error(`Duplicate canonical timeline ID "${id}".`);
  const tracks: ElucimTimeline['tracks'] = [];
  const effects: NonNullable<ElucimTimeline['effects']> = [];
  forEachNode(children, child => {
    switch (kindOf(child)) {
      case 'track':
        tracks.push({ ...child.props });
        return;
      case 'reveal': {
        const { target, targets, ...effect } = child.props;
        const resolvedTargets = targets ?? (target ? [target] : []);
        effects.push({ ...effect, kind: 'reveal', targets: resolvedTargets });
        return;
      }
      default:
        throw new Error(`<${componentName(child)}> is not valid inside canonical timeline "${id}".`);
    }
  });
  timelines[id] = { id, duration, tracks, ...(effects.length ? { effects } : {}), ...(camera ? { camera } : {}) };
}

function addStateMachine(
  node: React.ReactElement<CanonicalStateMachineProps>,
  stateMachines: NonNullable<ElucimDocument['stateMachines']>,
): void {
  const { id, entry, inputs, children } = node.props;
  if (stateMachines[id]) throw new Error(`Duplicate canonical state machine ID "${id}".`);
  const states: Record<string, ElucimState> = {};
  const transitions: NonNullable<ElucimDocument['stateMachines']>[string]['transitions'] = [];
  forEachNode(children, child => {
    if (kindOf(child) === 'state') {
      const { id: stateId, ...state } = child.props;
      if (states[stateId]) throw new Error(`Duplicate state "${stateId}" in state machine "${id}".`);
      states[stateId] = state;
      return;
    }
    if (kindOf(child) === 'transition') {
      transitions.push({ ...child.props });
      return;
    }
    throw new Error(`<${componentName(child)}> is not valid inside canonical state machine "${id}".`);
  });
  stateMachines[id] = {
    id,
    entry,
    ...(inputs ? { inputs } : {}),
    states,
    ...(transitions.length ? { transitions } : {}),
  };
}

const ELEMENT_RESERVED_PROPS = new Set(['id', 'type', 'props', 'layout', 'intent', 'role', 'children', 'content']);

function forEachNode(children: React.ReactNode, callback: (node: React.ReactElement) => void): void {
  React.Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean' || typeof child === 'string' || typeof child === 'number') {
      if (child !== null && child !== undefined && child !== false) {
        throw new Error('Canonical JSX declarations cannot contain text outside a text element.');
      }
      return;
    }
    if (!React.isValidElement(child)) throw new Error('Canonical JSX declarations must be React elements.');
    if (child.type === React.Fragment) {
      forEachNode(child.props.children, callback);
      return;
    }
    callback(child);
  });
}

function kindOf(node: React.ReactElement): CanonicalKind | undefined {
  const type = node.type as Partial<CanonicalMarker<unknown>>;
  return type.canonicalKind;
}

function componentName(node: React.ReactElement): string {
  const type = node.type as { displayName?: string; name?: string };
  return type.displayName ?? type.name ?? 'unknown';
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
