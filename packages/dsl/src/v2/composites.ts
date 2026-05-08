import type { ElementBounds } from './polish';
import type { ElucimV2Element, ElucimV2Timeline } from './types';

export type ElucimCompositeElement = ElucimV2Element;
export type ElucimConnectorAnchor = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type ElucimConnectorCurve = 'straight' | 'smooth';
export type ElucimTextAlign = 'left' | 'center' | 'right';
export type ElucimAutoLayoutDirection = 'row' | 'column' | 'grid' | 'stack';
export type ElucimRoadmapOrientation = 'horizontal' | 'vertical';

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

export interface ElucimBadgePresetSpec {
  id: string;
  x: number;
  y: number;
  label: string;
  accentToken?: string;
  fillToken?: string;
  parentId?: string;
}

export interface ElucimBoundaryPresetSpec {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  accentToken?: string;
  fillToken?: string;
  parentId?: string;
  children?: string[];
}

export interface ElucimDecisionNodePresetSpec {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  accentToken?: string;
  parentId?: string;
  rank?: number;
}

export interface ElucimQueueStackItemSpec {
  id?: string;
  label: string;
  status?: string;
}

export interface ElucimQueueStackPresetSpec {
  id: string;
  x: number;
  y: number;
  items: ElucimQueueStackItemSpec[];
  orientation?: 'vertical' | 'horizontal';
  itemWidth?: number;
  itemHeight?: number;
  gap?: number;
  title?: string;
  accentToken?: string;
}

export interface ElucimRoadmapMilestoneSpec {
  id?: string;
  label: string;
  caption?: string;
  status?: string;
}

export interface ElucimTimelineRoadmapPresetSpec {
  id: string;
  x: number;
  y: number;
  milestones: ElucimRoadmapMilestoneSpec[];
  orientation?: ElucimRoadmapOrientation;
  spacing?: number;
  accentToken?: string;
  title?: string;
}

export interface ElucimComparisonTablePresetSpec {
  id: string;
  x: number;
  y: number;
  columns: string[];
  rows: Array<{ id?: string; label: string; cells: string[] }>;
  cellWidth?: number;
  cellHeight?: number;
  headerHeight?: number;
  accentToken?: string;
}

export interface ElucimAutoLayoutGroupItemSpec {
  id: string;
  width?: number;
  height?: number;
  element?: ElucimCompositeElement;
}

export interface ElucimAutoLayoutGroupPresetSpec {
  id: string;
  x: number;
  y: number;
  items: ElucimAutoLayoutGroupItemSpec[];
  direction?: ElucimAutoLayoutDirection;
  columns?: number;
  gap?: number;
  parentId?: string;
}

export interface ElucimProgressiveRevealGroupPresetSpec {
  id: string;
  targets: string[];
  timelineId?: string;
  duration?: number;
  stagger?: number;
  parentId?: string;
}

export interface ElucimProgressiveRevealGroupPreset {
  elements: ElucimCompositeElement[];
  timeline: ElucimV2Timeline;
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

export function createBadgePreset(spec: ElucimBadgePresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  const width = Math.max(58, spec.label.length * 8 + 28);
  const height = 28;
  const accent = spec.accentToken ?? '$primary';
  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'badge',
      intent: { role: 'badge', importance: 'supporting', generated: true },
      layout: { x: spec.x, y: spec.y, width, height },
      children: [`${spec.id}-bg`, `${spec.id}-label`],
      props: {},
    },
    {
      id: `${spec.id}-bg`,
      type: 'rect',
      parentId: spec.id,
      role: 'badge-background',
      intent: { role: 'badge-background', importance: 'decorative', group: spec.id },
      props: { type: 'rect', x: spec.x, y: spec.y, width, height, rx: height / 2, fill: spec.fillToken ?? '$surface', stroke: accent, strokeWidth: 1.5 },
    },
    {
      id: `${spec.id}-label`,
      type: 'text',
      parentId: spec.id,
      role: 'label',
      intent: { role: 'label', importance: 'supporting', group: spec.id },
      props: { type: 'text', x: spec.x + width / 2, y: spec.y + 19, content: spec.label, fontSize: 13, fontWeight: 700, fill: accent, textAnchor: 'middle' },
    },
  ];
}

