import type { ElucimDocument, ElucimMetadata, ElucimScene } from './types';
import { createConnectorPreset, createStepCardPreset, createTextBoxPreset, type ElucimCompositeElement } from './composites';

export interface ElucimAgentSafeScenePreset {
  scene: ElucimScene;
  elements: ElucimCompositeElement[];
  rootElementIds: string[];
  width: number;
  height: number;
}

export interface ElucimAgentSafeDocumentOptions {
  metadata?: ElucimMetadata;
  fps?: number;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
}

export interface ElucimTextCalloutSceneSpec {
  id: string;
  title: string;
  body: string;
  subtitle?: string;
  callout?: string;
  width?: number;
  height?: number;
  background?: string;
}

export interface ElucimThreeCardFlowItemSpec {
  id: string;
  title: string;
  body: string;
  status?: string;
}

export interface ElucimThreeCardFlowSceneSpec {
  id: string;
  title: string;
  subtitle?: string;
  items: ElucimThreeCardFlowItemSpec[];
  width?: number;
  height?: number;
  background?: string;
}

export interface ElucimComparisonSceneRowSpec {
  id?: string;
  label: string;
  cells: string[];
}

export interface ElucimComparisonSceneSpec {
  id: string;
  title: string;
  subtitle?: string;
  rowsHeader?: string;
  columns: string[];
  rows: ElucimComparisonSceneRowSpec[];
  width?: number;
  height?: number;
  background?: string;
}

export interface ElucimCalculusDerivativeSceneSpec {
  id: string;
  title?: string;
  subtitle?: string;
  fn?: string;
  derivative?: string;
  x?: number;
  dx?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  width?: number;
  height?: number;
  background?: string;
}

export interface ElucimCalculusRiemannSceneSpec {
  id: string;
  title?: string;
  subtitle?: string;
  fn?: string;
  interval?: [number, number];
  n?: number;
  method?: 'left' | 'right' | 'midpoint';
  xRange?: [number, number];
  yRange?: [number, number];
  width?: number;
  height?: number;
  background?: string;
}

export interface ElucimCalculusAccumulationSceneSpec {
  id: string;
  title?: string;
  subtitle?: string;
  fn?: string;
  from?: number;
  to?: number;
  samples?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  width?: number;
  height?: number;
  background?: string;
}

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const SAFE_MARGIN_X = 96;
const SAFE_MARGIN_Y = 64;
const MIN_COMPARISON_ROW_HEIGHT = 72;

export function createAgentSafeDocument(
  preset: ElucimAgentSafeScenePreset,
  options: ElucimAgentSafeDocumentOptions = {}
): ElucimDocument {
  return {
    version: '2.0',
    scene: {
      ...preset.scene,
      fps: options.fps ?? preset.scene.fps,
      controls: options.controls ?? preset.scene.controls,
      loop: options.loop ?? preset.scene.loop,
      autoPlay: options.autoPlay ?? preset.scene.autoPlay,
    },
    elements: elementsById(preset.elements),
    metadata: options.metadata,
  };
}

