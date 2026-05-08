import type { ElementBounds } from './polish';
import type { ElucimV2Element } from './types';

export type ElucimCompositeElement = ElucimV2Element;
export type ElucimConnectorAnchor = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type ElucimConnectorCurve = 'straight' | 'smooth';
export type ElucimTextAlign = 'left' | 'center' | 'right';

export interface ElucimConnectorPresetSpec {
  id: string;
  from: string;
  to: string;
  fromBounds: ElementBounds;
  toBounds: ElementBounds;
  fromAnchor?: ElucimConnectorAnchor;
  toAnchor?: ElucimConnectorAnchor;
  curve?: ElucimConnectorCurve;
  label?: string;
  relationship?: string;
  strokeToken?: string;
  strokeWidth?: number;
  startCap?: 'none' | 'arrow' | 'dot';
  endCap?: 'none' | 'arrow' | 'dot';
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface ElucimTextBlockPresetSpec {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize?: number;
  lineHeight?: number;
  fillToken?: string;
  align?: ElucimTextAlign;
  role?: string;
  importance?: 'primary' | 'secondary' | 'supporting' | 'decorative';
  maxLines?: number;
  parentId?: string;
}

export interface ElucimStepCardPresetSpec {
  id: string;
  x: number;
  y: number;
  title: string;
  body?: string;
  index?: number | string;
  status?: string;
  width?: number;
  height?: number;
  accentToken?: string;
  parentId?: string;
  rank?: number;
}

export interface ElucimCardGridItemSpec {
  id: string;
  title: string;
  body?: string;
  index?: number | string;
  status?: string;
  accentToken?: string;
}

export interface ElucimCardGridPresetSpec {
  id: string;
  x: number;
  y: number;
  items: ElucimCardGridItemSpec[];
  columns?: number;
  cardWidth?: number;
  cardHeight?: number;
  columnGap?: number;
  rowGap?: number;
}

export function createConnectorPreset(spec: ElucimConnectorPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  assertId(spec.from, 'from');
  assertId(spec.to, 'to');
  if (spec.from === spec.to) throw new Error('createConnectorPreset requires distinct from and to element IDs.');
  const from = anchorPoint(spec.fromBounds, spec.fromAnchor ?? 'right');
  const to = anchorPoint(spec.toBounds, spec.toAnchor ?? 'left');
  const stroke = spec.strokeToken ?? '$primary';
  const strokeWidth = spec.strokeWidth ?? 3;
  const curve = spec.curve ?? 'smooth';
  const relationship = spec.relationship ?? 'flows-to';
  const connectorIntent = {
    role: 'connector',
    importance: 'supporting' as const,
    flowFrom: [spec.from],
    flowTo: [spec.to],
    relationship,
  };
  const connector: ElucimCompositeElement = curve === 'straight'
    ? {
      id: `${spec.id}-line`,
      type: 'line',
      parentId: spec.label ? spec.id : undefined,
      role: 'connector',
      intent: connectorIntent,
      props: {
        type: 'line',
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        stroke,
        strokeWidth,
        lineStyle: spec.lineStyle ?? 'solid',
        strokeLinecap: 'round',
        startCap: spec.startCap ?? 'none',
        endCap: spec.endCap ?? 'arrow',
      },
    }
    : {
      id: `${spec.id}-curve`,
      type: 'bezierCurve',
      parentId: spec.label ? spec.id : undefined,
      role: 'connector',
      intent: connectorIntent,
      props: {
        type: 'bezierCurve',
        x1: from.x,
        y1: from.y,
        cx1: from.x + (to.x - from.x) * 0.45,
        cy1: from.y,
        cx2: from.x + (to.x - from.x) * 0.55,
        cy2: to.y,
        x2: to.x,
        y2: to.y,
        stroke,
        strokeWidth,
        fill: 'none',
        lineStyle: spec.lineStyle ?? 'solid',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        startCap: spec.startCap ?? 'none',
        endCap: spec.endCap ?? 'arrow',
      },
    };

  if (!spec.label) return [{ ...connector, id: spec.id, parentId: undefined }];

  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return [
    {
      id: spec.id,
      type: 'group',
      role: 'connector',
      intent: connectorIntent,
      layout: boundsFromPoints([from, to]),
      children: [connector.id, `${spec.id}-label`],
      props: {},
    },
    connector,
    {
      id: `${spec.id}-label`,
      type: 'text',
      parentId: spec.id,
      role: 'connector-label',
      intent: { role: 'label', importance: 'supporting', target: spec.id, relationship: 'labels' },
      props: {
        type: 'text',
        x: mid.x,
        y: mid.y - 10,
        content: spec.label,
        fontSize: 14,
        fill: '$muted',
        textAnchor: 'middle',
      },
    },
  ];
}

export function createTextBlockPreset(spec: ElucimTextBlockPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  assertPositive(spec.width, 'width');
  const fontSize = spec.fontSize ?? 18;
  assertPositive(fontSize, 'fontSize');
  const lineHeight = spec.lineHeight ?? Math.round(fontSize * 1.35);
  assertPositive(lineHeight, 'lineHeight');
  const lines = wrapText(spec.text, spec.width, fontSize, spec.maxLines);
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const textAnchor = spec.align === 'center' ? 'middle' : spec.align === 'right' ? 'end' : 'start';
  const x = spec.align === 'center' ? spec.x + spec.width / 2 : spec.align === 'right' ? spec.x + spec.width : spec.x;
  const children = lines.map((_, index) => `${spec.id}-line-${index + 1}`);

  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: spec.role ?? 'textBlock',
      intent: { role: spec.role ?? 'textBlock', importance: spec.importance ?? 'supporting' },
      layout: { x: spec.x, y: spec.y, width: spec.width, height },
      children,
      props: {},
    },
    ...lines.map((line, index): ElucimCompositeElement => ({
      id: children[index],
      type: 'text',
      parentId: spec.id,
      role: spec.role === 'title' && index === 0 ? 'title' : 'body',
      intent: { role: 'text-line', importance: spec.importance ?? 'supporting', group: spec.id },
      props: {
        type: 'text',
        x,
        y: spec.y + fontSize + index * lineHeight,
        content: line,
        fontSize,
        fill: spec.fillToken ?? '$muted',
        textAnchor,
      },
    })),
  ];
}

