import React from 'react';
import type { ElementNode, CircleNode, RectNode, LineNode, ArrowNode, TextNode, TextBoxNode, LaTeXNode, ImageNode, AxesNode, FunctionPlotNode, VectorNode, VectorFieldNode, MatrixNode, BarChartNode, GraphNode, BezierCurveNode, PolygonNode, GroupNode } from '@elucim/dsl';
import {
  IconRect, IconCircle, IconImage,
  IconLine, IconArrow, IconBezier,
  IconText, IconLatex,
  IconAxes, IconFunction, IconVector, IconVectorField, IconMatrix,
  IconBarChart, IconGraph, IconPolygon,
  IconGroup,
} from '../theme/icons';

export interface ElementTemplate {
  /** Stable palette/template identifier, unique within ELEMENT_TEMPLATES. */
  id: string;
  /** DSL node type emitted by create(). */
  type: ElementNode['type'];
  label: string;
  category: 'presentation' | 'shape' | 'line' | 'text' | 'math' | 'data';
  icon: React.ReactNode;
  create: (cx: number, cy: number) => ElementNode;
}

let nextId = Date.now();
function genId(prefix: string): string {
  return `${prefix}-${(nextId++).toString(36).slice(-6)}`;
}

/** Reset ID counter (for testing) */
export function resetIdCounter(seed = 1): void {
  nextId = seed;
}