export function createTextCalloutScenePreset(spec: ElucimTextCalloutSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const contentWidth = width - SAFE_MARGIN_X * 2;
  const titleHeight = spec.subtitle ? 72 : 88;
  const bodyTop = SAFE_MARGIN_Y + titleHeight + (spec.subtitle ? 58 : 34);
  const calloutHeight = spec.callout ? 108 : 0;
  const bodyHeight = Math.max(180, height - bodyTop - SAFE_MARGIN_Y - calloutHeight - (spec.callout ? 28 : 0));
  if (contentWidth < 320) throw new Error('createTextCalloutScenePreset requires width to leave at least 320px of safe content space.');
  if (bodyTop + bodyHeight + SAFE_MARGIN_Y + calloutHeight + (spec.callout ? 28 : 0) > height) {
    throw new Error('createTextCalloutScenePreset requires height to fit title, body, and callout regions.');
  }
  const rootElementIds = [
    `${spec.id}-title`,
    ...(spec.subtitle ? [`${spec.id}-subtitle`] : []),
    `${spec.id}-body`,
    ...(spec.callout ? [`${spec.id}-callout`] : []),
  ];
  const elements: ElucimCompositeElement[] = [
    ...createTextBoxPreset({
      id: `${spec.id}-title`,
      x: SAFE_MARGIN_X,
      y: SAFE_MARGIN_Y,
      width: contentWidth,
      height: titleHeight,
      text: spec.title,
      fontSize: 44,
      minFontSize: 28,
      fontWeight: 800,
      lineHeight: 1.08,
      fillToken: '$title',
      background: 'none',
      padding: 0,
      autoFit: 'shrink',
      role: 'title',
      importance: 'primary',
    }),
    ...(spec.subtitle ? createTextBoxPreset({
      id: `${spec.id}-subtitle`,
      x: SAFE_MARGIN_X,
      y: SAFE_MARGIN_Y + titleHeight + 10,
      width: contentWidth,
      height: 46,
      text: spec.subtitle,
      fontSize: 22,
      minFontSize: 16,
      lineHeight: 1.2,
      fillToken: '$muted',
      background: 'none',
      padding: 0,
      autoFit: 'shrink',
      role: 'subtitle',
      importance: 'secondary',
    }) : []),
    ...createTextBoxPreset({
      id: `${spec.id}-body`,
      x: SAFE_MARGIN_X,
      y: bodyTop,
      width: contentWidth,
      height: bodyHeight,
      text: spec.body,
      fontSize: 28,
      minFontSize: 18,
      lineHeight: 1.22,
      fillToken: '$foreground',
      backgroundFillToken: '$surface',
      backgroundStrokeToken: '$border',
      padding: { x: 28, y: 24 },
      autoFit: 'shrink',
      role: 'body',
      importance: 'primary',
    }),
    ...(spec.callout ? createTextBoxPreset({
      id: `${spec.id}-callout`,
      x: SAFE_MARGIN_X,
      y: height - SAFE_MARGIN_Y - calloutHeight,
      width: contentWidth,
      height: calloutHeight,
      text: spec.callout,
      fontSize: 24,
      minFontSize: 16,
      lineHeight: 1.18,
      fillToken: '$title',
      backgroundFillToken: '$surface',
      backgroundStrokeToken: '$primary',
      padding: { x: 24, y: 18 },
      autoFit: 'shrink',
      role: 'callout',
      importance: 'primary',
    }) : []),
  ];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements });
}

export function createThreeCardFlowScenePreset(spec: ElucimThreeCardFlowSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  if (spec.items.length === 0) throw new Error('createThreeCardFlowScenePreset requires at least one item.');
  if (spec.items.length > 4) throw new Error('createThreeCardFlowScenePreset supports at most four items.');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const contentWidth = width - SAFE_MARGIN_X * 2;
  const titleElements = createTemplateTitle(spec.id, spec.title, spec.subtitle, width);
  const titleBlockHeight = spec.subtitle ? 124 : 86;
  const gap = 32;
  const cardCount = spec.items.length;
  const cardWidth = Math.floor((contentWidth - gap * (cardCount - 1)) / cardCount);
  const cardHeight = Math.min(250, Math.max(176, height - SAFE_MARGIN_Y * 2 - titleBlockHeight - 48));
  const cardY = SAFE_MARGIN_Y + titleBlockHeight + 36;
  const cards = spec.items.flatMap((item, index) => createStepCardPreset({
    id: item.id,
    x: SAFE_MARGIN_X + index * (cardWidth + gap),
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    title: item.title,
    body: item.body,
    index: index + 1,
    status: item.status,
    rank: index,
  }));
  const connectors = spec.items.slice(0, -1).flatMap((item, index) => {
    const fromX = SAFE_MARGIN_X + index * (cardWidth + gap);
    const toX = SAFE_MARGIN_X + (index + 1) * (cardWidth + gap);
    return createConnectorPreset({
      id: `${spec.id}-${item.id}-to-${spec.items[index + 1].id}`,
      from: item.id,
      to: spec.items[index + 1].id,
      fromBounds: { id: item.id, x: fromX, y: cardY, width: cardWidth, height: cardHeight },
      toBounds: { id: spec.items[index + 1].id, x: toX, y: cardY, width: cardWidth, height: cardHeight },
      strokeToken: '$muted',
      strokeWidth: 2,
    });
  });
  const rootElementIds = [
    `${spec.id}-title`,
    ...(spec.subtitle ? [`${spec.id}-subtitle`] : []),
    ...spec.items.map(item => item.id),
    ...spec.items.slice(0, -1).map((item, index) => `${spec.id}-${item.id}-to-${spec.items[index + 1].id}`),
  ];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements: [...titleElements, ...cards, ...connectors] });
}