export function createBoundaryPreset(spec: ElucimBoundaryPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  assertPositive(spec.width, 'width');
  assertPositive(spec.height, 'height');
  const accent = spec.accentToken ?? '$border';
  const ownChildren = [`${spec.id}-box`, ...(spec.label ? [`${spec.id}-label-bg`, `${spec.id}-label`] : []), ...(spec.children ?? [])];
  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'boundary',
      intent: { role: 'boundary', importance: 'supporting', generated: true },
      layout: { x: spec.x, y: spec.y, width: spec.width, height: spec.height },
      children: ownChildren,
      props: {},
    },
    {
      id: `${spec.id}-box`,
      type: 'rect',
      parentId: spec.id,
      role: 'container',
      intent: { role: 'container', importance: 'decorative', group: spec.id },
      props: { type: 'rect', x: spec.x, y: spec.y, width: spec.width, height: spec.height, rx: 18, fill: spec.fillToken ?? 'none', stroke: accent, strokeWidth: 2, strokeDasharray: '8 6' },
    },
    ...(spec.label ? [
      {
        id: `${spec.id}-label-bg`,
        type: 'rect',
        parentId: spec.id,
        role: 'label-background',
        intent: { role: 'label-background', importance: 'decorative', group: spec.id },
        props: { type: 'rect', x: spec.x + 18, y: spec.y - 14, width: Math.max(86, spec.label.length * 9 + 24), height: 28, rx: 14, fill: '$background', stroke: accent, strokeWidth: 1 },
      },
      {
        id: `${spec.id}-label`,
        type: 'text',
        parentId: spec.id,
        role: 'label',
        intent: { role: 'label', importance: 'supporting', group: spec.id },
        props: { type: 'text', x: spec.x + 30, y: spec.y + 5, content: spec.label, fontSize: 14, fontWeight: 700, fill: accent },
      },
    ] satisfies ElucimCompositeElement[] : []),
  ];
}

export function createDecisionNodePreset(spec: ElucimDecisionNodePresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  const width = spec.width ?? 220;
  const height = spec.height ?? 140;
  assertPositive(width, 'width');
  assertPositive(height, 'height');
  const accent = spec.accentToken ?? '$warning';
  const text = createTextBlockPreset({
    id: `${spec.id}-text`,
    parentId: spec.id,
    x: spec.x + width * 0.22,
    y: spec.y + height * 0.34,
    width: width * 0.56,
    text: spec.text,
    fontSize: 17,
    fillToken: '$title',
    align: 'center',
    role: 'decision-label',
  });
  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'decisionNode',
      intent: { role: 'decision', importance: 'primary', generated: true },
      layout: { x: spec.x, y: spec.y, width, height, rank: spec.rank },
      children: [`${spec.id}-diamond`, `${spec.id}-text`],
      props: {},
    },
    {
      id: `${spec.id}-diamond`,
      type: 'polygon',
      parentId: spec.id,
      role: 'decision-shape',
      intent: { role: 'container', importance: 'supporting', group: spec.id },
      props: {
        type: 'polygon',
        points: [[spec.x + width / 2, spec.y], [spec.x + width, spec.y + height / 2], [spec.x + width / 2, spec.y + height], [spec.x, spec.y + height / 2]],
        fill: '$surface',
        stroke: accent,
        strokeWidth: 2,
        closed: true,
      },
    },
    ...text,
  ];
}