export const ELEMENT_TEMPLATES: ElementTemplate[] = [
  // ─── Presentation ─────────────────────────────────────────────────
  {
    id: 'slideTitle',
    type: 'text',
    label: 'Title',
    category: 'presentation',
    icon: <IconText />,
    create: (cx, cy) => ({
      type: 'text',
      id: genId('title'),
      x: cx,
      y: cy,
      content: 'Slide title',
      fill: '$title',
      fontSize: 44,
      fontWeight: 900,
      textAnchor: 'middle',
    } satisfies TextNode),
  },
  {
    id: 'slideSubtitle',
    type: 'text',
    label: 'Subtitle',
    category: 'presentation',
    icon: <IconText />,
    create: (cx, cy) => ({
      type: 'text',
      id: genId('subtitle'),
      x: cx,
      y: cy,
      content: 'Framing context',
      fill: '$subtitle',
      fontSize: 22,
      fontWeight: 600,
      textAnchor: 'middle',
    } satisfies TextNode),
  },
  {
    id: 'heroCard',
    type: 'group',
    label: 'Hero Card',
    category: 'presentation',
    icon: <IconGroup />,
    create: (cx, cy) => ({
      type: 'group',
      id: genId('hero'),
      children: [
        {
          type: 'rect',
          id: genId('hero-card'),
          x: cx - 180,
          y: cy - 76,
          width: 360,
          height: 152,
          rx: 22,
          fill: '$surface',
          stroke: '$accent',
          strokeWidth: 2,
        },
        {
          type: 'text',
          id: genId('hero-title'),
          x: cx,
          y: cy - 16,
          content: 'Key idea',
          fill: '$title',
          fontSize: 32,
          fontWeight: 900,
          textAnchor: 'middle',
        },
        {
          type: 'text',
          id: genId('hero-label'),
          x: cx,
          y: cy + 28,
          content: 'one strong visual anchor',
          fill: '$subtitle',
          fontSize: 18,
          fontWeight: 600,
          textAnchor: 'middle',
        },
      ],
    } satisfies GroupNode),
  },
  {
    id: 'metricCard',
    type: 'group',
    label: 'Metric',
    category: 'presentation',
    icon: <IconBarChart />,
    create: (cx, cy) => ({
      type: 'group',
      id: genId('metric'),
      children: [
        {
          type: 'rect',
          id: genId('metric-card'),
          x: cx - 110,
          y: cy - 66,
          width: 220,
          height: 132,
          rx: 18,
          fill: '$surface',
          stroke: '$border',
          strokeWidth: 2,
        },
        {
          type: 'text',
          id: genId('metric-value'),
          x: cx,
          y: cy - 4,
          content: '42%',
          fill: '$accent',
          fontSize: 42,
          fontWeight: 900,
          textAnchor: 'middle',
        },
        {
          type: 'text',
          id: genId('metric-label'),
          x: cx,
          y: cy + 34,
          content: 'clear takeaway',
          fill: '$muted',
          fontSize: 16,
          fontWeight: 700,
          textAnchor: 'middle',
        },
      ],
    } satisfies GroupNode),
  },
  {
    id: 'callout',
    type: 'group',
    label: 'Callout',
    category: 'presentation',
    icon: <IconRect />,
    create: (cx, cy) => ({
      type: 'group',
      id: genId('callout'),
      children: [
        {
          type: 'rect',
          id: genId('callout-card'),
          x: cx - 150,
          y: cy - 44,
          width: 300,
          height: 88,
          rx: 18,
          fill: '$surface',
          stroke: '$secondary',
          strokeWidth: 2,
        },
        {
          type: 'text',
          id: genId('callout-text'),
          x: cx,
          y: cy + 8,
          content: 'Important takeaway',
          fill: '$foreground',
          fontSize: 22,
          fontWeight: 800,
          textAnchor: 'middle',
        },
      ],
    } satisfies GroupNode),
  },

  // ─── Shapes ────────────────────────────────────────────────────
  {
    id: 'rect',
    type: 'rect',
    label: 'Rectangle',
    category: 'shape',
    icon: <IconRect />,
    create: (cx, cy) => ({
      type: 'rect',
      id: genId('rect'),
      x: cx - 60,
      y: cy - 40,
      width: 120,
      height: 80,
      fill: '$surface',
      stroke: '$accent',
      strokeWidth: 2,
      rx: 12,
    } satisfies RectNode),
  },
  {
    id: 'circle',
    type: 'circle',
    label: 'Circle',
    category: 'shape',
    icon: <IconCircle />,
    create: (cx, cy) => ({
      type: 'circle',
      id: genId('circle'),
      cx,
      cy,
      r: 50,
      fill: '$surface',
      stroke: '$accent',
      strokeWidth: 2,
    } satisfies CircleNode),
  },
  {
    id: 'polygon',
    type: 'polygon',
    label: 'Polygon',
    category: 'shape',
    icon: <IconPolygon />,
    create: (cx, cy) => ({
      type: 'polygon',
      id: genId('polygon'),
      points: [
        [cx, cy - 50],
        [cx + 47, cy - 15],
        [cx + 29, cy + 40],
        [cx - 29, cy + 40],
        [cx - 47, cy - 15],
      ],
      fill: '$surface',
      stroke: '$accent',
      strokeWidth: 2,
      closed: true,
    } satisfies PolygonNode),
  },
  {
    id: 'image',
    type: 'image',
    label: 'Image',
    category: 'shape',
    icon: <IconImage />,
    create: (cx, cy) => ({
      type: 'image',
      id: genId('image'),
      src: '',
      x: cx - 80,
      y: cy - 60,
      width: 160,
      height: 120,
    } satisfies ImageNode),
  },

  // ─── Lines ─────────────────────────────────────────────────────
  {
    id: 'line',
    type: 'line',
    label: 'Line',
    category: 'line',
    icon: <IconLine />,
    create: (cx, cy) => ({
      type: 'line',
      id: genId('line'),
      x1: cx - 60,
      y1: cy,
      x2: cx + 60,
      y2: cy,
      stroke: '$border',
      strokeWidth: 2,
    } satisfies LineNode),
  },
  {
    id: 'arrow',
    type: 'arrow',
    label: 'Arrow',
    category: 'line',
    icon: <IconArrow />,
    create: (cx, cy) => ({
      type: 'arrow',
      id: genId('arrow'),
      x1: cx - 60,
      y1: cy,
      x2: cx + 60,
      y2: cy,
      stroke: '$accent',
      strokeWidth: 2,
      headSize: 10,
    } satisfies ArrowNode),
  },
  {
    id: 'bezierCurve',
    type: 'bezierCurve',
    label: 'Bézier Curve',
    category: 'line',
    icon: <IconBezier />,
    create: (cx, cy) => ({
      type: 'bezierCurve',
      id: genId('bezier'),
      x1: cx - 80,
      y1: cy,
      cx1: cx - 30,
      cy1: cy - 60,
      cx2: cx + 30,
      cy2: cy + 60,
      x2: cx + 80,
      y2: cy,
      stroke: '$accent',
      strokeWidth: 2,
    } satisfies BezierCurveNode),
  },

  // ─── Text ──────────────────────────────────────────────────────
  {
    id: 'text',
    type: 'text',
    label: 'Text',
    category: 'text',
    icon: <IconText />,
    create: (cx, cy) => ({
      type: 'text',
      id: genId('text'),
      x: cx,
      y: cy,
      content: 'Text',
      fill: '$foreground',
      fontSize: 24,
      textAnchor: 'middle',
    } satisfies TextNode),
  },
  {
    id: 'textbox',
    type: 'textbox',
    label: 'Text Box',
    category: 'text',
    icon: <IconText />,
    create: (cx, cy) => ({
      type: 'textbox',
      id: genId('textbox'),
      x: cx - 150,
      y: cy - 60,
      width: 300,
      height: 120,
      content: 'Bounded text stays inside this box.',
      fill: '$foreground',
      fontSize: 20,
      fontWeight: 600,
      align: 'start',
      verticalAlign: 'top',
      padding: 14,
      autoFit: 'shrink',
      background: { fill: '$surface', stroke: '$border', radius: 16 },
    } satisfies TextBoxNode),
  },
  {
    id: 'latex',
    type: 'latex',
    label: 'LaTeX',
    category: 'text',
    icon: <IconLatex />,
    create: (cx, cy) => ({
      type: 'latex',
      id: genId('latex'),
      expression: '\\frac{a}{b}',
      x: cx,
      y: cy,
      color: '$foreground',
      fontSize: 24,
    } satisfies LaTeXNode),
  },

  // ─── Math ──────────────────────────────────────────────────────
  {
    id: 'axes',
    type: 'axes',
    label: 'Axes',
    category: 'math',
    icon: <IconAxes />,
    create: (cx, cy) => ({
      type: 'axes',
      id: genId('axes'),
      origin: [cx, cy],
      scale: 40,
      domain: [-5, 5],
      range: [-5, 5],
      showGrid: true,
      showLabels: true,
      axisColor: '$foreground',
      gridColor: '$border',
    } satisfies AxesNode),
  },
  {
    id: 'functionPlot',
    type: 'functionPlot',
    label: 'Function',
    category: 'math',
    icon: <IconFunction />,
    create: (cx, cy) => ({
      type: 'functionPlot',
      fn: 'sin(x)',
      origin: [cx, cy],
      scale: 40,
      domain: [-5, 5],
      yClamp: [-10, 10],
      color: '$accent',
      strokeWidth: 2,
    } satisfies FunctionPlotNode),
  },
  {
    id: 'vector',
    type: 'vector',
    label: 'Vector',
    category: 'math',
    icon: <IconVector />,
    create: (cx, cy) => ({
      type: 'vector',
      id: genId('vector'),
      from: [0, 0],
      to: [3, 2],
      origin: [cx, cy],
      scale: 40,
      color: '$accent',
    } satisfies VectorNode),
  },
  {
    id: 'vectorField',
    type: 'vectorField',
    label: 'Vector Field',
    category: 'math',
    icon: <IconVectorField />,
    create: (cx, cy) => ({
      type: 'vectorField',
      id: genId('vecfield'),
      fn: '[-y, x]',
      origin: [cx, cy],
      scale: 40,
      domain: [-3, 3],
      range: [-3, 3],
      step: 1,
      color: '$accent',
      normalize: true,
    } satisfies VectorFieldNode),
  },
  {
    id: 'matrix',
    type: 'matrix',
    label: 'Matrix',
    category: 'math',
    icon: <IconMatrix />,
    create: (cx, cy) => ({
      type: 'matrix',
      id: genId('matrix'),
      values: [[1, 0], [0, 1]],
      x: cx - 40,
      y: cy - 30,
      color: '$foreground',
    } satisfies MatrixNode),
  },

  // ─── Data ──────────────────────────────────────────────────────
  {
    id: 'barChart',
    type: 'barChart',
    label: 'Bar Chart',
    category: 'data',
    icon: <IconBarChart />,
    create: (cx, cy) => ({
      type: 'barChart',
      id: genId('barChart'),
      bars: [
        { label: 'A', value: 30 },
        { label: 'B', value: 70 },
        { label: 'C', value: 50 },
      ],
      x: cx - 100,
      y: cy - 80,
      width: 200,
      height: 160,
      barColor: '$accent',
      labelColor: '$foreground',
      showValues: true,
    } satisfies BarChartNode),
  },
  {
    id: 'graph',
    type: 'graph',
    label: 'Graph',
    category: 'data',
    icon: <IconGraph />,
    create: (cx, cy) => ({
      type: 'graph',
      id: genId('graph'),
      nodes: [
        { id: 'a', x: cx - 60, y: cy - 40, label: 'A' },
        { id: 'b', x: cx + 60, y: cy - 40, label: 'B' },
        { id: 'c', x: cx, y: cy + 40, label: 'C' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
      nodeColor: '$accent',
      edgeColor: '$border',
    } satisfies GraphNode),
  },
];

/** Group templates by category */
export function getTemplatesByCategory(): Record<string, ElementTemplate[]> {
  const groups: Record<string, ElementTemplate[]> = {};
  for (const t of ELEMENT_TEMPLATES) {
    (groups[t.category] ??= []).push(t);
  }
  return groups;
}

export const CATEGORY_LABELS: Record<string, string> = {
  presentation: 'Presentation',
  shape: 'Shapes',
  line: 'Lines',
  text: 'Text',
  math: 'Math',
  data: 'Data',
};
