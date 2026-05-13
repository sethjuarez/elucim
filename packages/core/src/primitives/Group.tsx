import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, sortByZIndex, type SpatialProps, type BaseElementProps } from './transform';

export interface GroupProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** Child elements */
  children: React.ReactNode;
  /** Base opacity. Default: 1 */
  opacity?: number;
}

/**
 * Container that groups primitives as a single unit.
 * Applies shared transforms and animations to all children.
 * Renders children in sibling order; later children paint on top.
 * Renders as an SVG <g> element.
 */
export function Group({
  children,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
  opacity: baseOpacity = 1,
}: GroupProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });
  const sorted = sortByZIndex(children);

  const el = (
    <g data-testid="elucim-group" opacity={baseOpacity * anim.opacity}>
      {sorted}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate });
}