export function createComparisonScenePreset(spec: ElucimComparisonSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  if (spec.columns.length === 0) throw new Error('createComparisonScenePreset requires at least one column.');
  if (spec.rows.length === 0) throw new Error('createComparisonScenePreset requires at least one row.');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const titleElements = createTemplateTitle(spec.id, spec.title, spec.subtitle, width);
  const titleBlockHeight = spec.subtitle ? 124 : 86;
  const tableX = SAFE_MARGIN_X;
  const tableY = SAFE_MARGIN_Y + titleBlockHeight + 24;
  const tableWidth = width - SAFE_MARGIN_X * 2;
  const tableHeight = height - tableY - SAFE_MARGIN_Y;
  const labelWidth = Math.min(260, Math.max(180, tableWidth * 0.22));
  const columnWidth = (tableWidth - labelWidth) / spec.columns.length;
  const headerHeight = 70;
  const rowsHeight = tableHeight - headerHeight;
  if (rowsHeight < MIN_COMPARISON_ROW_HEIGHT) {
    throw new Error('createComparisonScenePreset requires enough height for the comparison table.');
  }
  if (spec.rows.length * MIN_COMPARISON_ROW_HEIGHT > rowsHeight) {
    throw new Error(`createComparisonScenePreset supports at most ${Math.floor(rowsHeight / MIN_COMPARISON_ROW_HEIGHT)} rows at this scene height.`);
  }
  const rowHeight = rowsHeight / spec.rows.length;
  const tableChildren = [
    `${spec.id}-table-bg`,
    `${spec.id}-row-header-label`,
    ...spec.columns.flatMap((_, index) => [`${spec.id}-header-${index + 1}-bg`, `${spec.id}-header-${index + 1}`]),
    ...spec.rows.flatMap((row, rowIndex) => {
      const rowId = row.id ?? `row-${rowIndex + 1}`;
      return [
        `${spec.id}-${rowId}-label-bg`,
        `${spec.id}-${rowId}-label`,
        ...spec.columns.flatMap((_, columnIndex) => [`${spec.id}-${rowId}-cell-${columnIndex + 1}-bg`, `${spec.id}-${rowId}-cell-${columnIndex + 1}`]),
      ];
    }),
  ];
  const tableElements: ElucimCompositeElement[] = [
    {
      id: `${spec.id}-table`,
      type: 'group',
      role: 'comparisonTable',
      intent: { role: 'comparison-table', importance: 'primary', generated: true },
      layout: { x: tableX, y: tableY, width: tableWidth, height: tableHeight },
      children: tableChildren,
      props: {},
    },
    {
      id: `${spec.id}-table-bg`,
      type: 'rect',
      parentId: `${spec.id}-table`,
      role: 'container',
      intent: { role: 'container', importance: 'decorative', group: `${spec.id}-table` },
      props: { type: 'rect', x: tableX, y: tableY, width: tableWidth, height: tableHeight, rx: 18, fill: '$surface', stroke: '$border', strokeWidth: 1.5 },
    },
    ...createTextBoxPreset({
      id: `${spec.id}-row-header-label`,
      parentId: `${spec.id}-table`,
      x: tableX + 16,
      y: tableY + 16,
      width: labelWidth - 32,
      height: headerHeight - 28,
      text: spec.rowsHeader ?? 'Dimension',
      fontSize: 15,
      minFontSize: 12,
      fontWeight: 700,
      fillToken: '$muted',
      background: 'none',
      padding: 0,
      autoFit: 'shrink',
      role: 'column-header',
      importance: 'secondary',
    }),
    ...spec.columns.flatMap((column, index) => {
      const x = tableX + labelWidth + index * columnWidth;
      return [
        tableCellBackground(`${spec.id}-header-${index + 1}-bg`, `${spec.id}-table`, x, tableY, columnWidth, headerHeight, '$background'),
        ...createTextBoxPreset({
          id: `${spec.id}-header-${index + 1}`,
          parentId: `${spec.id}-table`,
          x: x + 14,
          y: tableY + 14,
          width: columnWidth - 28,
          height: headerHeight - 26,
          text: column,
          fontSize: 18,
          minFontSize: 13,
          fontWeight: 800,
          fillToken: '$title',
          background: 'none',
          padding: 0,
          autoFit: 'shrink',
          role: 'column-header',
          importance: 'secondary',
        }),
      ];
    }),
    ...spec.rows.flatMap((row, rowIndex) => {
      const rowId = row.id ?? `row-${rowIndex + 1}`;
      const y = tableY + headerHeight + rowIndex * rowHeight;
      return [
        tableCellBackground(`${spec.id}-${rowId}-label-bg`, `${spec.id}-table`, tableX, y, labelWidth, rowHeight, '$surface'),
        ...createTextBoxPreset({
          id: `${spec.id}-${rowId}-label`,
          parentId: `${spec.id}-table`,
          x: tableX + 16,
          y: y + 14,
          width: labelWidth - 32,
          height: rowHeight - 26,
          text: row.label,
          fontSize: 16,
          minFontSize: 12,
          fontWeight: 700,
          fillToken: '$title',
          background: 'none',
          padding: 0,
          autoFit: 'shrink',
          role: 'row-header',
          importance: 'secondary',
        }),
        ...spec.columns.flatMap((_, columnIndex) => {
          const x = tableX + labelWidth + columnIndex * columnWidth;
          return [
            tableCellBackground(`${spec.id}-${rowId}-cell-${columnIndex + 1}-bg`, `${spec.id}-table`, x, y, columnWidth, rowHeight, '$surface'),
            ...createTextBoxPreset({
              id: `${spec.id}-${rowId}-cell-${columnIndex + 1}`,
              parentId: `${spec.id}-table`,
              x: x + 14,
              y: y + 14,
              width: columnWidth - 28,
              height: rowHeight - 26,
              text: row.cells[columnIndex] ?? '',
              fontSize: 15,
              minFontSize: 11,
              lineHeight: 1.18,
              fillToken: '$muted',
              background: 'none',
              padding: 0,
              autoFit: 'shrink',
              role: 'cell',
              importance: 'supporting',
            }),
          ];
        }),
      ];
    }),
  ];
  const rootElementIds = [`${spec.id}-title`, ...(spec.subtitle ? [`${spec.id}-subtitle`] : []), `${spec.id}-table`];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements: [...titleElements, ...tableElements] });
}

