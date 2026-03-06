import React from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, sortByZIndex, type SpatialProps, type BaseElementProps } from './transform';

export interface GroupProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** Child elements */
  children: React.ReactNode;
}

/**
 * Container that groups primitives as a single unit.
 * Applies shared transforms and animations to all children.
 * Sorts children by zIndex for stacking order control.
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
}: GroupProps) {
  const anim = useAnimation({ fadeIn, fadeOut, easing });
  const sorted = sortByZIndex(children);

  const el = (
    <g data-testid="elucim-group" opacity={anim.opacity}>
      {sorted}
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate });
}
