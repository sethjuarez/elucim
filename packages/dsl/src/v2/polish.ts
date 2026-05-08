import { SEMANTIC_TOKENS } from '@elucim/core';
import type { ElucimV2Document, ElucimV2Element } from './types';

export type ElucimPolishCategory = 'layout' | 'hierarchy' | 'readability' | 'contrast' | 'graph' | 'motion' | 'structure';
export type ElucimPolishSeverity = 'info' | 'warning' | 'error';

export interface ElucimPolishDiagnostic {
  id: string;
  category: ElucimPolishCategory;
  severity: ElucimPolishSeverity;
  message: string;
  affectedElementIds: string[];
  suggestedNudgeId?: string;
}

export interface ElucimPolishScore {
  overall: number;
  layout: number;
  hierarchy: number;
  readability: number;
  contrast: number;
  graph: number;
  structure: number;
  motion: number;
}

export interface ElucimPolishReport {
  score: ElucimPolishScore;
  diagnostics: ElucimPolishDiagnostic[];
}

export type ElucimPresetElement = ElucimV2Element;

export interface ElucimCalloutCardPresetSpec {
  id: string;
  x: number;
  y: number;
  width?: number;
  title: string;
  body?: string;
  accentToken?: string;
}

export interface ElementBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElucimGraphNodeLayout {
  id: string;
  x: number;
  y: number;
  radius?: number;
  [key: string]: unknown;
}

export interface ElucimGraphEdgeLayout {
  from: string;
  to: string;
  directed?: boolean;
  [key: string]: unknown;
}

interface GraphMetrics {
  crossings: number;
  overlappingNodes: number;
  hasDirectedEdges: boolean;
}

const DEFAULT_SCENE_WIDTH = 1280;
const DEFAULT_SCENE_HEIGHT = 720;
const MIN_TEXT_SIZE = 16;
const TARGET_TITLE_SIZE = 40;
const TOKEN_VALUES = new Set(Object.keys(SEMANTIC_TOKENS).map(token => `$${token}`));

export function analyzePolish(doc: ElucimV2Document): ElucimPolishReport {
  const diagnostics: ElucimPolishDiagnostic[] = [];
  const bounds = collectElementBounds(doc);
  diagnostics.push(...checkSceneStructure(doc));
  diagnostics.push(...checkBounds(doc, bounds));
  diagnostics.push(...checkOverlaps(bounds));
  diagnostics.push(...checkTextHierarchy(doc));
  diagnostics.push(...checkTextReadability(doc));
  diagnostics.push(...checkLiteralColors(doc));
  diagnostics.push(...checkGraphReadability(doc));
  diagnostics.push(...checkMotion(doc));
  return { diagnostics, score: scoreDiagnostics(diagnostics) };
}

export function collectElementBounds(doc: ElucimV2Document): ElementBounds[] {
  return Object.values(doc.elements)
    .map(element => getElementBounds(element))
    .filter((bounds): bounds is ElementBounds => Boolean(bounds));
}

export function createCalloutCardPreset(spec: ElucimCalloutCardPresetSpec): ElucimPresetElement[] {
  const width = spec.width ?? 320;
  const hasBody = Boolean(spec.body);
  const height = hasBody ? 132 : 88;
  const accent = spec.accentToken ?? '$primary';
  const cardId = `${spec.id}-card`;
  const titleId = `${spec.id}-title`;
  const bodyId = `${spec.id}-body`;
  const children = hasBody ? [cardId, titleId, bodyId] : [cardId, titleId];

  return [
    {
      id: spec.id,
      type: 'group',
      role: 'callout',
      intent: { role: 'callout', importance: 'supporting' },
      layout: { x: spec.x, y: spec.y, width, height },
      children,
      props: {},
    },
    {
      id: cardId,
      type: 'rect',
      parentId: spec.id,
      role: 'container',
      intent: { role: 'container', importance: 'supporting' },
      props: { x: spec.x, y: spec.y, width, height, rx: 18, fill: '$surface', stroke: accent, strokeWidth: 2 },
    },
    {
      id: titleId,
      type: 'text',
      parentId: spec.id,
      role: 'title',
      intent: { role: 'title', importance: 'secondary' },
      props: { x: spec.x + 22, y: spec.y + 36, content: spec.title, fontSize: 22, fill: '$title', fontWeight: 700 },
    },
    ...(hasBody ? [{
      id: bodyId,
      type: 'text',
      parentId: spec.id,
      role: 'body',
      intent: { role: 'body', importance: 'supporting' },
      props: { x: spec.x + 22, y: spec.y + 74, content: spec.body, fontSize: 16, fill: '$muted' },
    } satisfies ElucimV2Element] : []),
  ];
}