export function createCalculusDerivativeScenePreset(spec: ElucimCalculusDerivativeSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const graph = calculusGraph(width, height, spec.xRange ?? [-1, 4], spec.yRange ?? [-1, 8]);
  const fn = spec.fn ?? 'x^2';
  const derivative = spec.derivative ?? '2*x';
  const x = finiteOrDefault(spec.x, 1.6, 'x');
  const dx = nonZeroOrDefault(spec.dx, 0.9, 'dx');
  const titleElements = createTemplateTitle(
    spec.id,
    spec.title ?? 'Derivative as local slope',
    spec.subtitle ?? 'Compare the secant slope over an interval with the tangent slope at one point.',
    width,
  );
  const rootElementIds = [
    `${spec.id}-title`,
    `${spec.id}-subtitle`,
    `${spec.id}-axes`,
    `${spec.id}-curve`,
    `${spec.id}-secant`,
    `${spec.id}-tangent`,
    `${spec.id}-explain`,
  ];
  const elements: ElucimCompositeElement[] = [
    ...titleElements,
    calculusAxes(`${spec.id}-axes`, graph, 'Axes for derivative lesson'),
    calculusFunctionPlot(`${spec.id}-curve`, fn, graph, 'Function curve for derivative lesson'),
    {
      id: `${spec.id}-secant`,
      type: 'secantLine',
      role: 'calculus-secant',
      intent: { role: 'secant-line', importance: 'primary', generated: true, relationship: 'approximates tangent slope' },
      props: {
        type: 'secantLine',
        fn,
        x,
        dx,
        length: 4.2,
        origin: graph.origin,
        scale: graph.scale,
        stroke: '#f59e0b',
        strokeWidth: 4,
        label: 'secant: average rate',
        showPoints: true,
      },
    },
    {
      id: `${spec.id}-tangent`,
      type: 'tangentLine',
      role: 'calculus-tangent',
      intent: { role: 'tangent-line', importance: 'primary', generated: true, relationship: 'local derivative slope' },
      props: {
        type: 'tangentLine',
        fn,
        derivative,
        x: x + dx,
        length: 4.2,
        origin: graph.origin,
        scale: graph.scale,
        stroke: '#22c55e',
        strokeWidth: 4,
        label: 'tangent: instantaneous rate',
        showPoints: true,
      },
    },
    ...createTextBoxPreset({
      id: `${spec.id}-explain`,
      x: width - SAFE_MARGIN_X - 360,
      y: graph.y + 90,
      width: 360,
      height: 180,
      text: 'As dx gets smaller, the secant line becomes a local tangent line. The derivative is the slope that remains.',
      fontSize: 22,
      minFontSize: 15,
      lineHeight: 1.18,
      fillToken: '$foreground',
      backgroundFillToken: '$surface',
      backgroundStrokeToken: '$border',
      padding: { x: 22, y: 18 },
      autoFit: 'shrink',
      role: 'explanation',
      importance: 'primary',
    }),
  ];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements });
}

