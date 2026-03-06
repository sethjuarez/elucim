import React from 'react';

/**
 * Static spatial transforms that any primitive or group can apply.
 * These compose uniformly with AnimationProps — transforms control
 * where/how an element appears, animations control timing.
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
  /** Controls rendering order. Higher values render on top. Default: 0 */
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
  defaultOrigin?: [number, number]
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
    if (Array.isArray(scale)) {
      parts.push(`scale(${scale[0]}, ${scale[1]})`);
    } else {
      parts.push(`scale(${scale})`);
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
  defaultOrigin?: [number, number]
): React.ReactElement {
  const transform = buildTransform(props, defaultOrigin);
  if (!transform) return content;
  return <g transform={transform}>{content}</g>;
}

/**
 * Sort React children by their zIndex prop (stable sort, default 0).
 * Used by Scene and Group to implement stacking order.
 */
export function sortByZIndex(children: React.ReactNode): React.ReactNode[] {
  const arr = React.Children.toArray(children);
  // Stable sort: elements with same zIndex preserve document order
  return arr.sort((a, b) => {
    const aZ = React.isValidElement(a) ? ((a.props as BaseElementProps).zIndex ?? 0) : 0;
    const bZ = React.isValidElement(b) ? ((b.props as BaseElementProps).zIndex ?? 0) : 0;
    return aZ - bZ;
  });
}
