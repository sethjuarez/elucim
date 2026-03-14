import { describe, it, expect } from 'vitest';
import { validate } from '../validator/validate';

describe('Scene preset validation', () => {
  it('accepts preset "card" on a scene node', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'scene',
        durationInFrames: 30,
        preset: 'card',
        children: [{ type: 'circle', cx: 100, cy: 100, r: 50 }],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts preset "slide" on a player node', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'player',
        durationInFrames: 60,
        width: 800,
        height: 600,
        fps: 30,
        preset: 'slide',
        children: [{ type: 'rect', x: 0, y: 0, width: 100, height: 100 }],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts preset "square" on a scene node', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'scene',
        durationInFrames: 30,
        preset: 'square',
        children: [],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts preset on a presentation node', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'presentation',
        preset: 'card',
        slides: [
          {
            title: 'First',
            durationInFrames: 60,
            children: [{ type: 'text', content: 'Hello', x: 50, y: 50, fontSize: 24 }],
          },
        ],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an invalid preset value', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'scene',
        durationInFrames: 30,
        preset: 'invalid',
        children: [{ type: 'circle', cx: 100, cy: 100, r: 50 }],
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'root.preset')).toBe(true);
  });

  it('includes valid options in the preset error message', () => {
    const result = validate({
      version: '1.0',
      root: {
        type: 'scene',
        durationInFrames: 30,
        preset: 'widescreen',
        children: [],
      },
    });
    const presetError = result.errors.find(e => e.path === 'root.preset');
    expect(presetError).toBeDefined();
    expect(presetError!.message).toContain('card');
    expect(presetError!.message).toContain('slide');
    expect(presetError!.message).toContain('square');
  });
});
