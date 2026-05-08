import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { ElucimV2Command } from './commands';
import { applyCommand } from './commands';
import { collectElementBounds, type ElementBounds } from './polish';
import type { ElucimV2Document, ElucimV2Element } from './types';
import type { ElucimDocumentNudge, ElucimDocumentNudgeResult } from './nudges';

export type ElucimSemanticLayoutDirection = 'RIGHT' | 'DOWN';

export interface ElucimSemanticLayoutOptions {
  direction?: ElucimSemanticLayoutDirection;
  includeVisualConnectors?: boolean;
}

export interface ElucimSemanticLayoutPlan {
  id: string;
  title: string;
  description: string;
  commands: ElucimV2Command[];
  affectedElementIds: string[];
}

interface VirtualNode {
  id: string;
  bounds: ElementBounds;
  locked: boolean;
}

interface VirtualEdge {
  id: string;
  from: string;
  to: string;
  source: 'intent' | 'rank' | 'connector';
}

interface VirtualLayout {
  nodes: VirtualNode[];
  edges: VirtualEdge[];
}

const DEFAULT_DIRECTION: ElucimSemanticLayoutDirection = 'RIGHT';
const NODE_SPACING = 80;
const LAYER_SPACING = 120;
const CONNECTOR_SNAP_DISTANCE = 80;

export async function suggestSemanticLayoutNudges(
  doc: ElucimV2Document,
  options: ElucimSemanticLayoutOptions = {},
): Promise<ElucimDocumentNudge[]> {
  const plan = await planSemanticLayout(doc, options);
  if (!plan) return [];
  return [{
    id: plan.id,
    title: plan.title,
    description: plan.description,
    confidence: 'review',
    category: 'layout',
    commands: plan.commands,
  }];
}

export async function planSemanticLayout(
  doc: ElucimV2Document,
  options: ElucimSemanticLayoutOptions = {},
): Promise<ElucimSemanticLayoutPlan | undefined> {
  const virtual = extractVirtualLayout(doc, options);
  if (virtual.nodes.length < 2 || virtual.edges.length === 0) return undefined;

  const elkGraph = toElkGraph(virtual, options.direction ?? DEFAULT_DIRECTION);
  const { default: ELK } = await import('elkjs/lib/elk.bundled');
  const elk = new ELK();
  const result = await elk.layout(elkGraph);
  const commands = buildLayoutCommands(doc, virtual, result);
  if (commands.length === 0) return undefined;

  return {
    id: 'semantic-layout-elk',
    title: 'Apply semantic flow layout',
    description: 'Use ELK to arrange elements from explicit intent relationships and connector hints, then write back normal editable element coordinates.',
    commands,
    affectedElementIds: commands
      .filter(command => command.op === 'updateElement')
      .map(command => command.id),
  };
}

export function applySemanticLayoutNudge(doc: ElucimV2Document, nudge: ElucimDocumentNudge): ElucimDocumentNudgeResult {
  let current = doc;
  const summaries: string[] = [];
  for (const command of nudge.commands) {
    const result = applyCommand(current, command);
    current = result.document;
    summaries.push(result.summary);
  }
  return { document: current, summaries };
}

function extractVirtualLayout(doc: ElucimV2Document, options: ElucimSemanticLayoutOptions): VirtualLayout {
  const elementIds = new Set(Object.keys(doc.elements));
  const boundsById = new Map(collectElementBounds(doc).map(bounds => [bounds.id, bounds]));
  const edges = [
    ...extractIntentEdges(doc, elementIds),
    ...extractRankEdges(doc, elementIds),
    ...(options.includeVisualConnectors === false ? [] : extractConnectorEdges(doc, boundsById)),
  ];
  const edgeEndpointIds = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  const nodes = Array.from(edgeEndpointIds)
    .filter(id => boundsById.has(id))
    .filter(id => doc.elements[id]?.intent?.importance !== 'decorative')
    .map(id => ({
      id,
      bounds: boundsById.get(id)!,
      locked: doc.elements[id]?.layout?.locked === true,
    }));
  const nodeIds = new Set(nodes.map(node => node.id));
  return {
    nodes,
    edges: dedupeEdges(edges).filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to),
  };
}

function extractIntentEdges(doc: ElucimV2Document, elementIds: Set<string>): VirtualEdge[] {
  const edges: VirtualEdge[] = [];
  for (const element of Object.values(doc.elements)) {
    const intent = element.intent;
    if (!intent) continue;
    if (intent.target && elementIds.has(intent.target)) {
      edges.push({ id: `target:${intent.target}->${element.id}`, from: intent.target, to: element.id, source: 'intent' });
    }
    for (const from of intent.flowFrom ?? []) {
      if (elementIds.has(from)) edges.push({ id: `flow:${from}->${element.id}`, from, to: element.id, source: 'intent' });
    }
    for (const to of intent.flowTo ?? []) {
      if (elementIds.has(to)) edges.push({ id: `flow:${element.id}->${to}`, from: element.id, to, source: 'intent' });
    }
  }
  return edges;
}

