import { describe, it, expect } from 'vitest';
import { Image } from '../primitives/Image';

describe('Image', () => {
  it('is exported as a function', () => {
    expect(typeof Image).toBe('function');
  });

  it('has the expected function name', () => {
    expect(Image.name).toBe('Image');
  });
});
