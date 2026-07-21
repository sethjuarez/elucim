import React from 'react';
import { DslRenderer, type ElucimDocument } from '@elucim/dsl';

function canonicalDemo(label: string, accent = '#4a9eff'): ElucimDocument {
  return {
    version: '2.0',
    scene: { type: 'scene', width: 500, height: 220, background: '#111127', children: ['card', 'title'] },
    elements: {
      card: { id: 'card', type: 'rect', props: { type: 'rect', x: 40, y: 35, width: 420, height: 150, rx: 16, fill: '#1f2440', stroke: accent, strokeWidth: 2 } },
      title: { id: 'title', type: 'text', props: { type: 'text', content: label, x: 250, y: 120, fill: '#ffffff', fontSize: 26, textAnchor: 'middle' } },
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [{ target: 'card', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 15, value: 1 }] }],
        effects: [{ id: 'title-reveal', kind: 'reveal', targets: ['title'], from: 8, duration: 18, strategy: 'type' }],
      },
    },
  };
}

function Demo({ label, accent }: { label: string; accent?: string }) {
  return <DslRenderer dsl={canonicalDemo(label, accent)} poster={18} />;
}

export const CircleDemo = () => <Demo label="Circle" />;
export const LineDemo = () => <Demo label="Line" accent="#4ecdc4" />;
export const ArrowDemo = () => <Demo label="Arrow" accent="#ffe66d" />;
export const RectDemo = () => <Demo label="Rectangle" accent="#ff6b6b" />;
export const TextDemo = () => <Demo label="Text" accent="#a29bfe" />;
export const PolygonDemo = () => <Demo label="Polygon" accent="#fd79a8" />;
export const ImageDemo = () => <Demo label="Image" accent="#f59e0b" />;
export const GroupDemo = () => <Demo label="Group" accent="#22c55e" />;
export const BezierCurveDemo = () => <Demo label="Bezier curve" accent="#8b5cf6" />;
export const AxesDemo = () => <Demo label="Axes" accent="#38bdf8" />;
export const VectorDemo = () => <Demo label="Vectors" accent="#06b6d4" />;
export const MatrixDemo = () => <Demo label="Matrix" accent="#e879f9" />;
export const GraphDemo = () => <Demo label="Graph" accent="#fb7185" />;
export const LaTeXDemo = () => <Demo label="LaTeX" accent="#facc15" />;
export const BarChartDemo = () => <Demo label="Bar chart" accent="#34d399" />;
export const CodeResultDemo = () => <Demo label="Canonical DSL result" />;
export const CodeResultTabs = CodeResultDemo;
export const QuickStartDemo = () => <Demo label="Quick start" />;
export const HeroDemo = () => <Demo label="Elucim" />;
export const TangentDemo = () => <Demo label="Tangent line" />;
export const PipelineDemo = () => <Demo label="Author → timeline → render" />;
export const CalcTitleDemo = () => <Demo label="Calculus" />;
export const AgenticDemo = () => <Demo label="Agentic documents" />;
export const TransformsDemo = () => <Demo label="Spatial transforms" />;
export const PresentationDemo = () => <Demo label="State-machine presentation" />;