export function createCalculusRiemannScenePreset(spec: ElucimCalculusRiemannSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const graph = calculusGraph(width, height, spec.xRange ?? [-0.5, 4], spec.yRange ?? [-0.5, 8]);
  const fn = spec.fn ?? 'x^2';
  const interval = tupleOrDefault(spec.interval, [0, 3], 'interval');
  const n = positiveIntOrDefault(spec.n, 6, 'n');
  const method = spec.method ?? 'midpoint';
  if (!['left', 'right', 'midpoint'].includes(method)) {
    throw new Error('method must be "left", "right", or "midpoint".');
  }
  const titleElements = createTemplateTitle(
    spec.id,
    spec.title ?? 'Riemann sums approximate area',
    spec.subtitle ?? 'Break the interval into rectangles, then refine the count to improve the estimate.',
    width,
  );
  const rootElementIds = [
    `${spec.id}-title`,
    `${spec.id}-subtitle`,
    `${spec.id}-axes`,
    `${spec.id}-rectangles`,
    `${spec.id}-curve`,
    `${spec.id}-explain`,
  ];
  const elements: ElucimCompositeElement[] = [
    ...titleElements,
    calculusAxes(`${spec.id}-axes`, graph, 'Axes for Riemann sum lesson'),
    {
      id: `${spec.id}-rectangles`,
      type: 'riemannSum',
      role: 'calculus-riemann-sum',
      intent: { role: 'area-approximation', importance: 'primary', generated: true, relationship: 'approximates accumulated area' },
      props: {
        type: 'riemannSum',
        fn,
        interval,
        n,
        method,
        origin: graph.origin,
        scale: graph.scale,
        fill: '#8b5cf6',
        stroke: '#c4b5fd',
        opacity: 0.42,
      },
    },
    calculusFunctionPlot(`${spec.id}-curve`, fn, graph, 'Function curve over Riemann rectangles'),
    ...createTextBoxPreset({
      id: `${spec.id}-explain`,
      x: width - SAFE_MARGIN_X - 360,
      y: graph.y + 90,
      width: 360,
      height: 176,
      text: `This ${method} sum uses ${n} rectangles. Increasing n makes the rectangle area converge toward the true integral.`,
      fontSize: 22,
      minFontSize: 15,
      lineHeight: 1.18,
      fillToken: '$foreground',
      backgroundFillToken: '$surface',
      backgroundStrokeToken: '$border',
      padding: { x: 22, y: 18 },
      autoFit: 'shrink',
      role: 'explanation',
      importance: 'primary',
    }),
  ];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements });
}