function extractRankEdges(doc: ElucimV2Document, elementIds: Set<string>): VirtualEdge[] {
  const ranked = Object.values(doc.elements)
    .filter(element => elementIds.has(element.id) && typeof element.layout?.rank === 'number' && Number.isFinite(element.layout.rank))
    .sort((a, b) => (a.layout!.rank! - b.layout!.rank!) || a.id.localeCompare(b.id));
  const edges: VirtualEdge[] = [];
  for (let index = 0; index < ranked.length - 1; index += 1) {
    const current = ranked[index];
    const next = ranked[index + 1];
    if (current.layout?.rank === next.layout?.rank) continue;
    edges.push({ id: `rank:${current.id}->${next.id}`, from: current.id, to: next.id, source: 'rank' });
  }
  return edges;
}

function extractConnectorEdges(doc: ElucimV2Document, boundsById: Map<string, ElementBounds>): VirtualEdge[] {
  const edges: VirtualEdge[] = [];
  const candidateBounds = Array.from(boundsById.values());
  for (const element of Object.values(doc.elements)) {
    if (!element.props) continue;
    if (element.type !== 'arrow' && element.type !== 'line' && element.props.type !== 'arrow' && element.props.type !== 'line') continue;
    const x1 = numberProp(element.props.x1);
    const y1 = numberProp(element.props.y1);
    const x2 = numberProp(element.props.x2);
    const y2 = numberProp(element.props.y2);
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) continue;
    const from = nearestElementId(candidateBounds, { x: x1, y: y1 }, element.id);
    const to = nearestElementId(candidateBounds, { x: x2, y: y2 }, element.id);
    if (!from || !to || from.id === to.id || from.distance > CONNECTOR_SNAP_DISTANCE || to.distance > CONNECTOR_SNAP_DISTANCE) continue;
    edges.push({ id: `connector:${element.id}:${from.id}->${to.id}`, from: from.id, to: to.id, source: 'connector' });
  }
  return edges;
}

function toElkGraph(virtual: VirtualLayout, direction: ElucimSemanticLayoutDirection): ElkNode {
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(NODE_SPACING),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_SPACING),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: virtual.nodes.map(node => ({
      id: node.id,
      width: Math.max(24, Math.round(node.bounds.width)),
      height: Math.max(24, Math.round(node.bounds.height)),
    })),
    edges: virtual.edges.map((edge): ElkExtendedEdge => ({
      id: edge.id,
      sources: [edge.from],
      targets: [edge.to],
    })),
  };
}

function buildLayoutCommands(doc: ElucimV2Document, virtual: VirtualLayout, result: ElkNode): ElucimV2Command[] {
  const originalBounds = unionBounds(virtual.nodes.map(node => node.bounds));
  const resultNodes = result.children ?? [];
  const resultBounds = unionBounds(resultNodes
    .filter(node => typeof node.x === 'number' && typeof node.y === 'number' && typeof node.width === 'number' && typeof node.height === 'number')
    .map(node => ({ id: node.id, x: node.x!, y: node.y!, width: node.width!, height: node.height! })));
  if (!originalBounds || !resultBounds) return [];
  const dx = originalBounds.x + originalBounds.width / 2 - (resultBounds.x + resultBounds.width / 2);
  const dy = originalBounds.y + originalBounds.height / 2 - (resultBounds.y + resultBounds.height / 2);
  const nodeById = new Map(virtual.nodes.map(node => [node.id, node]));
  const commands: ElucimV2Command[] = [];
  const movedIds = new Set<string>();

  for (const resultNode of resultNodes.sort((a, b) => a.id.localeCompare(b.id))) {
    const virtualNode = nodeById.get(resultNode.id);
    if (!virtualNode || virtualNode.locked || typeof resultNode.x !== 'number' || typeof resultNode.y !== 'number') continue;
    const nextX = Math.round(resultNode.x + dx);
    const nextY = Math.round(resultNode.y + dy);
    const deltaX = nextX - virtualNode.bounds.x;
    const deltaY = nextY - virtualNode.bounds.y;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;
    commands.push(...moveElementByDelta(doc, virtualNode.id, deltaX, deltaY, movedIds));
  }
  return commands;
}