export function layoutGraphLayered(
  nodes: ElucimGraphNodeLayout[],
  edges: ElucimGraphEdgeLayout[],
): ElucimGraphNodeLayout[] {
  if (nodes.length <= 1) return nodes.map(node => ({ ...node }));
  const nodeIds = nodes.map(node => node.id);
  const nodeSet = new Set(nodeIds);
  const outgoing = new Map<string, string[]>();
  const incomingCounts = new Map(nodeIds.map(id => [id, 0]));
  for (const edge of edges) {
    if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) continue;
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + 1);
  }

  const roots = nodeIds.filter(id => (incomingCounts.get(id) ?? 0) === 0);
  const seeds = roots.length > 0 ? roots : [nodeIds[0]];
  const ranks = new Map<string, number>();
  const visit = (id: string, rank: number, path: Set<string>) => {
    if (path.has(id)) return;
    if ((ranks.get(id) ?? -1) >= rank) return;
    ranks.set(id, rank);
    const nextPath = new Set(path);
    nextPath.add(id);
    for (const target of outgoing.get(id) ?? []) visit(target, rank + 1, nextPath);
  };
  seeds.forEach(seed => visit(seed, 0, new Set()));
  let fallbackRank = Math.max(0, ...Array.from(ranks.values())) + 1;
  for (const id of nodeIds) {
    if (!ranks.has(id)) {
      ranks.set(id, fallbackRank);
      fallbackRank += 1;
    }
  }

  const columns = new Map<number, string[]>();
  for (const id of nodeIds) {
    const rank = ranks.get(id) ?? 0;
    columns.set(rank, [...(columns.get(rank) ?? []), id]);
  }

  const averageRadius = nodes.reduce((sum, node) => sum + (node.radius ?? 22), 0) / nodes.length;
  const majorGap = Math.max(150, averageRadius * 5.5);
  const minorGap = Math.max(92, averageRadius * 3.8);
  const maxColumnSize = Math.max(1, ...Array.from(columns.values()).map(ids => ids.length));
  const positionById = new Map<string, { x: number; y: number }>();
  Array.from(columns.entries()).sort(([a], [b]) => a - b).forEach(([rank, ids]) => {
    const columnInset = ((maxColumnSize - ids.length) * minorGap) / 2;
    ids.forEach((id, index) => positionById.set(id, {
      x: rank * majorGap,
      y: columnInset + index * minorGap,
    }));
  });

  const currentBounds = graphBounds(nodes);
  const layoutBounds = graphBounds(nodes.map(node => ({ ...node, ...(positionById.get(node.id) ?? {}) })));
  const targetX = currentBounds ? currentBounds.x + currentBounds.width / 2 : DEFAULT_SCENE_WIDTH / 2;
  const targetY = currentBounds ? currentBounds.y + currentBounds.height / 2 : DEFAULT_SCENE_HEIGHT / 2;
  const layoutCenterX = layoutBounds ? layoutBounds.x + layoutBounds.width / 2 : 0;
  const layoutCenterY = layoutBounds ? layoutBounds.y + layoutBounds.height / 2 : 0;

  return nodes.map(node => {
    const position = positionById.get(node.id);
    if (!position) return { ...node };
    return {
      ...node,
      x: Math.round(position.x + targetX - layoutCenterX),
      y: Math.round(position.y + targetY - layoutCenterY),
    };
  });
}

export function graphNeedsLayout(element: ElucimV2Element): boolean {
  const nodes = getGraphNodes(element);
  const edges = getGraphEdges(element);
  if (!nodes || !edges || nodes.length < 3 || edges.length === 0) return false;
  const metrics = measureGraph(nodes, edges);
  return metrics.overlappingNodes > 0 || metrics.crossings > 0 || metrics.hasDirectedEdges;
}

export function layoutGraphElementLayered(element: ElucimV2Element): ElucimGraphNodeLayout[] | undefined {
  const nodes = getGraphNodes(element);
  const edges = getGraphEdges(element);
  if (!nodes || !edges) return undefined;
  return layoutGraphLayered(nodes, edges);
}