export function createCalculusAccumulationScenePreset(spec: ElucimCalculusAccumulationSceneSpec): ElucimAgentSafeScenePreset {
  assertTemplateId(spec.id, 'id');
  const width = positiveOrDefault(spec.width, DEFAULT_WIDTH, 'width');
  const height = positiveOrDefault(spec.height, DEFAULT_HEIGHT, 'height');
  const graph = calculusGraph(width, height, spec.xRange ?? [-0.5, 4], spec.yRange ?? [-0.5, 8]);
  const fn = spec.fn ?? 'x^2';
  const from = finiteOrDefault(spec.from, 0, 'from');
  const to = finiteOrDefault(spec.to, 2.6, 'to');
  const samples = positiveIntOrDefault(spec.samples, 80, 'samples');
  const titleElements = createTemplateTitle(
    spec.id,
    spec.title ?? 'Accumulation is signed area',
    spec.subtitle ?? 'The integral tracks the area gathered under the curve from one bound to another.',
    width,
  );
  const rootElementIds = [
    `${spec.id}-title`,
    `${spec.id}-subtitle`,
    `${spec.id}-axes`,
    `${spec.id}-area`,
    `${spec.id}-curve`,
    `${spec.id}-explain`,
  ];
  const elements: ElucimCompositeElement[] = [
    ...titleElements,
    calculusAxes(`${spec.id}-axes`, graph, 'Axes for accumulation lesson'),
    {
      id: `${spec.id}-area`,
      type: 'accumulationArea',
      role: 'calculus-accumulation-area',
      intent: { role: 'integral-area', importance: 'primary', generated: true, relationship: 'visualizes accumulated integral' },
      props: {
        type: 'accumulationArea',
        fn,
        from,
        to,
        samples,
        origin: graph.origin,
        scale: graph.scale,
        fill: '#14b8a6',
        stroke: '#5eead4',
        strokeWidth: 2,
        opacity: 0.34,
      },
    },
    calculusFunctionPlot(`${spec.id}-curve`, fn, graph, 'Function curve bounding accumulated area'),
    ...createTextBoxPreset({
      id: `${spec.id}-explain`,
      x: width - SAFE_MARGIN_X - 360,
      y: graph.y + 90,
      width: 360,
      height: 176,
      text: `The shaded region accumulates f(x) from ${from} to ${to}. Moving the upper bound changes the total area.`,
      fontSize: 22,
      minFontSize: 15,
      lineHeight: 1.18,
      fillToken: '$foreground',
      backgroundFillToken: '$surface',
      backgroundStrokeToken: '$border',
      padding: { x: 22, y: 18 },
      autoFit: 'shrink',
      role: 'explanation',
      importance: 'primary',
    }),
  ];
  return createScenePreset({ width, height, background: spec.background, rootElementIds, elements });
}

function createTemplateTitle(id: string, title: string, subtitle: string | undefined, width: number): ElucimCompositeElement[] {
  const contentWidth = width - SAFE_MARGIN_X * 2;
  return [
    ...createTextBoxPreset({
      id: `${id}-title`,
      x: SAFE_MARGIN_X,
      y: SAFE_MARGIN_Y,
      width: contentWidth,
      height: 72,
      text: title,
      fontSize: 42,
      minFontSize: 26,
      fontWeight: 800,
      lineHeight: 1.08,
      fillToken: '$title',
      background: 'none',
      padding: 0,
      autoFit: 'shrink',
      role: 'title',
      importance: 'primary',
    }),
    ...(subtitle ? createTextBoxPreset({
      id: `${id}-subtitle`,
      x: SAFE_MARGIN_X,
      y: SAFE_MARGIN_Y + 80,
      width: contentWidth,
      height: 44,
      text: subtitle,
      fontSize: 21,
      minFontSize: 15,
      lineHeight: 1.2,
      fillToken: '$muted',
      background: 'none',
      padding: 0,
      autoFit: 'shrink',
      role: 'subtitle',
      importance: 'secondary',
    }) : []),
  ];
}