export function createQueueStackPreset(spec: ElucimQueueStackPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  if (spec.items.length === 0) throw new Error('createQueueStackPreset requires at least one item.');
  const itemWidth = spec.itemWidth ?? 260;
  const itemHeight = spec.itemHeight ?? 52;
  const gap = spec.gap ?? 10;
  const vertical = spec.orientation !== 'horizontal';
  const titleHeight = spec.title ? 34 : 0;
  const width = vertical ? itemWidth : spec.items.length * itemWidth + (spec.items.length - 1) * gap;
  const height = vertical ? titleHeight + spec.items.length * itemHeight + (spec.items.length - 1) * gap : titleHeight + itemHeight;
  const children = [
    ...(spec.title ? [`${spec.id}-title`] : []),
    ...spec.items.flatMap((item, index) => [`${spec.id}-${item.id ?? `item-${index + 1}`}-card`, `${spec.id}-${item.id ?? `item-${index + 1}`}-label`]),
  ];
  return [
    {
      id: spec.id,
      type: 'group',
      role: 'queueStack',
      intent: { role: vertical ? 'stack' : 'queue', importance: 'primary', generated: true },
      layout: { x: spec.x, y: spec.y, width, height },
      children,
      props: {},
    },
    ...(spec.title ? [{
      id: `${spec.id}-title`,
      type: 'text',
      parentId: spec.id,
      role: 'title',
      intent: { role: 'title', importance: 'secondary', group: spec.id },
      props: { type: 'text', x: spec.x, y: spec.y + 22, content: spec.title, fontSize: 18, fontWeight: 700, fill: '$title' },
    } satisfies ElucimCompositeElement] : []),
    ...spec.items.flatMap((item, index): ElucimCompositeElement[] => {
      const itemId = item.id ?? `item-${index + 1}`;
      const x = spec.x + (vertical ? 0 : index * (itemWidth + gap));
      const y = spec.y + titleHeight + (vertical ? index * (itemHeight + gap) : 0);
      return [
        {
          id: `${spec.id}-${itemId}-card`,
          type: 'rect',
          parentId: spec.id,
          role: 'queue-item',
          intent: { role: 'queue-item', importance: 'supporting', group: spec.id },
          props: { type: 'rect', x, y, width: itemWidth, height: itemHeight, rx: 14, fill: '$surface', stroke: spec.accentToken ?? '$border', strokeWidth: 1.5 },
        },
        {
          id: `${spec.id}-${itemId}-label`,
          type: 'text',
          parentId: spec.id,
          role: 'label',
          intent: { role: 'label', importance: 'supporting', group: spec.id },
          props: { type: 'text', x: x + 18, y: y + 32, content: item.status ? `${item.label} - ${item.status}` : item.label, fontSize: 16, fill: '$title' },
        },
      ];
    }),
  ];
}

export function createTimelineRoadmapPreset(spec: ElucimTimelineRoadmapPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  if (spec.milestones.length === 0) throw new Error('createTimelineRoadmapPreset requires at least one milestone.');
  const spacing = spec.spacing ?? 170;
  const horizontal = spec.orientation !== 'vertical';
  const titleHeight = spec.title ? 42 : 0;
  const length = Math.max(1, spec.milestones.length - 1) * spacing;
  const width = horizontal ? length + 80 : 260;
  const height = horizontal ? titleHeight + 130 : titleHeight + length + 80;
  const axisY = spec.y + titleHeight + 34;
  const axisX = spec.x + 34;
  const children = [
    ...(spec.title ? [`${spec.id}-title`] : []),
    `${spec.id}-axis`,
    ...spec.milestones.flatMap((milestone, index) => {
      const id = milestone.id ?? `milestone-${index + 1}`;
      return [`${spec.id}-${id}-dot`, `${spec.id}-${id}-label`, ...(milestone.caption ? [`${spec.id}-${id}-caption`] : [])];
    }),
  ];
  return [
    {
      id: spec.id,
      type: 'group',
      role: 'roadmap',
      intent: { role: 'timeline', importance: 'primary', generated: true },
      layout: { x: spec.x, y: spec.y, width, height },
      children,
      props: {},
    },
    ...(spec.title ? [{
      id: `${spec.id}-title`,
      type: 'text',
      parentId: spec.id,
      role: 'title',
      intent: { role: 'title', importance: 'secondary', group: spec.id },
      props: { type: 'text', x: spec.x, y: spec.y + 26, content: spec.title, fontSize: 22, fontWeight: 700, fill: '$title' },
    } satisfies ElucimCompositeElement] : []),
    {
      id: `${spec.id}-axis`,
      type: 'line',
      parentId: spec.id,
      role: 'timeline-axis',
      intent: { role: 'axis', importance: 'decorative', group: spec.id },
      props: { type: 'line', x1: axisX, y1: axisY, x2: horizontal ? axisX + length : axisX, y2: horizontal ? axisY : axisY + length, stroke: spec.accentToken ?? '$primary', strokeWidth: 3, strokeLinecap: 'round' },
    },
    ...spec.milestones.flatMap((milestone, index): ElucimCompositeElement[] => {
      const id = milestone.id ?? `milestone-${index + 1}`;
      const x = horizontal ? axisX + index * spacing : axisX;
      const y = horizontal ? axisY : axisY + index * spacing;
      return [
        {
          id: `${spec.id}-${id}-dot`,
          type: 'circle',
          parentId: spec.id,
          role: 'milestone',
          intent: { role: 'milestone', importance: 'primary', group: spec.id },
          layout: { rank: index },
          props: { type: 'circle', cx: x, cy: y, r: 11, fill: '$background', stroke: spec.accentToken ?? '$primary', strokeWidth: 3 },
        },
        {
          id: `${spec.id}-${id}-label`,
          type: 'text',
          parentId: spec.id,
          role: 'label',
          intent: { role: 'label', importance: 'supporting', group: spec.id },
          props: { type: 'text', x: horizontal ? x : x + 28, y: horizontal ? y + 36 : y + 5, content: milestone.status ? `${milestone.label} (${milestone.status})` : milestone.label, fontSize: 16, fontWeight: 700, fill: '$title', textAnchor: horizontal ? 'middle' : 'start' },
        },
        ...(milestone.caption ? [{
          id: `${spec.id}-${id}-caption`,
          type: 'text',
          parentId: spec.id,
          role: 'caption',
          intent: { role: 'caption', importance: 'supporting', group: spec.id },
          props: { type: 'text', x: horizontal ? x : x + 28, y: horizontal ? y + 58 : y + 27, content: milestone.caption, fontSize: 13, fill: '$muted', textAnchor: horizontal ? 'middle' : 'start' },
        } satisfies ElucimCompositeElement] : []),
      ];
    }),
  ];
}