function checkSceneStructure(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  const diagnostics: ElucimPolishDiagnostic[] = [];
  if (!doc.metadata?.title && !findTitleElement(doc)) {
    diagnostics.push({
      id: 'missing-title',
      category: 'structure',
      severity: 'warning',
      message: 'Diagram has no document title or title-like text element.',
      affectedElementIds: [],
    });
  }
  if (!doc.metadata?.intent) {
    diagnostics.push({
      id: 'missing-intent',
      category: 'structure',
      severity: 'info',
      message: 'Document intent is missing, making it harder for agents and polish passes to preserve the explanation goal.',
      affectedElementIds: [],
    });
  }
  return diagnostics;
}

function checkBounds(doc: ElucimV2Document, bounds: ElementBounds[]): ElucimPolishDiagnostic[] {
  const width = doc.scene.width ?? DEFAULT_SCENE_WIDTH;
  const height = doc.scene.height ?? DEFAULT_SCENE_HEIGHT;
  return bounds
    .filter(box => box.x < -8 || box.y < -8 || box.x + box.width > width + 8 || box.y + box.height > height + 8)
    .map(box => ({
      id: `off-canvas-${box.id}`,
      category: 'layout' as const,
      severity: 'warning' as const,
      message: `Element "${box.id}" extends outside the scene bounds.`,
      affectedElementIds: [box.id],
    }));
}

function checkOverlaps(bounds: ElementBounds[]): ElucimPolishDiagnostic[] {
  const diagnostics: ElucimPolishDiagnostic[] = [];
  for (let i = 0; i < bounds.length; i += 1) {
    for (let j = i + 1; j < bounds.length; j += 1) {
      const a = bounds[i];
      const b = bounds[j];
      if (overlapArea(a, b) <= 24) continue;
      diagnostics.push({
        id: `overlap-${a.id}-${b.id}`,
        category: 'layout',
        severity: 'warning',
        message: `Elements "${a.id}" and "${b.id}" overlap.`,
        affectedElementIds: [a.id, b.id],
      });
    }
  }
  return diagnostics.slice(0, 8);
}

function checkTextHierarchy(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  const title = findTitleElement(doc);
  if (!title) return [];
  const fontSize = asNumber(title.element.props.fontSize) ?? 24;
  if (fontSize >= 34 && title.element.intent?.importance === 'primary') return [];
  return [{
    id: `weak-title-${title.id}`,
    category: 'hierarchy',
    severity: 'info',
    message: `Title "${title.id}" is not visually or semantically dominant.`,
    affectedElementIds: [title.id],
    suggestedNudgeId: 'polish-title-hierarchy',
  }];
}

function checkTextReadability(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  return Object.values(doc.elements)
    .filter(element => element.type === 'text' || element.props.type === 'text')
    .filter(element => (asNumber(element.props.fontSize) ?? 24) < MIN_TEXT_SIZE)
    .map(element => ({
      id: `small-text-${element.id}`,
      category: 'readability' as const,
      severity: 'warning' as const,
      message: `Text "${element.id}" is below the recommended ${MIN_TEXT_SIZE}px minimum.`,
      affectedElementIds: [element.id],
      suggestedNudgeId: 'polish-text-readability',
    }));
}

function checkLiteralColors(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  const literalColorElements = Object.values(doc.elements).filter(element => {
    const colors = ['fill', 'stroke', 'color', 'labelColor', 'nodeColor', 'edgeColor']
      .map(key => element.props[key])
      .filter((value): value is string => typeof value === 'string' && value !== 'none');
    return colors.some(color => isLiteralColor(color));
  });
  if (literalColorElements.length <= Math.max(3, Object.keys(doc.elements).length / 2)) return [];
  return [{
    id: 'many-literal-colors',
    category: 'contrast',
    severity: 'info',
    message: 'Many elements use literal colors instead of semantic tokens, which can make diagrams less cohesive and theme-aware.',
    affectedElementIds: literalColorElements.slice(0, 8).map(element => element.id),
  }];
}