function createScenePreset(options: {
  width: number;
  height: number;
  background?: string;
  rootElementIds: string[];
  elements: ElucimCompositeElement[];
}): ElucimAgentSafeScenePreset {
  return {
    scene: {
      type: 'player',
      preset: 'slide',
      width: options.width,
      height: options.height,
      background: options.background ?? '$background',
      children: options.rootElementIds,
    },
    rootElementIds: options.rootElementIds,
    elements: options.elements,
    width: options.width,
    height: options.height,
  };
}

function tableCellBackground(id: string, parentId: string, x: number, y: number, width: number, height: number, fill: string): ElucimCompositeElement {
  return {
    id,
    type: 'rect',
    parentId,
    role: 'container',
    intent: { role: 'container', importance: 'decorative', group: parentId },
    props: { type: 'rect', x, y, width, height, fill, stroke: '$border', strokeWidth: 1 },
  };
}

function elementsById(elements: ElucimCompositeElement[]): Record<string, ElucimCompositeElement> {
  return Object.fromEntries(elements.map(element => [element.id, element]));
}

function calculusAxes(id: string, graph: CalculusGraphLayout, description: string): ElucimCompositeElement {
  return {
    id,
    type: 'axes',
    role: 'math-axes',
    intent: { role: 'coordinate-system', importance: 'supporting', generated: true, description },
    props: {
      type: 'axes',
      origin: graph.origin,
      domain: graph.xRange,
      range: graph.yRange,
      scale: graph.scale,
      showGrid: true,
      axisColor: '#94a3b8',
    },
  };
}

function calculusFunctionPlot(id: string, fn: string, graph: CalculusGraphLayout, description: string): ElucimCompositeElement {
  return {
    id,
    type: 'functionPlot',
    role: 'math-function',
    intent: { role: 'function-curve', importance: 'primary', generated: true, description },
    props: {
      type: 'functionPlot',
      fn,
      domain: graph.xRange,
      origin: graph.origin,
      scale: graph.scale,
      color: '#60a5fa',
      strokeWidth: 4,
    },
  };
}

interface CalculusGraphLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  origin: [number, number];
  scale: number;
  xRange: [number, number];
  yRange: [number, number];
}

function calculusGraph(width: number, height: number, xRange: [number, number], yRange: [number, number]): CalculusGraphLayout {
  const graphX = SAFE_MARGIN_X + 12;
  const graphY = SAFE_MARGIN_Y + 132;
  const graphWidth = Math.max(420, width - SAFE_MARGIN_X * 2 - 420);
  const graphHeight = Math.max(320, height - graphY - SAFE_MARGIN_Y);
  const scale = Math.min(graphWidth / Math.max(1, xRange[1] - xRange[0]), graphHeight / Math.max(1, yRange[1] - yRange[0]));
  return {
    x: graphX,
    y: graphY,
    width: graphWidth,
    height: graphHeight,
    origin: [graphX - xRange[0] * scale, graphY + yRange[1] * scale],
    scale,
    xRange,
    yRange,
  };
}

function positiveOrDefault(value: number | undefined, fallback: number, name: string) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number.`);
  return value;
}

function finiteOrDefault(value: number | undefined, fallback: number, name: string) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  return value;
}

function nonZeroOrDefault(value: number | undefined, fallback: number, name: string) {
  const resolved = finiteOrDefault(value, fallback, name);
  if (resolved === 0) throw new Error(`${name} must be a non-zero number.`);
  return resolved;
}

function positiveIntOrDefault(value: number | undefined, fallback: number, name: string) {
  const resolved = positiveOrDefault(value, fallback, name);
  if (!Number.isInteger(resolved)) throw new Error(`${name} must be a positive integer.`);
  return resolved;
}

function tupleOrDefault(value: [number, number] | undefined, fallback: [number, number], name: string): [number, number] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) {
    throw new Error(`${name} must be [number, number].`);
  }
  if (value[0] === value[1]) {
    throw new Error(`${name} endpoints must be distinct.`);
  }
  return value;
}

function assertTemplateId(value: string, name: string) {
  if (!value || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${name} must be a stable template ID starting with a letter and containing only letters, numbers, "_" or "-".`);
  }
}