function moveElementByDelta(doc: ElucimV2Document, id: string, dx: number, dy: number, movedIds: Set<string>): ElucimV2Command[] {
  if (movedIds.has(id)) return [];
  const element = doc.elements[id];
  if (!element || element.layout?.locked) return [];
  movedIds.add(id);
  const patch = movementPatch(element, dx, dy);
  const ownCommand = patch ? [{ op: 'updateElement' as const, id, patch }] : [];
  if (element.children?.length) {
    return [
      ...ownCommand,
      ...element.children.flatMap(childId => moveElementByDelta(doc, childId, dx, dy, movedIds)),
    ];
  }
  return ownCommand;
}

function movementPatch(element: ElucimV2Element, dx: number, dy: number): Extract<ElucimV2Command, { op: 'updateElement' }>['patch'] | undefined {
  const layoutX = numberProp(element.layout?.x);
  const layoutY = numberProp(element.layout?.y);
  if (layoutX !== undefined || layoutY !== undefined) {
    return { layout: { x: Math.round((layoutX ?? 0) + dx), y: Math.round((layoutY ?? 0) + dy) } };
  }
  const props = element.props;
  const x = numberProp(props.x);
  const y = numberProp(props.y);
  if (x !== undefined || y !== undefined) {
    return { props: { x: Math.round((x ?? 0) + dx), y: Math.round((y ?? 0) + dy) } };
  }
  const cx = numberProp(props.cx);
  const cy = numberProp(props.cy);
  if (cx !== undefined || cy !== undefined) {
    return { props: { cx: Math.round((cx ?? 0) + dx), cy: Math.round((cy ?? 0) + dy) } };
  }
  if (typeof props.x1 === 'number' || typeof props.y1 === 'number' || typeof props.x2 === 'number' || typeof props.y2 === 'number') {
    return {
      props: {
        ...(typeof props.x1 === 'number' ? { x1: Math.round(props.x1 + dx) } : {}),
        ...(typeof props.y1 === 'number' ? { y1: Math.round(props.y1 + dy) } : {}),
        ...(typeof props.cx1 === 'number' ? { cx1: Math.round(props.cx1 + dx) } : {}),
        ...(typeof props.cy1 === 'number' ? { cy1: Math.round(props.cy1 + dy) } : {}),
        ...(typeof props.cx2 === 'number' ? { cx2: Math.round(props.cx2 + dx) } : {}),
        ...(typeof props.cy2 === 'number' ? { cy2: Math.round(props.cy2 + dy) } : {}),
        ...(typeof props.x2 === 'number' ? { x2: Math.round(props.x2 + dx) } : {}),
        ...(typeof props.y2 === 'number' ? { y2: Math.round(props.y2 + dy) } : {}),
      },
    };
  }
  if ((element.type === 'graph' || props.type === 'graph') && Array.isArray(props.nodes)) {
    const nodes = props.nodes.map(node => {
      if (!node || typeof node !== 'object') return node;
      const graphNode = node as Record<string, unknown>;
      if (typeof graphNode.x !== 'number' || typeof graphNode.y !== 'number') return node;
      return { ...graphNode, x: Math.round(graphNode.x + dx), y: Math.round(graphNode.y + dy) };
    });
    return { props: { nodes } };
  }
  return undefined;
}

function nearestElementId(bounds: ElementBounds[], point: { x: number; y: number }, excludeId: string): { id: string; distance: number } | undefined {
  return bounds
    .filter(bounds => bounds.id !== excludeId)
    .map(bounds => ({ id: bounds.id, distance: distanceToBox(bounds, point) }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
}

function distanceToBox(bounds: ElementBounds, point: { x: number; y: number }): number {
  const cx = Math.max(bounds.x, Math.min(point.x, bounds.x + bounds.width));
  const cy = Math.max(bounds.y, Math.min(point.y, bounds.y + bounds.height));
  return Math.hypot(point.x - cx, point.y - cy);
}

function dedupeEdges(edges: VirtualEdge[]): VirtualEdge[] {
  const seen = new Set<string>();
  const result: VirtualEdge[] = [];
  for (const edge of edges.sort((a, b) => `${a.from}->${a.to}:${a.source}`.localeCompare(`${b.from}->${b.to}:${b.source}`))) {
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(edge);
  }
  return result;
}

function unionBounds(bounds: ElementBounds[]): ElementBounds | undefined {
  if (bounds.length === 0) return undefined;
  const left = Math.min(...bounds.map(bound => bound.x));
  const top = Math.min(...bounds.map(bound => bound.y));
  const right = Math.max(...bounds.map(bound => bound.x + bound.width));
  const bottom = Math.max(...bounds.map(bound => bound.y + bound.height));
  return { id: 'union', x: left, y: top, width: right - left, height: bottom - top };
}

function numberProp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