function checkGraphReadability(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  const diagnostics: ElucimPolishDiagnostic[] = [];
  for (const element of Object.values(doc.elements)) {
    const nodes = getGraphNodes(element);
    const edges = getGraphEdges(element);
    if (!nodes || !edges || nodes.length < 2) continue;
    const metrics = measureGraph(nodes, edges);
    if (metrics.overlappingNodes > 0) {
      diagnostics.push({
        id: `graph-node-overlap-${element.id}`,
        category: 'graph',
        severity: 'warning',
        message: `Graph "${element.id}" has ${metrics.overlappingNodes} overlapping node pair${metrics.overlappingNodes === 1 ? '' : 's'}.`,
        affectedElementIds: [element.id],
        suggestedNudgeId: `layout-graph-${element.id}`,
      });
    }
    if (metrics.crossings > 0) {
      diagnostics.push({
        id: `graph-edge-crossings-${element.id}`,
        category: 'graph',
        severity: 'warning',
        message: `Graph "${element.id}" has ${metrics.crossings} edge crossing${metrics.crossings === 1 ? '' : 's'}.`,
        affectedElementIds: [element.id],
        suggestedNudgeId: `layout-graph-${element.id}`,
      });
    }
  }
  return diagnostics;
}

function checkMotion(doc: ElucimV2Document): ElucimPolishDiagnostic[] {
  if (doc.scene.children.length === 0 || Object.keys(doc.timelines ?? {}).length > 0) return [];
  return [{
    id: 'missing-motion-intro',
    category: 'motion',
    severity: 'info',
    message: 'Diagram has no reveal timeline; a simple staggered intro can make generated scenes feel more intentional.',
    affectedElementIds: doc.scene.children.slice(0, 8),
    suggestedNudgeId: 'add-staggered-intro',
  }];
}

function scoreDiagnostics(diagnostics: ElucimPolishDiagnostic[]): ElucimPolishScore {
  const categories: Array<keyof Omit<ElucimPolishScore, 'overall'>> = ['layout', 'hierarchy', 'readability', 'contrast', 'graph', 'structure', 'motion'];
  const scores = Object.fromEntries(categories.map(category => {
    const penalty = diagnostics
      .filter(diagnostic => diagnostic.category === category)
      .reduce((sum, diagnostic) => sum + severityPenalty(diagnostic.severity), 0);
    return [category, clampScore(100 - penalty)];
  })) as Omit<ElucimPolishScore, 'overall'>;
  const overall = Math.round(
    scores.layout * 0.22 +
    scores.hierarchy * 0.16 +
    scores.readability * 0.18 +
    scores.contrast * 0.12 +
    scores.graph * 0.16 +
    scores.structure * 0.10 +
    scores.motion * 0.06,
  );
  return { overall, ...scores };
}

function severityPenalty(severity: ElucimPolishSeverity): number {
  if (severity === 'error') return 28;
  if (severity === 'warning') return 14;
  return 6;
}