export function createStepCardPreset(spec: ElucimStepCardPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  const width = spec.width ?? 300;
  assertPositive(width, 'width');
  const bodyLines = spec.body ? wrapText(spec.body, width - 44, 16, 3) : [];
  const height = spec.height ?? Math.max(112, 76 + bodyLines.length * 22 + (spec.status ? 28 : 0));
  assertPositive(height, 'height');
  const accent = spec.accentToken ?? '$primary';
  const children = [
    `${spec.id}-card`,
    ...(spec.index === undefined ? [] : [`${spec.id}-index-bg`, `${spec.id}-index`]),
    `${spec.id}-title`,
    ...bodyLines.map((_, index) => `${spec.id}-body-line-${index + 1}`),
    ...(spec.status ? [`${spec.id}-status-bg`, `${spec.id}-status`] : []),
  ];

  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'stepCard',
      intent: { role: 'step', importance: 'primary', generated: true },
      layout: { x: spec.x, y: spec.y, width, height, rank: spec.rank },
      children,
      props: {},
    },
    {
      id: `${spec.id}-card`,
      type: 'rect',
      parentId: spec.id,
      role: 'container',
      intent: { role: 'container', importance: 'supporting', group: spec.id },
      props: { type: 'rect', x: spec.x, y: spec.y, width, height, rx: 18, fill: '$surface', stroke: accent, strokeWidth: 2 },
    },
    ...(spec.index === undefined ? [] : [
      {
        id: `${spec.id}-index-bg`,
        type: 'circle',
        parentId: spec.id,
        role: 'index',
        intent: { role: 'index', importance: 'secondary', group: spec.id },
        props: { type: 'circle', cx: spec.x + 30, cy: spec.y + 30, r: 15, fill: accent },
      },
      {
        id: `${spec.id}-index`,
        type: 'text',
        parentId: spec.id,
        role: 'index',
        intent: { role: 'index', importance: 'secondary', group: spec.id },
        props: { type: 'text', x: spec.x + 30, y: spec.y + 36, content: String(spec.index), fontSize: 16, fontWeight: 700, fill: '$background', textAnchor: 'middle' },
      },
    ] satisfies ElucimCompositeElement[]),
    {
      id: `${spec.id}-title`,
      type: 'text',
      parentId: spec.id,
      role: 'title',
      intent: { role: 'title', importance: 'secondary', group: spec.id },
      props: { type: 'text', x: spec.x + (spec.index === undefined ? 22 : 54), y: spec.y + 38, content: spec.title, fontSize: 21, fontWeight: 700, fill: '$title' },
    },
    ...bodyLines.map((line, index): ElucimCompositeElement => ({
      id: `${spec.id}-body-line-${index + 1}`,
      type: 'text',
      parentId: spec.id,
      role: 'body',
      intent: { role: 'body', importance: 'supporting', group: spec.id },
      props: { type: 'text', x: spec.x + 22, y: spec.y + 72 + index * 22, content: line, fontSize: 16, fill: '$muted' },
    })),
    ...(spec.status ? [
      {
        id: `${spec.id}-status-bg`,
        type: 'rect',
        parentId: spec.id,
        role: 'status',
        intent: { role: 'status', importance: 'supporting', group: spec.id },
        props: { type: 'rect', x: spec.x + 22, y: spec.y + height - 38, width: Math.max(64, spec.status.length * 9 + 22), height: 24, rx: 12, fill: '$surface', stroke: accent, strokeWidth: 1 },
      },
      {
        id: `${spec.id}-status`,
        type: 'text',
        parentId: spec.id,
        role: 'status',
        intent: { role: 'status', importance: 'supporting', group: spec.id },
        props: { type: 'text', x: spec.x + 34, y: spec.y + height - 21, content: spec.status, fontSize: 13, fontWeight: 600, fill: accent },
      },
    ] satisfies ElucimCompositeElement[] : []),
  ];
}

