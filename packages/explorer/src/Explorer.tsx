import React, { useState, useMemo } from 'react';
import {
  Player,
  Sequence,
  Circle,
  Line,
  Arrow,
  Rect,
  Text,
  Polygon,
  Axes,
  FunctionPlot,
  Vector,
  VectorField,
  Matrix,
  Graph,
  LaTeX,
  FadeIn,
  FadeOut,
  Write,
  Draw,
  Transform,
  Morph,
  Stagger,
  type GraphNode,
  type GraphEdge,
} from '@elucim/core';

// ─── Primitive Registry ──────────────────────────────────────────────────────

interface PrimitiveEntry {
  name: string;
  category: 'Basic' | 'Math' | 'Animation' | 'Composition';
  description: string;
  component: React.FC<{ controls: Record<string, any> }>;
  controls: ControlDef[];
  defaultProps: Record<string, any>;
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
}

interface ControlDef {
  key: string;
  label: string;
  type: 'number' | 'color' | 'range' | 'text' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: any;
}

const PRIMITIVES: PrimitiveEntry[] = [
  // ── Basic ──
  {
    name: 'Circle',
    category: 'Basic',
    description: 'SVG circle with optional draw animation that reveals the stroke progressively.',
    component: ({ controls }) => (
      <Circle
        cx={controls.cx} cy={controls.cy} r={controls.r}
        stroke={controls.stroke} fill={controls.fill}
        strokeWidth={controls.strokeWidth}
        draw={controls.draw} fadeIn={controls.fadeIn}
      />
    ),
    controls: [
      { key: 'cx', label: 'Center X', type: 'range', min: 50, max: 350, default: 200 },
      { key: 'cy', label: 'Center Y', type: 'range', min: 50, max: 250, default: 150 },
      { key: 'r', label: 'Radius', type: 'range', min: 10, max: 150, default: 80 },
      { key: 'stroke', label: 'Stroke Color', type: 'color', default: '#4ecdc4' },
      { key: 'fill', label: 'Fill', type: 'text', default: 'none' },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'range', min: 1, max: 10, step: 0.5, default: 3 },
      { key: 'draw', label: 'Draw Duration', type: 'range', min: 0, max: 60, default: 30 },
      { key: 'fadeIn', label: 'FadeIn Duration', type: 'range', min: 0, max: 60, default: 0 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 90,
  },
  {
    name: 'Line',
    category: 'Basic',
    description: 'SVG line segment with draw animation.',
    component: ({ controls }) => (
      <Line
        x1={controls.x1} y1={controls.y1} x2={controls.x2} y2={controls.y2}
        stroke={controls.stroke} strokeWidth={controls.strokeWidth}
        draw={controls.draw}
      />
    ),
    controls: [
      { key: 'x1', label: 'X1', type: 'range', min: 0, max: 400, default: 50 },
      { key: 'y1', label: 'Y1', type: 'range', min: 0, max: 300, default: 250 },
      { key: 'x2', label: 'X2', type: 'range', min: 0, max: 400, default: 350 },
      { key: 'y2', label: 'Y2', type: 'range', min: 0, max: 300, default: 50 },
      { key: 'stroke', label: 'Color', type: 'color', default: '#ff6b6b' },
      { key: 'strokeWidth', label: 'Width', type: 'range', min: 1, max: 10, default: 3 },
      { key: 'draw', label: 'Draw Duration', type: 'range', min: 0, max: 60, default: 40 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 90,
  },
  {
    name: 'Arrow',
    category: 'Basic',
    description: 'Line with an arrowhead marker.',
    component: ({ controls }) => (
      <Arrow
        x1={controls.x1} y1={controls.y1} x2={controls.x2} y2={controls.y2}
        stroke={controls.stroke} strokeWidth={controls.strokeWidth}
        headSize={controls.headSize}
      />
    ),
    controls: [
      { key: 'x1', label: 'X1', type: 'range', min: 0, max: 400, default: 50 },
      { key: 'y1', label: 'Y1', type: 'range', min: 0, max: 300, default: 200 },
      { key: 'x2', label: 'X2', type: 'range', min: 0, max: 400, default: 350 },
      { key: 'y2', label: 'Y2', type: 'range', min: 0, max: 300, default: 100 },
      { key: 'stroke', label: 'Color', type: 'color', default: '#ffe66d' },
      { key: 'strokeWidth', label: 'Width', type: 'range', min: 1, max: 8, default: 3 },
      { key: 'headSize', label: 'Head Size', type: 'range', min: 4, max: 20, default: 10 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 60,
  },
  {
    name: 'Rect',
    category: 'Basic',
    description: 'Rectangle with optional draw animation.',
    component: ({ controls }) => (
      <Rect
        x={controls.x} y={controls.y} width={controls.width} height={controls.height}
        stroke={controls.stroke} fill={controls.fill}
        strokeWidth={controls.strokeWidth} rx={controls.rx}
        draw={controls.draw}
      />
    ),
    controls: [
      { key: 'x', label: 'X', type: 'range', min: 0, max: 300, default: 100 },
      { key: 'y', label: 'Y', type: 'range', min: 0, max: 200, default: 50 },
      { key: 'width', label: 'Width', type: 'range', min: 20, max: 300, default: 200 },
      { key: 'height', label: 'Height', type: 'range', min: 20, max: 200, default: 150 },
      { key: 'stroke', label: 'Stroke', type: 'color', default: '#a29bfe' },
      { key: 'fill', label: 'Fill', type: 'text', default: 'rgba(162,155,254,0.1)' },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'range', min: 1, max: 8, default: 3 },
      { key: 'rx', label: 'Corner Radius', type: 'range', min: 0, max: 30, default: 0 },
      { key: 'draw', label: 'Draw Duration', type: 'range', min: 0, max: 60, default: 30 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 90,
  },
  {
    name: 'Text',
    category: 'Basic',
    description: 'SVG text element with fadeIn animation.',
    component: ({ controls }) => (
      <Text
        x={controls.x} y={controls.y}
        fill={controls.fill} fontSize={controls.fontSize}
        textAnchor={controls.textAnchor}
        fadeIn={controls.fadeIn}
      >
        {controls.content}
      </Text>
    ),
    controls: [
      { key: 'content', label: 'Text', type: 'text', default: 'Hello Elucim!' },
      { key: 'x', label: 'X', type: 'range', min: 0, max: 400, default: 200 },
      { key: 'y', label: 'Y', type: 'range', min: 20, max: 280, default: 150 },
      { key: 'fill', label: 'Color', type: 'color', default: '#e0e0e0' },
      { key: 'fontSize', label: 'Font Size', type: 'range', min: 10, max: 60, default: 24 },
      { key: 'textAnchor', label: 'Anchor', type: 'select', options: ['start', 'middle', 'end'], default: 'middle' },
      { key: 'fadeIn', label: 'FadeIn Duration', type: 'range', min: 0, max: 60, default: 20 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 60,
  },
  {
    name: 'Polygon',
    category: 'Basic',
    description: 'Closed polygon with draw animation. Pass an array of [x,y] points.',
    component: ({ controls }) => {
      const n = controls.sides;
      const cx = 200, cy = 150, r = controls.radius;
      const pts: [number, number][] = Array.from({ length: n }, (_, i) => {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
      });
      return (
        <Polygon
          points={pts}
          stroke={controls.stroke}
          fill={controls.fill}
          strokeWidth={controls.strokeWidth}
          draw={controls.draw}
        />
      );
    },
    controls: [
      { key: 'sides', label: 'Sides', type: 'range', min: 3, max: 12, step: 1, default: 5 },
      { key: 'radius', label: 'Radius', type: 'range', min: 20, max: 120, default: 80 },
      { key: 'stroke', label: 'Stroke', type: 'color', default: '#4ecdc4' },
      { key: 'fill', label: 'Fill', type: 'text', default: 'rgba(78,205,196,0.15)' },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'range', min: 1, max: 8, default: 3 },
      { key: 'draw', label: 'Draw Duration', type: 'range', min: 0, max: 60, default: 40 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 90,
  },
  // ── Math ──
  {
    name: 'LaTeX',
    category: 'Math',
    description: 'KaTeX-powered LaTeX rendering inside SVG via foreignObject.',
    component: ({ controls }) => (
      <LaTeX
        expression={controls.expression}
        x={controls.x} y={controls.y}
        fontSize={controls.fontSize}
        color={controls.color}
        fadeIn={controls.fadeIn}
      />
    ),
    controls: [
      { key: 'expression', label: 'LaTeX', type: 'text', default: '\\int_{0}^{\\pi} \\sin(x)\\,dx = 2' },
      { key: 'x', label: 'X', type: 'range', min: 50, max: 700, default: 400 },
      { key: 'y', label: 'Y', type: 'range', min: 20, max: 350, default: 200 },
      { key: 'fontSize', label: 'Font Size', type: 'range', min: 12, max: 60, default: 28 },
      { key: 'color', label: 'Color', type: 'color', default: '#4ecdc4' },
      { key: 'fadeIn', label: 'FadeIn', type: 'range', min: 0, max: 60, default: 20 },
    ],
    defaultProps: {},
    width: 800,
    height: 400,
    durationInFrames: 60,
  },
  {
    name: 'Axes + FunctionPlot',
    category: 'Math',
    description: 'Coordinate axes with a function curve drawn over time.',
    component: ({ controls }) => (
      <>
        <Axes
          domain={[-4, 4]} range={[-3, 3]}
          origin={[400, 200]} scale={controls.scale}
          showGrid={controls.showGrid}
          axisColor="#555" gridColor="#222"
        />
        <FunctionPlot
          fn={(x) => controls.amplitude * Math.sin(controls.frequency * x)}
          domain={[-4, 4]}
          origin={[400, 200]}
          scale={controls.scale}
          stroke={controls.color}
          strokeWidth={controls.strokeWidth}
          draw={controls.draw}
        />
      </>
    ),
    controls: [
      { key: 'amplitude', label: 'Amplitude', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1 },
      { key: 'frequency', label: 'Frequency', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1 },
      { key: 'scale', label: 'Scale', type: 'range', min: 20, max: 80, default: 50 },
      { key: 'color', label: 'Color', type: 'color', default: '#ff6b6b' },
      { key: 'strokeWidth', label: 'Line Width', type: 'range', min: 1, max: 6, default: 3 },
      { key: 'showGrid', label: 'Show Grid', type: 'boolean', default: true },
      { key: 'draw', label: 'Draw Duration', type: 'range', min: 0, max: 90, default: 60 },
    ],
    defaultProps: {},
    width: 800,
    height: 400,
    durationInFrames: 120,
  },
  {
    name: 'Vector',
    category: 'Math',
    description: 'Math vector arrow from origin to (vx, vy) in coordinate space.',
    component: ({ controls }) => (
      <>
        <Axes domain={[-4, 4]} range={[-4, 4]} origin={[200, 150]} scale={35} axisColor="#444" />
        <Vector
          vx={controls.vx} vy={controls.vy}
          origin={[200, 150]} scale={35}
          color={controls.color} strokeWidth={controls.strokeWidth}
          label={controls.label} fadeIn={controls.fadeIn}
        />
      </>
    ),
    controls: [
      { key: 'vx', label: 'X Component', type: 'range', min: -4, max: 4, step: 0.5, default: 3 },
      { key: 'vy', label: 'Y Component', type: 'range', min: -4, max: 4, step: 0.5, default: 2 },
      { key: 'color', label: 'Color', type: 'color', default: '#ff6b6b' },
      { key: 'strokeWidth', label: 'Width', type: 'range', min: 1, max: 6, default: 3 },
      { key: 'label', label: 'Label', type: 'text', default: 'v⃗' },
      { key: 'fadeIn', label: 'FadeIn', type: 'range', min: 0, max: 60, default: 15 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 60,
  },
  {
    name: 'VectorField',
    category: 'Math',
    description: 'Grid of arrows showing a 2D vector field F(x,y).',
    component: ({ controls }) => (
      <>
        <Axes
          domain={[-4, 4]} range={[-3, 3]}
          origin={[400, 200]} scale={40}
          showGrid axisColor="#444" gridColor="#222"
        />
        <VectorField
          fn={(x, y) => {
            if (controls.fieldType === 'rotation') return [-y, x];
            if (controls.fieldType === 'diverge') return [x, y];
            return [1, Math.sin(y)];
          }}
          domain={[-4, 4]} range={[-3, 3]}
          origin={[400, 200]} scale={40}
          color={controls.color}
          arrowScale={controls.arrowScale}
          normalize={controls.normalize}
          fadeIn={controls.fadeIn}
        />
      </>
    ),
    controls: [
      { key: 'fieldType', label: 'Field', type: 'select', options: ['rotation', 'diverge', 'flow'], default: 'rotation' },
      { key: 'color', label: 'Color', type: 'color', default: '#4ecdc4' },
      { key: 'arrowScale', label: 'Arrow Scale', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.35 },
      { key: 'normalize', label: 'Normalize', type: 'boolean', default: true },
      { key: 'fadeIn', label: 'FadeIn', type: 'range', min: 0, max: 60, default: 30 },
    ],
    defaultProps: {},
    width: 800,
    height: 400,
    durationInFrames: 90,
  },
  {
    name: 'Matrix',
    category: 'Math',
    description: 'Matrix display with bracket notation.',
    component: ({ controls }) => {
      const entries = controls.size === '2x2'
        ? [['a', 'b'], ['c', 'd']]
        : [['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']];
      return (
        <Matrix
          entries={entries} x={controls.x} y={controls.y}
          color={controls.color} fontSize={controls.fontSize}
          fadeIn={controls.fadeIn}
        />
      );
    },
    controls: [
      { key: 'size', label: 'Size', type: 'select', options: ['2x2', '3x3'], default: '2x2' },
      { key: 'x', label: 'X', type: 'range', min: 50, max: 350, default: 200 },
      { key: 'y', label: 'Y', type: 'range', min: 50, max: 250, default: 150 },
      { key: 'color', label: 'Color', type: 'color', default: '#e0e0e0' },
      { key: 'fontSize', label: 'Font Size', type: 'range', min: 12, max: 40, default: 22 },
      { key: 'fadeIn', label: 'FadeIn', type: 'range', min: 0, max: 60, default: 20 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 60,
  },
  {
    name: 'Graph',
    category: 'Math',
    description: 'Nodes and edges for graph/network visualization.',
    component: ({ controls }) => {
      const nodes: GraphNode[] = [
        { id: 'A', x: 100, y: 80, label: 'A' },
        { id: 'B', x: 300, y: 80, label: 'B' },
        { id: 'C', x: 200, y: 220, label: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', label: '3' },
        { from: 'B', to: 'C', directed: true },
        { from: 'C', to: 'A', label: '1' },
      ];
      return (
        <Graph
          nodes={nodes} edges={edges}
          nodeColor={controls.nodeColor} edgeColor={controls.edgeColor}
          nodeRadius={controls.nodeRadius}
          fadeIn={controls.fadeIn}
        />
      );
    },
    controls: [
      { key: 'nodeColor', label: 'Node Color', type: 'color', default: '#ff6b6b' },
      { key: 'edgeColor', label: 'Edge Color', type: 'color', default: '#888' },
      { key: 'nodeRadius', label: 'Node Radius', type: 'range', min: 10, max: 40, default: 22 },
      { key: 'fadeIn', label: 'FadeIn', type: 'range', min: 0, max: 60, default: 20 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 60,
  },
  // ── Animation ──
  {
    name: 'FadeIn / FadeOut',
    category: 'Animation',
    description: 'Opacity-based fade animations.',
    component: ({ controls }) => (
      <>
        <Sequence from={0} durationInFrames={controls.fadeInDuration + 10}>
          <FadeIn durationInFrames={controls.fadeInDuration}>
            <Circle cx={150} cy={150} r={50} stroke="#4ecdc4" fill="rgba(78,205,196,0.2)" strokeWidth={3} />
          </FadeIn>
        </Sequence>
        <Sequence from={controls.fadeInDuration + 30} durationInFrames={controls.fadeOutDuration + 10}>
          <FadeOut durationInFrames={controls.fadeOutDuration}>
            <Circle cx={300} cy={150} r={50} stroke="#ff6b6b" fill="rgba(255,107,107,0.2)" strokeWidth={3} />
          </FadeOut>
        </Sequence>
      </>
    ),
    controls: [
      { key: 'fadeInDuration', label: 'FadeIn Frames', type: 'range', min: 5, max: 60, default: 30 },
      { key: 'fadeOutDuration', label: 'FadeOut Frames', type: 'range', min: 5, max: 60, default: 30 },
    ],
    defaultProps: {},
    width: 450,
    height: 300,
    durationInFrames: 120,
  },
  {
    name: 'Transform',
    category: 'Animation',
    description: 'Translate, rotate, and scale animations.',
    component: ({ controls }) => (
      <Transform
        from={{ x: controls.fromX, y: controls.fromY, scale: controls.fromScale, rotate: 0 }}
        to={{ x: controls.toX, y: controls.toY, scale: controls.toScale, rotate: controls.rotation }}
        durationInFrames={60}
      >
        <Rect x={-40} y={-40} width={80} height={80} stroke="#a29bfe" fill="rgba(162,155,254,0.2)" strokeWidth={3} />
      </Transform>
    ),
    controls: [
      { key: 'fromX', label: 'Start X', type: 'range', min: 50, max: 350, default: 100 },
      { key: 'fromY', label: 'Start Y', type: 'range', min: 50, max: 250, default: 150 },
      { key: 'toX', label: 'End X', type: 'range', min: 50, max: 350, default: 300 },
      { key: 'toY', label: 'End Y', type: 'range', min: 50, max: 250, default: 150 },
      { key: 'fromScale', label: 'Start Scale', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'toScale', label: 'End Scale', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.5 },
      { key: 'rotation', label: 'End Rotation (°)', type: 'range', min: 0, max: 720, default: 360 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 90,
  },
  {
    name: 'Stagger',
    category: 'Animation',
    description: 'Staggered animation of child elements.',
    component: ({ controls }) => (
      <Stagger interval={controls.interval}>
        {[...Array(controls.count)].map((_, i) => (
          <FadeIn key={i} durationInFrames={20}>
            <Circle cx={60 + i * 55} cy={150} r={20} stroke="#4ecdc4" fill="rgba(78,205,196,0.2)" strokeWidth={2} />
          </FadeIn>
        ))}
      </Stagger>
    ),
    controls: [
      { key: 'count', label: 'Count', type: 'range', min: 2, max: 8, step: 1, default: 5 },
      { key: 'interval', label: 'Interval (frames)', type: 'range', min: 2, max: 20, default: 8 },
    ],
    defaultProps: {},
    width: 400,
    height: 300,
    durationInFrames: 120,
  },
];

// ─── Controls Panel ──────────────────────────────────────────────────────────

function ControlPanel({
  controls,
  values,
  onChange,
}: {
  controls: ControlDef[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {controls.map((ctrl) => (
        <div key={ctrl.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ width: 130, fontSize: 13, color: '#aaa', flexShrink: 0 }}>
            {ctrl.label}
          </label>
          {ctrl.type === 'range' && (
            <>
              <input
                type="range"
                min={ctrl.min} max={ctrl.max} step={ctrl.step ?? 1}
                value={values[ctrl.key]}
                onChange={(e) => onChange(ctrl.key, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 45, fontSize: 12, color: '#888', textAlign: 'right' }}>
                {values[ctrl.key]}
              </span>
            </>
          )}
          {ctrl.type === 'number' && (
            <input
              type="number"
              value={values[ctrl.key]}
              onChange={(e) => onChange(ctrl.key, parseFloat(e.target.value))}
              style={{ width: 80, background: '#1a1a2e', border: '1px solid #333', color: '#e0e0e0', padding: '4px 8px', borderRadius: 4 }}
            />
          )}
          {ctrl.type === 'color' && (
            <input
              type="color"
              value={values[ctrl.key]}
              onChange={(e) => onChange(ctrl.key, e.target.value)}
              style={{ width: 40, height: 28, border: 'none', cursor: 'pointer' }}
            />
          )}
          {ctrl.type === 'text' && (
            <input
              type="text"
              value={values[ctrl.key]}
              onChange={(e) => onChange(ctrl.key, e.target.value)}
              style={{ flex: 1, background: '#1a1a2e', border: '1px solid #333', color: '#e0e0e0', padding: '4px 8px', borderRadius: 4, fontSize: 13 }}
            />
          )}
          {ctrl.type === 'boolean' && (
            <input
              type="checkbox"
              checked={values[ctrl.key]}
              onChange={(e) => onChange(ctrl.key, e.target.checked)}
            />
          )}
          {ctrl.type === 'select' && (
            <select
              value={values[ctrl.key]}
              onChange={(e) => onChange(ctrl.key, e.target.value)}
              style={{ background: '#1a1a2e', border: '1px solid #333', color: '#e0e0e0', padding: '4px 8px', borderRadius: 4 }}
            >
              {ctrl.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Explorer Component ─────────────────────────────────────────────────

export function Explorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [controlValues, setControlValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(PRIMITIVES[0].controls.map((c) => [c.key, c.default]))
  );

  const categories = useMemo(() => {
    const cats = new Map<string, PrimitiveEntry[]>();
    PRIMITIVES.forEach((p) => {
      const list = cats.get(p.category) || [];
      list.push(p);
      cats.set(p.category, list);
    });
    return cats;
  }, []);

  const selected = PRIMITIVES[selectedIndex];

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const entry = PRIMITIVES[index];
    setControlValues(
      Object.fromEntries(entry.controls.map((c) => [c.key, c.default]))
    );
  };

  const handleControlChange = (key: string, value: any) => {
    setControlValues((prev) => ({ ...prev, [key]: value }));
  };

  // Force re-mount Player when controls change by using a key
  const playerKey = JSON.stringify(controlValues);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240,
        background: '#0f0f20',
        borderRight: '1px solid #222',
        overflowY: 'auto',
        padding: '16px 0',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 18, padding: '0 16px 16px', color: '#4ecdc4', fontWeight: 700 }}>
          ✨ Elucim Explorer
        </h1>
        {[...categories.entries()].map(([cat, entries]) => (
          <div key={cat}>
            <div style={{
              padding: '8px 16px',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#666',
              fontWeight: 600,
            }}>
              {cat}
            </div>
            {entries.map((entry) => {
              const idx = PRIMITIVES.indexOf(entry);
              const isActive = idx === selectedIndex;
              return (
                <button
                  key={entry.name}
                  onClick={() => handleSelect(idx)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 16px 8px 24px',
                    background: isActive ? 'rgba(78,205,196,0.12)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #4ecdc4' : '3px solid transparent',
                    color: isActive ? '#4ecdc4' : '#aaa',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                >
                  {entry.name}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid #222',
          background: '#0d0d1a',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{selected.name}</h2>
          <p style={{ color: '#888', fontSize: 14 }}>{selected.description}</p>
        </header>

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', padding: 24, gap: 24 }}>
          <div style={{ flex: 1 }}>
            <Player
              key={playerKey}
              width={selected.width ?? 400}
              height={selected.height ?? 300}
              fps={selected.fps ?? 60}
              durationInFrames={selected.durationInFrames ?? 90}
              background="#111127"
            >
              <selected.component controls={controlValues} />
            </Player>

            {/* Code snippet */}
            <div style={{
              marginTop: 16,
              background: '#0f0f20',
              border: '1px solid #222',
              borderRadius: 8,
              padding: 16,
              fontSize: 13,
              fontFamily: 'monospace',
              color: '#aaa',
              overflow: 'auto',
              maxHeight: 200,
            }}>
              <div style={{ color: '#666', marginBottom: 8, fontSize: 11, textTransform: 'uppercase' }}>
                Props
              </div>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(controlValues, null, 2)}
              </pre>
            </div>
          </div>

          {/* Controls Panel */}
          <div style={{
            width: 320,
            background: '#0f0f20',
            border: '1px solid #222',
            borderRadius: 8,
            padding: 16,
            overflowY: 'auto',
            flexShrink: 0,
          }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#666', marginBottom: 16 }}>
              Controls
            </h3>
            <ControlPanel
              controls={selected.controls}
              values={controlValues}
              onChange={handleControlChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
