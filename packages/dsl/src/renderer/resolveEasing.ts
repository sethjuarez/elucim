import {
  type EasingFunction,
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeOutBounce,
  spring,
  cubicBezier,
} from '@elucim/core';
import type { EasingSpec } from '../schema/types';

const EASING_MAP: Record<string, EasingFunction> = {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeOutBounce,
};

/**
 * Resolve an EasingSpec (string name or spring/cubicBezier object) to an EasingFunction.
 * Returns undefined if the spec is undefined.
 * Throws if the easing name is unknown.
 */
export function resolveEasing(spec: EasingSpec | undefined): EasingFunction | undefined {
  if (spec === undefined) return undefined;

  if (typeof spec === 'string') {
    const fn = EASING_MAP[spec];
    if (!fn) {
      const names = Object.keys(EASING_MAP);
      const closest = names.find(n => n.toLowerCase() === spec.toLowerCase());
      const suggestion = closest ? ` Did you mean '${closest}'?` : '';
      throw new Error(`Unknown easing '${spec}'.${suggestion} Available: ${names.join(', ')}`);
    }
    return fn;
  }

  if (spec.type === 'spring') {
    return spring({
      stiffness: spec.stiffness,
      damping: spec.damping,
      mass: spec.mass,
    });
  }

  if (spec.type === 'cubicBezier') {
    return cubicBezier(spec.x1, spec.y1, spec.x2, spec.y2);
  }

  throw new Error(`Unknown easing type: ${(spec as { type: string }).type}`);
}

/** All valid easing name strings */
export const VALID_EASING_NAMES = Object.keys(EASING_MAP);