export function createComparisonTablePreset(spec: ElucimComparisonTablePresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  if (spec.columns.length === 0) throw new Error('createComparisonTablePreset requires at least one column.');
  const cellWidth = spec.cellWidth ?? 180;
  const cellHeight = spec.cellHeight ?? 56;
  const headerHeight = spec.headerHeight ?? 48;
  const rowLabelWidth = cellWidth;
  const width = rowLabelWidth + spec.columns.length * cellWidth;
  const height = headerHeight + spec.rows.length * cellHeight;
  const children = [`${spec.id}-bg`, ...spec.columns.map((_, index) => `${spec.id}-header-${index + 1}`), ...spec.rows.flatMap((row, rowIndex) => {
    const rowId = row.id ?? `row-${rowIndex + 1}`;
    return [`${spec.id}-${rowId}-label`, ...spec.columns.map((_, columnIndex) => `${spec.id}-${rowId}-cell-${columnIndex + 1}`)];
  })];
  return [
    {
      id: spec.id,
      type: 'group',
      role: 'comparisonTable',
      intent: { role: 'comparison-table', importance: 'primary', generated: true },
      layout: { x: spec.x, y: spec.y, width, height },
      children,
      props: {},
    },
    {
      id: `${spec.id}-bg`,
      type: 'rect',
      parentId: spec.id,
      role: 'container',
      intent: { role: 'container', importance: 'decorative', group: spec.id },
      props: { type: 'rect', x: spec.x, y: spec.y, width, height, rx: 16, fill: '$surface', stroke: spec.accentToken ?? '$border', strokeWidth: 1.5 },
    },
    ...spec.columns.map((column, index): ElucimCompositeElement => ({
      id: `${spec.id}-header-${index + 1}`,
      type: 'text',
      parentId: spec.id,
      role: 'column-header',
      intent: { role: 'column-header', importance: 'secondary', group: spec.id },
      props: { type: 'text', x: spec.x + rowLabelWidth + index * cellWidth + cellWidth / 2, y: spec.y + 30, content: column, fontSize: 15, fontWeight: 700, fill: '$title', textAnchor: 'middle' },
    })),
    ...spec.rows.flatMap((row, rowIndex): ElucimCompositeElement[] => {
      const rowId = row.id ?? `row-${rowIndex + 1}`;
      const y = spec.y + headerHeight + rowIndex * cellHeight;
      return [
        {
          id: `${spec.id}-${rowId}-label`,
          type: 'text',
          parentId: spec.id,
          role: 'row-header',
          intent: { role: 'row-header', importance: 'secondary', group: spec.id },
          props: { type: 'text', x: spec.x + 18, y: y + 34, content: row.label, fontSize: 15, fontWeight: 700, fill: '$title' },
        },
        ...spec.columns.map((_, columnIndex): ElucimCompositeElement => ({
          id: `${spec.id}-${rowId}-cell-${columnIndex + 1}`,
          type: 'text',
          parentId: spec.id,
          role: 'cell',
          intent: { role: 'cell', importance: 'supporting', group: spec.id },
          props: { type: 'text', x: spec.x + rowLabelWidth + columnIndex * cellWidth + cellWidth / 2, y: y + 34, content: row.cells[columnIndex] ?? '', fontSize: 14, fill: '$muted', textAnchor: 'middle' },
        })),
      ];
    }),
  ];
}