function getElementBounds(element: ElucimV2Element): ElementBounds | undefined {
  const props = element.props;
  const x = asNumber(element.layout?.x) ?? asNumber(props.x);
  const y = asNumber(element.layout?.y) ?? asNumber(props.y);
  const width = asNumber(element.layout?.width) ?? asNumber(props.width);
  const height = asNumber(element.layout?.height) ?? asNumber(props.height);
  if (width !== undefined && height !== undefined) return { id: element.id, x: x ?? 0, y: y ?? 0, width, height };

  if (element.type === 'text' || props.type === 'text') {
    const fontSize = asNumber(props.fontSize) ?? 24;
    const content = typeof props.content === 'string' ? props.content : element.id;
    const tx = x ?? asNumber(props.x) ?? 0;
    const ty = y ?? asNumber(props.y) ?? 0;
    return { id: element.id, x: tx, y: ty - fontSize, width: Math.max(fontSize, content.length * fontSize * 0.56), height: fontSize * 1.25 };
  }
  if (element.type === 'circle' || props.type === 'circle') {
    const r = asNumber(props.r) ?? asNumber(props.radius) ?? 20;
    const cx = x ?? asNumber(props.cx) ?? 0;
    const cy = y ?? asNumber(props.cy) ?? 0;
    return { id: element.id, x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
  }
  if (element.type === 'line' || element.type === 'arrow' || props.type === 'line' || props.type === 'arrow') {
    const x1 = asNumber(props.x1) ?? 0;
    const y1 = asNumber(props.y1) ?? 0;
    const x2 = asNumber(props.x2) ?? 0;
    const y2 = asNumber(props.y2) ?? 0;
    return { id: element.id, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
  }
  const graphNodes = getGraphNodes(element);
  if (graphNodes) return graphBounds(graphNodes, element.id);
  return undefined;
}

function graphBounds(nodes: Array<{ id: string; x: number; y: number; radius?: number }>, id = 'graph'): ElementBounds | undefined {
  if (nodes.length === 0) return undefined;
  const left = Math.min(...nodes.map(node => node.x - (node.radius ?? 20)));
  const top = Math.min(...nodes.map(node => node.y - (node.radius ?? 20)));
  const right = Math.max(...nodes.map(node => node.x + (node.radius ?? 20)));
  const bottom = Math.max(...nodes.map(node => node.y + (node.radius ?? 20)));
  return { id, x: left, y: top, width: right - left, height: bottom - top };
}

function findTitleElement(doc: ElucimV2Document): { id: string; element: ElucimV2Element } | undefined {
  const candidates = Object.values(doc.elements).filter(element => element.type === 'text' || element.props.type === 'text');
  const semanticTitle = candidates.find(element => element.role === 'title' || element.intent?.role === 'title');
  if (semanticTitle) return { id: semanticTitle.id, element: semanticTitle };
  const namedTitle = candidates.find(element => typeof element.props.content === 'string' && /title|headline|heading/i.test(element.id));
  if (namedTitle) return { id: namedTitle.id, element: namedTitle };
  return candidates[0] ? { id: candidates[0].id, element: candidates[0] } : undefined;
}

function getGraphNodes(element: ElucimV2Element): ElucimGraphNodeLayout[] | undefined {
  if (element.type !== 'graph' && element.props.type !== 'graph') return undefined;
  if (!Array.isArray(element.props.nodes)) return undefined;
  const nodes = element.props.nodes.filter(isGraphNode);
  return nodes.length === element.props.nodes.length ? nodes : undefined;
}

function getGraphEdges(element: ElucimV2Element): ElucimGraphEdgeLayout[] | undefined {
  if (element.type !== 'graph' && element.props.type !== 'graph') return undefined;
  if (!Array.isArray(element.props.edges)) return undefined;
  const edges = element.props.edges.filter(isGraphEdge);
  return edges.length === element.props.edges.length ? edges : undefined;
}

function isGraphNode(value: unknown): value is ElucimGraphNodeLayout {
  return !!value && typeof value === 'object'
    && typeof (value as { id?: unknown }).id === 'string'
    && typeof (value as { x?: unknown }).x === 'number'
    && typeof (value as { y?: unknown }).y === 'number';
}

function isGraphEdge(value: unknown): value is ElucimGraphEdgeLayout {
  return !!value && typeof value === 'object'
    && typeof (value as { from?: unknown }).from === 'string'
    && typeof (value as { to?: unknown }).to === 'string';
}

function measureGraph(
  nodes: Array<{ id: string; x: number; y: number; radius?: number }>,
  edges: Array<{ from: string; to: string; directed?: boolean }>,
): GraphMetrics {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  let overlappingNodes = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const minDistance = (a.radius ?? 20) + (b.radius ?? 20) + 8;
      if (distance(a, b) < minDistance) overlappingNodes += 1;
    }
  }
  let crossings = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const a = edges[i];
      const b = edges[j];
      if (new Set([a.from, a.to, b.from, b.to]).size < 4) continue;
      const a1 = nodeMap.get(a.from);
      const a2 = nodeMap.get(a.to);
      const b1 = nodeMap.get(b.from);
      const b2 = nodeMap.get(b.to);
      if (!a1 || !a2 || !b1 || !b2) continue;
      if (segmentsIntersect(a1, a2, b1, b2)) crossings += 1;
    }
  }
  return { crossings, overlappingNodes, hasDirectedEdges: edges.some(edge => edge.directed) };
}

function overlapArea(a: ElementBounds, b: ElementBounds): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentsIntersect(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): boolean {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denominator) < 0.0001) return false;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;
  return ua > 0.02 && ua < 0.98 && ub > 0.02 && ub < 0.98;
}

function isLiteralColor(value: string): boolean {
  return !TOKEN_VALUES.has(value) && (value.startsWith('#') || /^[a-z]+$/i.test(value));
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const POLISH_TARGET_TITLE_SIZE = TARGET_TITLE_SIZE;
export const POLISH_MIN_TEXT_SIZE = MIN_TEXT_SIZE;
