import React from 'react';
import {
  AccumulationArea,
  Arrow,
  Axes,
  BarChart,
  BezierCurve,
  Circle,
  FunctionPlot,
  Graph,
  Group,
  Image,
  LaTeX,
  Line,
  Matrix,
  Polygon,
  Rect,
  RiemannSum,
  SecantLine,
  TangentLine,
  Text,
  TextBox,
  Vector,
  VectorField,
} from '@elucim/core';
import type { ElementNode } from './projectionTypes';

type ProjectionComponent = React.ComponentType<Record<string, unknown>>;

const components: Record<string, ProjectionComponent> = {
  accumulationArea: AccumulationArea as unknown as ProjectionComponent,
  arrow: Arrow as unknown as ProjectionComponent,
  axes: Axes as unknown as ProjectionComponent,
  barChart: BarChart as unknown as ProjectionComponent,
  bezierCurve: BezierCurve as unknown as ProjectionComponent,
  circle: Circle as unknown as ProjectionComponent,
  functionPlot: FunctionPlot as unknown as ProjectionComponent,
  graph: Graph as unknown as ProjectionComponent,
  image: Image as unknown as ProjectionComponent,
  latex: LaTeX as unknown as ProjectionComponent,
  line: Line as unknown as ProjectionComponent,
  matrix: Matrix as unknown as ProjectionComponent,
  polygon: Polygon as unknown as ProjectionComponent,
  rect: Rect as unknown as ProjectionComponent,
  riemannSum: RiemannSum as unknown as ProjectionComponent,
  secantLine: SecantLine as unknown as ProjectionComponent,
  tangentLine: TangentLine as unknown as ProjectionComponent,
  text: Text as unknown as ProjectionComponent,
  textbox: TextBox as unknown as ProjectionComponent,
  vector: Vector as unknown as ProjectionComponent,
  vectorField: VectorField as unknown as ProjectionComponent,
};

/** Renders the editor's static projection without supporting motion wrappers. */
export function renderProjectionElement(element: ElementNode, key: React.Key): React.ReactNode {
  if (element.type === 'group') {
    const { children, type: _type, ...props } = element as unknown as Record<string, unknown> & { children: ElementNode[] };
    return (
      <Group key={key} {...props}>
        {children.map((child, index) => renderProjectionElement(child, index))}
      </Group>
    );
  }

  const Component = components[element.type];
  if (!Component) {
    throw new Error(`Unsupported canonical editor element type "${element.type}".`);
  }

  const { children: _children, type: _type, ...props } = element as unknown as Record<string, unknown>;
  if (element.type === 'text') {
    const { content, ...textProps } = props;
    return <Component key={key} {...textProps}>{typeof content === 'string' ? content : ''}</Component>;
  }
  return <Component key={key} {...props} />;
}
