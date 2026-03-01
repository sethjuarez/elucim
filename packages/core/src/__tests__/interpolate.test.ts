import { describe, it, expect } from 'vitest';
import { interpolate } from '../hooks/interpolate';
import { easeInQuad, easeOutCubic, linear } from '../easing/functions';

describe('interpolate', () => {
  describe('basic linear interpolation', () => {
    it('maps frame 0 to first output value', () => {
      expect(interpolate(0, [0, 60], [0, 100])).toBe(0);
    });

    it('maps frame 60 to last output value', () => {
      expect(interpolate(60, [0, 60], [0, 100])).toBe(100);
    });

    it('maps midpoint correctly', () => {
      expect(interpolate(30, [0, 60], [0, 100])).toBeCloseTo(50);
    });

    it('maps quarter point correctly', () => {
      expect(interpolate(15, [0, 60], [0, 100])).toBeCloseTo(25);
    });
  });

  describe('non-zero start values', () => {
    it('maps with offset input range', () => {
      expect(interpolate(40, [20, 80], [0, 300])).toBeCloseTo(100);
    });

    it('maps with offset output range', () => {
      expect(interpolate(30, [0, 60], [100, 200])).toBeCloseTo(150);
    });

    it('handles negative output values', () => {
      expect(interpolate(30, [0, 60], [-100, 100])).toBeCloseTo(0);
    });
  });

  describe('multi-segment interpolation', () => {
    it('interpolates within first segment', () => {
      expect(interpolate(15, [0, 30, 60], [0, 100, 0])).toBeCloseTo(50);
    });

    it('interpolates within second segment', () => {
      expect(interpolate(45, [0, 30, 60], [0, 100, 0])).toBeCloseTo(50);
    });

    it('hits exact midpoint value', () => {
      expect(interpolate(30, [0, 30, 60], [0, 100, 0])).toBeCloseTo(100);
    });

    it('works with 4 segments', () => {
      const result = interpolate(50, [0, 25, 50, 75, 100], [0, 100, 200, 100, 0]);
      expect(result).toBeCloseTo(200);
    });
  });

  describe('clamping (default)', () => {
    it('clamps frame below input range', () => {
      expect(interpolate(-10, [0, 60], [0, 100])).toBe(0);
    });

    it('clamps frame above input range', () => {
      expect(interpolate(120, [0, 60], [0, 100])).toBe(100);
    });
  });

  describe('extrapolation', () => {
    it('extends left when extrapolateLeft is extend', () => {
      const result = interpolate(-30, [0, 60], [0, 100], { extrapolateLeft: 'extend' });
      expect(result).toBeCloseTo(-50);
    });

    it('extends right when extrapolateRight is extend', () => {
      const result = interpolate(120, [0, 60], [0, 100], { extrapolateRight: 'extend' });
      expect(result).toBeCloseTo(200);
    });
  });

  describe('with easing functions', () => {
    it('applies easeInQuad easing', () => {
      const result = interpolate(30, [0, 60], [0, 100], { easing: easeInQuad });
      // easeInQuad(0.5) = 0.25, so output = 25
      expect(result).toBeCloseTo(25);
    });

    it('applies easeOutCubic easing', () => {
      const result = interpolate(30, [0, 60], [0, 100], { easing: easeOutCubic });
      // easeOutCubic(0.5) = 0.875, so output = 87.5
      expect(result).toBeCloseTo(87.5);
    });

    it('easing does not affect start and end values', () => {
      expect(interpolate(0, [0, 60], [0, 100], { easing: easeInQuad })).toBe(0);
      expect(interpolate(60, [0, 60], [0, 100], { easing: easeInQuad })).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('throws when ranges have different lengths', () => {
      expect(() => interpolate(0, [0, 60], [0, 50, 100])).toThrow();
    });

    it('throws when ranges have fewer than 2 elements', () => {
      expect(() => interpolate(0, [0], [0])).toThrow();
    });

    it('handles equal input range values', () => {
      const result = interpolate(30, [30, 30], [0, 100]);
      expect(result).toBe(100);
    });
  });
});
