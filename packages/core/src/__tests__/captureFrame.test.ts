import { describe, it, expect } from 'vitest';
import { captureFrame, type CaptureFrameOptions } from '../export/captureFrame';

describe('captureFrame', () => {
  it('is exported as a function', () => {
    expect(typeof captureFrame).toBe('function');
  });

  it('CaptureFrameOptions type is usable', () => {
    const opts: CaptureFrameOptions = {
      width: 640,
      height: 360,
      format: 'png',
      quality: 0.92,
      scale: 2,
    };
    expect(opts.format).toBe('png');
    expect(opts.scale).toBe(2);
  });

  it('accepts jpeg format option', () => {
    const opts: CaptureFrameOptions = { format: 'jpeg', quality: 0.8 };
    expect(opts.format).toBe('jpeg');
    expect(opts.quality).toBe(0.8);
  });

  it('all options are optional (empty object is valid)', () => {
    const opts: CaptureFrameOptions = {};
    expect(opts.width).toBeUndefined();
    expect(opts.height).toBeUndefined();
    expect(opts.format).toBeUndefined();
  });
});
