import React from 'react';

/**
 * Static spatial transforms that any primitive or group can apply.
 * These control where and how an element appears.
 */
export interface SpatialProps {
  /** Rotation in degrees */
  rotation?: number;
  /** Center of rotation [x, y]. Defaults to element center. */
  rotationOrigin?: [number, number];
  /** Uniform scale (number) or [sx, sy] */
  scale?: number | [number, number];
  /** Translation offset [dx, dy] */
  translate?: [number, number];
}

/**
 * Base props shared by all elements (primitives, groups, images).
 */
export interface BaseElementProps {
  /** @deprecated Stacking now follows sibling order; later siblings render on top. */
  zIndex?: number;
  /** Optional identifier */
  id?: string;
}

/**
 * Builds an SVG transform string from SpatialProps.
 * Returns undefined if no transforms are applied.
 */
export function buildTransform(
  props: SpatialProps,
  defaultOrigin?: [number, number],
  defaultScaleOrigin?: [number, number]
): string | undefined {
  const parts: string[] = [];
  const { rotation, rotationOrigin, scale, translate } = props;

  if (translate) {
    parts.push(`translate(${translate[0]}, ${translate[1]})`);
  }

  if (rotation) {
    const [ox, oy] = rotationOrigin ?? defaultOrigin ?? [0, 0];
    parts.push(`rotate(${rotation}, ${ox}, ${oy})`);
  }

  if (scale !== undefined && scale !== 1) {
    const scaleOrigin = defaultScaleOrigin;
    if (scaleOrigin) {
      parts.push(`translate(${scaleOrigin[0]}, ${scaleOrigin[1]})`);
    }
    if (Array.isArray(scale)) {
      parts.push(`scale(${scale[0]}, ${scale[1]})`);
    } else {
      parts.push(`scale(${scale})`);
    }
    if (scaleOrigin) {
      parts.push(`translate(${-scaleOrigin[0]}, ${-scaleOrigin[1]})`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Wraps SVG content in a <g> with transform if any SpatialProps are active.
 * Pass-through (no extra <g>) when no transforms are set.
 */
export function withTransform(
  content: React.ReactElement,
  props: SpatialProps,
  defaultOrigin?: [number, number],
  defaultScaleOrigin?: [number, number]
): React.ReactElement {
  const transform = buildTransform(props, defaultOrigin, defaultScaleOrigin);
  if (!transform) return content;
  return <g transform={transform}>{content}</g>;
}

/**
 * Returns React children in sibling order.
 * @deprecated Use document/JSX order directly; zIndex is ignored for stacking.
 */
export function sortByZIndex(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children);
}
