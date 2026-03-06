import { describe, it, expect } from 'vitest';
import { Group } from '../primitives/Group';

describe('Group', () => {
  it('is exported as a function', () => {
    expect(typeof Group).toBe('function');
  });

  it('has the expected function name', () => {
    expect(Group.name).toBe('Group');
  });
});
