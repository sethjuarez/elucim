import { describe, it, expect } from 'vitest';
import {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic, easeOutBounce,
  spring, cubicBezier,
} from '../easing/functions';

const allEasings = {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic, easeOutBounce,
};

describe('easing functions', () => {
  describe('boundary values', () => {
    for (const [name, fn] of Object.entries(allEasings)) {
      it(`${name}(0) should be 0`, () => {
        expect(fn(0)).toBeCloseTo(0, 4);
      });

      it(`${name}(1) should be 1`, () => {
        expect(fn(1)).toBeCloseTo(1, 4);
      });
    }
  });

  describe('linear', () => {
    it('returns input unchanged', () => {
      expect(linear(0.25)).toBeCloseTo(0.25);
      expect(linear(0.5)).toBeCloseTo(0.5);
      expect(linear(0.75)).toBeCloseTo(0.75);
    });
  });

  describe('easeIn functions are slower at start', () => {
    it('easeInQuad(0.25) < 0.25', () => {
      expect(easeInQuad(0.25)).toBeLessThan(0.25);
    });
    it('easeInCubic(0.25) < easeInQuad(0.25)', () => {
      expect(easeInCubic(0.25)).toBeLessThan(easeInQuad(0.25));
    });
  });

  describe('easeOut functions are faster at start', () => {
    it('easeOutQuad(0.25) > 0.25', () => {
      expect(easeOutQuad(0.25)).toBeGreaterThan(0.25);
    });
    it('easeOutCubic(0.25) > easeOutQuad(0.25)', () => {
      expect(easeOutCubic(0.25)).toBeGreaterThan(easeOutQuad(0.25));
    });
  });

  describe('easeInOut functions', () => {
    it('easeInOutQuad(0.5) ≈ 0.5', () => {
      expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 1);
    });
    it('easeInOutCubic(0.5) ≈ 0.5', () => {
      expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 1);
    });
    it('slower at start: easeInOutQuad(0.25) < 0.25', () => {
      expect(easeInOutQuad(0.25)).toBeLessThan(0.25);
    });
    it('faster at end: easeInOutQuad(0.75) > 0.75', () => {
      expect(easeInOutQuad(0.75)).toBeGreaterThan(0.75);
    });
  });

  describe('easeOutBounce', () => {
    it('returns values between 0 and 1 for all inputs', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const v = easeOutBounce(t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.001);
      }
    });
  });

  describe('easeOutElastic', () => {
    it('overshoots past 1 (elastic effect)', () => {
      // Elastic should overshoot at some point
      let hasOvershoot = false;
      for (let t = 0; t <= 1; t += 0.01) {
        if (easeOutElastic(t) > 1.01) {
          hasOvershoot = true;
          break;
        }
      }
      expect(hasOvershoot).toBe(true);
    });
  });

  describe('easeInBack', () => {
    it('goes negative (anticipation)', () => {
      let hasUndershoot = false;
      for (let t = 0; t <= 0.5; t += 0.01) {
        if (easeInBack(t) < -0.01) {
          hasUndershoot = true;
          break;
        }
      }
      expect(hasUndershoot).toBe(true);
    });
  });

  describe('spring', () => {
    it('returns a function', () => {
      const fn = spring();
      expect(typeof fn).toBe('function');
    });

    it('default spring: f(0) = 0, f(1) ≈ 1', () => {
      const fn = spring();
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    });

    it('high damping produces smooth curve', () => {
      const fn = spring({ stiffness: 100, damping: 20 });
      // Should be monotonically increasing (no oscillation)
      let prev = fn(0);
      let isMonotonic = true;
      for (let t = 0.05; t <= 1; t += 0.05) {
        const curr = fn(t);
        if (curr < prev - 0.01) {
          isMonotonic = false;
          break;
        }
        prev = curr;
      }
      expect(isMonotonic).toBe(true);
    });

    it('low damping produces oscillation', () => {
      const fn = spring({ stiffness: 200, damping: 3, mass: 1 });
      // Should oscillate (non-monotonic)
      let hasOscillation = false;
      let prev = fn(0);
      for (let t = 0.02; t <= 1; t += 0.02) {
        const curr = fn(t);
        if (curr < prev - 0.05) {
          hasOscillation = true;
          break;
        }
        prev = curr;
      }
      expect(hasOscillation).toBe(true);
    });
  });

  describe('cubicBezier', () => {
    it('linear bezier (0,0,1,1) matches linear', () => {
      const fn = cubicBezier(0, 0, 1, 1);
      expect(fn(0.5)).toBeCloseTo(0.5, 1);
      expect(fn(0.25)).toBeCloseTo(0.25, 1);
    });

    it('ease bezier produces expected curve', () => {
      const fn = cubicBezier(0.25, 0.1, 0.25, 1);
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
      // Should be a valid easing curve
      expect(fn(0.5)).toBeGreaterThan(0);
      expect(fn(0.5)).toBeLessThan(1);
    });

    it('aggressive ease-in bezier is slow at start', () => {
      const fn = cubicBezier(0.8, 0, 1, 1);
      expect(fn(0.25)).toBeLessThan(0.15);
    });
  });
});
