import { useEffect, useRef, useState } from 'react';
import type { ElementNode } from '@elucim/dsl';
import type { BoundingBox } from '../utils/bounds';
import { getElementBounds } from '../utils/bounds';

/**
 * Measures actual rendered SVG element bounds via getBBox().
 * Pixel-perfect and element-type-agnostic — works uniformly for every
 * element type without heuristics.
 *
 * Falls back to property-based estimates from getElementBounds() when
 * DOM measurement isn't available (SSR, JSDOM tests, unmounted).
 */
export function useMeasuredBounds(
  sceneSvgRef: React.RefObject<SVGSVGElement | null>,
  elementIds: string[],
  elements: ElementNode[],
): Map<string, BoundingBox> {
  const [boundsMap, setBoundsMap] = useState<Map<string, BoundingBox>>(() => new Map());
  const prevJsonRef = useRef('');

  useEffect(() => {
    const svg = sceneSvgRef.current;

    // Build a serialization key so we only remeasure when elements actually change
    const key = elementIds.join(',') + '|' + elements.map(e => JSON.stringify(e)).join(',');
    if (key === prevJsonRef.current) return;
    prevJsonRef.current = key;

    const newMap = new Map<string, BoundingBox>();

    for (let i = 0; i < elementIds.length; i++) {
      const id = elementIds[i];
      const el = elements[i] as Record<string, any>;

      // Try DOM measurement first
      if (svg) {
        const wrapper = svg.querySelector(`[data-measure-id="${CSS.escape(id)}"]`);
        if (wrapper) {
          const measured = measureElement(wrapper as SVGGraphicsElement, el);
          if (measured) {
            newMap.set(id, measured);
            continue;
          }
        }
      }

      // Fallback to property-based estimate
      const fallback = getElementBounds(elements[i]);
      if (fallback) newMap.set(id, fallback);
    }

    setBoundsMap(newMap);
  });

  return boundsMap;
}

/**
 * Measure a single element via getBBox(). Navigates into the withTransform
 * wrapper to get pre-rotation intrinsic bounds, then attaches rotation info
 * from the element props.
 */
function measureElement(
  wrapper: SVGGraphicsElement,
  el: Record<string, any>,
): BoundingBox | null {
  try {
    // Navigate to the content element.
    // If withTransform wrapped the content in <g transform="rotate/scale(...)">
    // we want the intrinsic pre-rotation bounds. But we must NOT unwrap
    // positional translate-only groups (e.g. Matrix's translate(x,y)).
    let target: SVGGraphicsElement = wrapper;
    const firstChild = wrapper.firstElementChild as SVGGraphicsElement | null;
    if (firstChild && firstChild.tagName === 'g') {
      const transformStr = firstChild.getAttribute('transform') ?? '';
      // Only unwrap rotation/scale wrappers from withTransform
      if (/rotate\s*\(|scale\s*\(/.test(transformStr)) {
        target = firstChild;
      }
    }

    const bbox = target.getBBox();
    if (bbox.width === 0 && bbox.height === 0) return null;

    const result: BoundingBox = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };

    // Attach rotation info from element props
    const rotation = el.rotation as number | undefined;
    if (rotation) {
      result.rotation = rotation;
      result.rotationCenter = getRotationCenter(el, bbox);
    }

    return result;
  } catch {
    // getBBox can throw if element is not rendered (display:none, etc.)
    return null;
  }
}

/** Derive rotation center from element properties (matches core's withTransform defaults). */
function getRotationCenter(
  el: Record<string, any>,
  bbox: DOMRect,
): [number, number] {
  // Explicit rotationOrigin wins
  if (Array.isArray(el.rotationOrigin)) {
    return el.rotationOrigin as [number, number];
  }
  // Property-based detection (same order as core primitives)
  if (typeof el.cx === 'number' && typeof el.cy === 'number') {
    return [el.cx, el.cy];
  }
  if (Array.isArray(el.origin)) {
    return el.origin as [number, number];
  }
  if (typeof el.x1 === 'number' && typeof el.x2 === 'number') {
    return [(el.x1 + el.x2) / 2, (el.y1 + el.y2) / 2];
  }
  if (typeof el.x === 'number' && ('content' in el || 'expression' in el)) {
    return [el.x, el.y];
  }
  // Default: center of measured bounds
  return [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];
}
