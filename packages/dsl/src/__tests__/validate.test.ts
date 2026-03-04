import { describe, it, expect } from 'vitest';
import { validate } from '../validator/validate';

describe('DSL Validator', () => {
  describe('document structure', () => {
    it('accepts a valid minimal scene', () => {
      const result = validate({
        version: '1.0',
        root: {
          type: 'scene',
          durationInFrames: 60,
          children: [],
        },
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid player', () => {
      const result = validate({
        version: '1.0',
        root: {
          type: 'player',
          durationInFrames: 90,
          width: 800,
          height: 600,
          fps: 30,
          controls: true,
          loop: true,
          autoPlay: false,
          children: [],
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing version', () => {
      const result = validate({ root: { type: 'scene', durationInFrames: 60, children: [] } });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'version')).toBe(true);
    });

    it('rejects wrong version', () => {
      const result = validate({ version: '2.0', root: { type: 'scene', durationInFrames: 60, children: [] } });
      expect(result.valid).toBe(false);
    });

    it('rejects missing root', () => {
      const result = validate({ version: '1.0' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'root')).toBe(true);
    });

    it('rejects non-object input', () => {
      const result = validate('not an object');
      expect(result.valid).toBe(false);
    });

    it('rejects null input', () => {
      const result = validate(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('primitive validation', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 60, children: [child] },
    });

    it('accepts a valid circle', () => {
      const result = validate(wrap({ type: 'circle', cx: 100, cy: 100, r: 50 }));
      expect(result.valid).toBe(true);
    });

    it('rejects circle without r', () => {
      const result = validate(wrap({ type: 'circle', cx: 100, cy: 100 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('"r"'))).toBe(true);
    });

    it('rejects circle with negative r', () => {
      const result = validate(wrap({ type: 'circle', cx: 100, cy: 100, r: -5 }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid line', () => {
      const result = validate(wrap({ type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 }));
      expect(result.valid).toBe(true);
    });

    it('rejects line missing coordinates', () => {
      const result = validate(wrap({ type: 'line', x1: 0, y1: 0 }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid rect', () => {
      const result = validate(wrap({ type: 'rect', x: 0, y: 0, width: 100, height: 50 }));
      expect(result.valid).toBe(true);
    });

    it('accepts a valid text', () => {
      const result = validate(wrap({ type: 'text', x: 100, y: 100, content: 'Hello' }));
      expect(result.valid).toBe(true);
    });

    it('rejects text without content', () => {
      const result = validate(wrap({ type: 'text', x: 100, y: 100 }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid polygon', () => {
      const result = validate(wrap({
        type: 'polygon',
        points: [[0, 0], [100, 0], [50, 100]],
      }));
      expect(result.valid).toBe(true);
    });

    it('rejects polygon with fewer than 3 points', () => {
      const result = validate(wrap({
        type: 'polygon',
        points: [[0, 0], [100, 0]],
      }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid arrow', () => {
      const result = validate(wrap({ type: 'arrow', x1: 0, y1: 0, x2: 100, y2: 100 }));
      expect(result.valid).toBe(true);
    });
  });

  describe('math node validation', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 60, children: [child] },
    });

    it('accepts a valid axes', () => {
      const result = validate(wrap({ type: 'axes', domain: [-5, 5], range: [-3, 3] }));
      expect(result.valid).toBe(true);
    });

    it('accepts a valid functionPlot', () => {
      const result = validate(wrap({ type: 'functionPlot', fn: 'sin(x)' }));
      expect(result.valid).toBe(true);
    });

    it('rejects functionPlot with invalid expression', () => {
      const result = validate(wrap({ type: 'functionPlot', fn: 'sin(' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('.fn'))).toBe(true);
    });

    it('accepts a valid vector', () => {
      const result = validate(wrap({ type: 'vector', to: [3, 4] }));
      expect(result.valid).toBe(true);
    });

    it('rejects vector without to', () => {
      const result = validate(wrap({ type: 'vector' }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid vectorField', () => {
      const result = validate(wrap({ type: 'vectorField', fn: '[-y, x]' }));
      expect(result.valid).toBe(true);
    });

    it('rejects vectorField with invalid expression', () => {
      const result = validate(wrap({ type: 'vectorField', fn: '[-y,' }));
      expect(result.valid).toBe(false);
    });

    it('accepts a valid matrix', () => {
      const result = validate(wrap({ type: 'matrix', values: [[1, 2], [3, 4]] }));
      expect(result.valid).toBe(true);
    });

    it('accepts a valid graph', () => {
      const result = validate(wrap({
        type: 'graph',
        nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }],
        edges: [{ from: 'a', to: 'b' }],
      }));
      expect(result.valid).toBe(true);
    });

    it('rejects graph with duplicate node IDs', () => {
      const result = validate(wrap({
        type: 'graph',
        nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'a', x: 100, y: 0 }],
        edges: [],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('rejects graph edges referencing unknown nodes', () => {
      const result = validate(wrap({
        type: 'graph',
        nodes: [{ id: 'a', x: 0, y: 0 }],
        edges: [{ from: 'a', to: 'z' }],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unknown node'))).toBe(true);
    });

    it('accepts a valid latex', () => {
      const result = validate(wrap({ type: 'latex', expression: '\\frac{a}{b}', x: 100, y: 100 }));
      expect(result.valid).toBe(true);
    });

    it('rejects latex without expression', () => {
      const result = validate(wrap({ type: 'latex', x: 100, y: 100 }));
      expect(result.valid).toBe(false);
    });
  });

  describe('animation wrapper validation', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 60, children: [child] },
    });

    it('accepts fadeIn with children', () => {
      const result = validate(wrap({
        type: 'fadeIn',
        duration: 30,
        children: [{ type: 'circle', cx: 50, cy: 50, r: 20 }],
      }));
      expect(result.valid).toBe(true);
    });

    it('accepts transform with all props', () => {
      const result = validate(wrap({
        type: 'transform',
        duration: 60,
        translate: { from: [0, 0], to: [100, 100] },
        scale: { from: 1, to: 2 },
        rotate: { from: 0, to: 360 },
        opacity: { from: 0, to: 1 },
        children: [{ type: 'rect', x: 0, y: 0, width: 50, height: 50 }],
      }));
      expect(result.valid).toBe(true);
    });

    it('accepts stagger', () => {
      const result = validate(wrap({
        type: 'stagger',
        staggerDelay: 10,
        children: [
          { type: 'circle', cx: 50, cy: 50, r: 10 },
          { type: 'circle', cx: 100, cy: 50, r: 10 },
        ],
      }));
      expect(result.valid).toBe(true);
    });

    it('accepts morph', () => {
      const result = validate(wrap({
        type: 'morph',
        duration: 60,
        fromColor: '#ff0000',
        toColor: '#0000ff',
        fromScale: 1,
        toScale: 2,
        children: [{ type: 'circle', cx: 50, cy: 50, r: 20 }],
      }));
      expect(result.valid).toBe(true);
    });
  });

  describe('easing validation', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 60, children: [child] },
    });

    it('accepts valid easing name', () => {
      const result = validate(wrap({ type: 'circle', cx: 50, cy: 50, r: 20, easing: 'easeInOutCubic' }));
      expect(result.valid).toBe(true);
    });

    it('rejects invalid easing name with suggestion', () => {
      const result = validate(wrap({ type: 'circle', cx: 50, cy: 50, r: 20, easing: 'easeInOutBack' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown easing'))).toBe(true);
    });

    it('accepts spring easing object', () => {
      const result = validate(wrap({
        type: 'circle', cx: 50, cy: 50, r: 20,
        easing: { type: 'spring', stiffness: 100, damping: 10 },
      }));
      expect(result.valid).toBe(true);
    });

    it('accepts cubicBezier easing object', () => {
      const result = validate(wrap({
        type: 'circle', cx: 50, cy: 50, r: 20,
        easing: { type: 'cubicBezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
      }));
      expect(result.valid).toBe(true);
    });

    it('rejects cubicBezier with missing params', () => {
      const result = validate(wrap({
        type: 'circle', cx: 50, cy: 50, r: 20,
        easing: { type: 'cubicBezier', x1: 0.25 },
      }));
      expect(result.valid).toBe(false);
    });
  });

  describe('presentation validation', () => {
    it('accepts valid presentation', () => {
      const result = validate({
        version: '1.0',
        root: {
          type: 'presentation',
          transition: 'fade',
          slides: [
            { type: 'slide', title: 'Hello', children: [] },
            { type: 'slide', title: 'World', notes: 'Say hi', children: [] },
          ],
        },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid transition type', () => {
      const result = validate({
        version: '1.0',
        root: {
          type: 'presentation',
          transition: 'wipe',
          slides: [{ type: 'slide', children: [] }],
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid transition'))).toBe(true);
    });

    it('rejects presentation without slides', () => {
      const result = validate({
        version: '1.0',
        root: { type: 'presentation' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('unknown types', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 60, children: [child] },
    });

    it('rejects unknown element type', () => {
      const result = validate(wrap({ type: 'banana' }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown element type'))).toBe(true);
    });

    it('rejects unknown root type', () => {
      const result = validate({
        version: '1.0',
        root: { type: 'unknown' },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('sequence validation', () => {
    const wrap = (child: unknown) => ({
      version: '1.0',
      root: { type: 'scene', durationInFrames: 120, children: [child] },
    });

    it('accepts valid sequence', () => {
      const result = validate(wrap({
        type: 'sequence',
        from: 0,
        durationInFrames: 60,
        children: [{ type: 'circle', cx: 50, cy: 50, r: 20 }],
      }));
      expect(result.valid).toBe(true);
    });

    it('rejects sequence without from', () => {
      const result = validate(wrap({
        type: 'sequence',
        children: [{ type: 'circle', cx: 50, cy: 50, r: 20 }],
      }));
      expect(result.valid).toBe(false);
    });
  });
});