export function createCardGridPreset(spec: ElucimCardGridPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  if (spec.items.length === 0) throw new Error('createCardGridPreset requires at least one item.');
  const columns = Math.max(1, Math.floor(spec.columns ?? Math.ceil(Math.sqrt(spec.items.length || 1))));
  const cardWidth = spec.cardWidth ?? 300;
  const cardHeight = spec.cardHeight ?? 132;
  const columnGap = spec.columnGap ?? 28;
  const rowGap = spec.rowGap ?? 28;
  assertPositive(columns, 'columns');
  assertPositive(cardWidth, 'cardWidth');
  assertPositive(cardHeight, 'cardHeight');
  assertNonNegative(columnGap, 'columnGap');
  assertNonNegative(rowGap, 'rowGap');
  const rows = Math.max(1, Math.ceil(spec.items.length / columns));
  const children = spec.items.map(item => item.id);
  const cards = spec.items.flatMap((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return createStepCardPreset({
      ...item,
      parentId: spec.id,
      x: spec.x + column * (cardWidth + columnGap),
      y: spec.y + row * (cardHeight + rowGap),
      width: cardWidth,
      height: cardHeight,
      rank: index,
    });
  });

  return [
    {
      id: spec.id,
      type: 'group',
      role: 'cardGrid',
      intent: { role: 'card-grid', importance: 'primary', generated: true },
      layout: {
        x: spec.x,
        y: spec.y,
        width: columns * cardWidth + (columns - 1) * columnGap,
        height: rows * cardHeight + (rows - 1) * rowGap,
      },
      children,
      props: {},
    },
    ...cards,
  ];
}

function anchorPoint(bounds: ElementBounds, anchor: ElucimConnectorAnchor): { x: number; y: number } {
  switch (anchor) {
    case 'left':
      return { x: bounds.x, y: bounds.y + bounds.height / 2 };
    case 'right':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
    case 'top':
      return { x: bounds.x + bounds.width / 2, y: bounds.y };
    case 'bottom':
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
    case 'center':
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
}

function boundsFromPoints(points: Array<{ x: number; y: number }>) {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
}

function wrapText(text: string, width: number, fontSize: number, maxLines = Number.POSITIVE_INFINITY): string[] {
  if (maxLines !== Number.POSITIVE_INFINITY) assertPositive(maxLines, 'maxLines');
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const maxChars = Math.max(8, Math.floor(width / (fontSize * 0.55)));
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function assertId(value: string, name: string) {
  if (!value || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${name} must be a stable element ID starting with a letter and containing only letters, numbers, "_" or "-".`);
  }
}

function assertPositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number.`);
}

function assertNonNegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative finite number.`);
}
