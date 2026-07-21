import React from 'react';
import { withTransform, sortByZIndex, type SpatialProps, type BaseElementProps } from './transform';

export interface GroupProps extends SpatialProps, BaseElementProps {
  /** Child elements */
  children: React.ReactNode;
  /** Base opacity. Default: 1 */
  opacity?: number;
}

/**
 * Container that groups primitives as a single unit.
 * Applies shared transforms to all children.
 * Renders children in sibling order; later children paint on top.
 * Renders as an SVG <g> element.
 */
export function Group({
  children,
  rotation,
  rotationOrigin,
  scale,
  translate,
  opacity: baseOpacity = 1,
}: GroupProps) {
  const sorted = sortByZIndex(children);

  const el = (
    <g data-testid="elucim-group" opacity={baseOpacity}>
      {sorted}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate });
}
