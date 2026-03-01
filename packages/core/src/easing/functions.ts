import type { EasingFunction } from './types';

// ── Linear ──
export const linear: EasingFunction = (t) => t;

// ── Quadratic ──
export const easeInQuad: EasingFunction = (t) => t * t;
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// ── Cubic ──
export const easeInCubic: EasingFunction = (t) => t * t * t;
export const easeOutCubic: EasingFunction = (t) => (--t) * t * t + 1;
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// ── Quartic ──
export const easeInQuart: EasingFunction = (t) => t * t * t * t;
export const easeOutQuart: EasingFunction = (t) => 1 - (--t) * t * t * t;
export const easeInOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;

// ── Sine ──
export const easeInSine: EasingFunction = (t) =>
  1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFunction = (t) =>
  Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFunction = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// ── Exponential ──
export const easeInExpo: EasingFunction = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFunction = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFunction = (t) =>
  t === 0 ? 0
  : t === 1 ? 1
  : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2
  : (2 - Math.pow(2, -20 * t + 10)) / 2;

// ── Back ──
export const easeInBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};
export const easeOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── Elastic ──
export const easeOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

// ── Bounce ──
export const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// ── Spring (damped harmonic oscillator) ──
export function spring(config?: {
  stiffness?: number;
  damping?: number;
  mass?: number;
}): EasingFunction {
  const { stiffness = 100, damping = 10, mass = 1 } = config ?? {};
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  return (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;

    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (
        1 -
        Math.exp(-zeta * w0 * t) *
          (Math.cos(wd * t) + (zeta * w0) / wd * Math.sin(wd * t))
      );
    }
    // Critically/over-damped
    return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  };
}

// ── Custom cubic-bezier ──
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): EasingFunction {
  // Newton-Raphson to solve for t given x
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCubic(x1, x2, t) - x;
      if (Math.abs(currentX) < 1e-6) break;
      const dx = sampleCubicDerivative(x1, x2, t);
      if (Math.abs(dx) < 1e-6) break;
      t -= currentX / dx;
    }
    t = Math.max(0, Math.min(1, t));
    return sampleCubic(y1, y2, t);
  };
}

function sampleCubic(a: number, b: number, t: number): number {
  // Bernstein polynomial: B(t) = 3a*t*(1-t)^2 + 3b*t^2*(1-t) + t^3
  return 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
}

function sampleCubicDerivative(a: number, b: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * a + 6 * (1 - t) * t * (b - a) + 3 * t * t * (1 - b);
}
