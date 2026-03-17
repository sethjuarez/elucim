import React from 'react';
import type { ElementNode, CircleNode, RectNode, LineNode, ArrowNode, TextNode, LaTeXNode, ImageNode, AxesNode, FunctionPlotNode, VectorNode, MatrixNode, BarChartNode, GraphNode } from '@elucim/dsl';
import {
  IconRect, IconCircle, IconImage,
  IconLine, IconArrow,
  IconText, IconLatex,
  IconAxes, IconFunction, IconVector, IconMatrix,
  IconBarChart, IconGraph,
} from '../theme/icons';

export interface ElementTemplate {
  type: string;
  label: string;
  category: 'shape' | 'line' | 'text' | 'math' | 'data';
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
  // ─── Shapes ────────────────────────────────────────────────────
  {
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
      fill: 'none',
      stroke: '#4fc3f7',
      strokeWidth: 2,
    } satisfies RectNode),
  },
  {
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
      fill: 'none',
      stroke: '#4fc3f7',
      strokeWidth: 2,
    } satisfies CircleNode),
  },
  {
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
      stroke: '#e0e0e0',
      strokeWidth: 2,
    } satisfies LineNode),
  },
  {
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
      stroke: '#e0e0e0',
      strokeWidth: 2,
      headSize: 10,
    } satisfies ArrowNode),
  },

  // ─── Text ──────────────────────────────────────────────────────
  {
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
      fill: '#e0e0e0',
      fontSize: 24,
      textAnchor: 'middle',
    } satisfies TextNode),
  },
  {
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
      color: '#e0e0e0',
      fontSize: 24,
    } satisfies LaTeXNode),
  },

  // ─── Math ──────────────────────────────────────────────────────
  {
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
      axisColor: '#e0e0e0',
    } satisfies AxesNode),
  },
  {
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
      color: '#4fc3f7',
      strokeWidth: 2,
    } satisfies FunctionPlotNode),
  },
  {
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
      color: '#4fc3f7',
    } satisfies VectorNode),
  },
  {
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
      color: '#e0e0e0',
    } satisfies MatrixNode),
  },

  // ─── Data ──────────────────────────────────────────────────────
  {
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
      barColor: '#4fc3f7',
      labelColor: '#e0e0e0',
      showValues: true,
    } satisfies BarChartNode),
  },
  {
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
      nodeColor: '#4fc3f7',
      edgeColor: '#64748b',
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
  shape: 'Shapes',
  line: 'Lines',
  text: 'Text',
  math: 'Math',
  data: 'Data',
};