export function createAutoLayoutGroupPreset(spec: ElucimAutoLayoutGroupPresetSpec): ElucimCompositeElement[] {
  assertId(spec.id, 'id');
  if (spec.items.length === 0) throw new Error('createAutoLayoutGroupPreset requires at least one item.');
  const direction = spec.direction ?? 'row';
  const gap = spec.gap ?? 24;
  const columns = Math.max(1, Math.floor(spec.columns ?? Math.ceil(Math.sqrt(spec.items.length))));
  const positioned = spec.items.map((item, index) => {
    const width = item.width ?? numberProp(item.element?.layout?.width) ?? numberProp(item.element?.props.width) ?? 120;
    const height = item.height ?? numberProp(item.element?.layout?.height) ?? numberProp(item.element?.props.height) ?? 80;
    const column = direction === 'column' ? 0 : direction === 'grid' ? index % columns : index;
    const row = direction === 'row' ? 0 : direction === 'grid' ? Math.floor(index / columns) : index;
    const x = direction === 'stack' ? spec.x + index * 8 : spec.x + column * (width + gap);
    const y = direction === 'stack' ? spec.y + index * 8 : spec.y + row * (height + gap);
    return { item, x, y, width, height };
  });
  const elements = positioned.flatMap(({ item, x, y }) => item.element ? [moveCompositeRoot(item.element, x, y, spec.id)] : []);
  return [
    {
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'autoLayoutGroup',
      intent: { role: 'auto-layout', importance: 'supporting', generated: true },
      layout: unionLayout(positioned.map(item => ({ x: item.x, y: item.y, width: item.width, height: item.height }))),
      children: spec.items.map(item => item.id),
      props: {},
    },
    ...elements,
  ];
}

export function createProgressiveRevealGroupPreset(spec: ElucimProgressiveRevealGroupPresetSpec): ElucimProgressiveRevealGroupPreset {
  assertId(spec.id, 'id');
  if (spec.targets.length === 0) throw new Error('createProgressiveRevealGroupPreset requires at least one target.');
  const duration = spec.duration ?? 30;
  const stagger = spec.stagger ?? 8;
  assertPositive(duration, 'duration');
  assertNonNegative(stagger, 'stagger');
  return {
    elements: [{
      id: spec.id,
      type: 'group',
      parentId: spec.parentId,
      role: 'progressiveRevealGroup',
      intent: { role: 'progressive-reveal', importance: 'supporting', generated: true },
      props: { targets: [...spec.targets] },
    }],
    timeline: {
      id: spec.timelineId ?? `${spec.id}-reveal`,
      duration: duration + Math.max(0, spec.targets.length - 1) * stagger,
      tracks: spec.targets.map((target, index) => ({
        target,
        property: 'opacity',
        keyframes: [
          { frame: index * stagger, value: 0 },
          { frame: index * stagger + duration, value: 1, easing: 'easeOutCubic' },
        ],
      })),
    },
  };
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

function unionLayout(bounds: Array<{ x: number; y: number; width: number; height: number }>) {
  const left = Math.min(...bounds.map(bound => bound.x));
  const top = Math.min(...bounds.map(bound => bound.y));
  const right = Math.max(...bounds.map(bound => bound.x + bound.width));
  const bottom = Math.max(...bounds.map(bound => bound.y + bound.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function moveCompositeRoot(element: ElucimCompositeElement, x: number, y: number, parentId: string): ElucimCompositeElement {
  const layoutWidth = numberProp(element.layout?.width);
  const layoutHeight = numberProp(element.layout?.height);
  const propsWidth = numberProp(element.props.width);
  const propsHeight = numberProp(element.props.height);
  return {
    ...element,
    parentId,
    layout: {
      ...element.layout,
      x,
      y,
      ...(layoutWidth !== undefined || propsWidth !== undefined ? { width: layoutWidth ?? propsWidth } : {}),
      ...(layoutHeight !== undefined || propsHeight !== undefined ? { height: layoutHeight ?? propsHeight } : {}),
    },
    props: moveElementProps(element.props, x, y),
  };
}

function moveElementProps(props: Record<string, unknown>, x: number, y: number): Record<string, unknown> {
  if (typeof props.x === 'number' || typeof props.y === 'number') {
    return { ...props, ...(typeof props.x === 'number' ? { x } : {}), ...(typeof props.y === 'number' ? { y } : {}) };
  }
  if (typeof props.cx === 'number' || typeof props.cy === 'number') {
    return { ...props, ...(typeof props.cx === 'number' ? { cx: x } : {}), ...(typeof props.cy === 'number' ? { cy: y } : {}) };
  }
  return props;
}

function numberProp(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
