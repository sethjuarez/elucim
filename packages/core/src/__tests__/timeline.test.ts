import { describe, it, expect } from 'vitest';
import { Timeline } from '../animations/Timeline';
import { easeInQuad } from '../easing/functions';

describe('Timeline', () => {
  describe('constructor', () => {
    it('starts with cursor at 0', () => {
      const tl = new Timeline(60);
      expect(tl.currentFrame).toBe(0);
      expect(tl.currentTime).toBe(0);
    });

    it('defaults to 60 fps', () => {
      const tl = new Timeline();
      tl.play('fadeIn', 'obj', { runTime: 1 });
      const { actions } = tl.compile();
      expect(actions[0].durationFrames).toBe(60);
    });
  });

  describe('play', () => {
    it('adds an action at the current cursor', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'circle1', { runTime: 1 });
      const { actions } = tl.compile();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        id: 'circle1',
        type: 'fadeIn',
        startFrame: 0,
        durationFrames: 60,
      });
    });

    it('advances the cursor after play', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'circle1', { runTime: 1 });
      expect(tl.currentFrame).toBe(60);
      expect(tl.currentTime).toBeCloseTo(1);
    });

    it('chains sequentially', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'obj1', { runTime: 1 });
      tl.play('draw', 'obj2', { runTime: 2 });
      const { actions } = tl.compile();
      expect(actions[0].startFrame).toBe(0);
      expect(actions[1].startFrame).toBe(60);
      expect(actions[1].durationFrames).toBe(120);
    });

    it('supports custom easing', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'obj', { runTime: 1, easing: easeInQuad });
      const { actions } = tl.compile();
      expect(actions[0].easing(0.5)).toBeCloseTo(0.25);
    });

    it('supports custom props', () => {
      const tl = new Timeline(60);
      tl.play('transform', 'obj', { runTime: 1, props: { scale: 2, rotate: 90 } });
      const { actions } = tl.compile();
      expect(actions[0].props).toEqual({ scale: 2, rotate: 90 });
    });

    it('is chainable', () => {
      const tl = new Timeline(60);
      const result = tl.play('fadeIn', 'obj1').play('draw', 'obj2');
      expect(result).toBe(tl);
    });
  });

  describe('add', () => {
    it('does not advance the cursor', () => {
      const tl = new Timeline(60);
      tl.add('fadeIn', 'obj1', { runTime: 1 });
      expect(tl.currentFrame).toBe(0);
    });

    it('places parallel actions at the same start frame', () => {
      const tl = new Timeline(60);
      tl.add('fadeIn', 'obj1', { runTime: 1 });
      tl.add('draw', 'obj2', { runTime: 1 });
      const { actions } = tl.compile();
      expect(actions[0].startFrame).toBe(0);
      expect(actions[1].startFrame).toBe(0);
    });

    it('allows mix of play and add for parallel + sequential', () => {
      const tl = new Timeline(60);
      tl.add('fadeIn', 'obj1', { runTime: 1 });   // 0-60, no advance
      tl.play('draw', 'obj2', { runTime: 1 });      // 0-60, advances to 60
      tl.play('write', 'obj3', { runTime: 0.5 });   // 60-90, advances to 90
      const { actions } = tl.compile();
      expect(actions[0].startFrame).toBe(0);
      expect(actions[1].startFrame).toBe(0);
      expect(actions[2].startFrame).toBe(60);
    });
  });

  describe('wait', () => {
    it('advances cursor by wait duration', () => {
      const tl = new Timeline(60);
      tl.wait(0.5);
      expect(tl.currentFrame).toBe(30);
    });

    it('creates a wait action', () => {
      const tl = new Timeline(60);
      tl.wait(1);
      const { actions } = tl.compile();
      expect(actions[0].type).toBe('wait');
      expect(actions[0].durationFrames).toBe(60);
    });

    it('inserts gap between animations', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'obj1', { runTime: 1 });
      tl.wait(0.5);
      tl.play('draw', 'obj2', { runTime: 1 });
      const { actions } = tl.compile();
      expect(actions[2].startFrame).toBe(90);
    });
  });

  describe('compile', () => {
    it('calculates correct totalFrames', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'obj1', { runTime: 1 });
      tl.play('draw', 'obj2', { runTime: 2 });
      const { totalFrames } = tl.compile();
      expect(totalFrames).toBe(180);
    });

    it('accounts for parallel actions extending beyond cursor', () => {
      const tl = new Timeline(60);
      tl.add('fadeIn', 'obj1', { runTime: 3 }); // 0-180
      tl.play('draw', 'obj2', { runTime: 1 });   // 0-60
      const { totalFrames } = tl.compile();
      expect(totalFrames).toBe(180);
    });

    it('returns empty when no actions added', () => {
      const tl = new Timeline(60);
      const { actions, totalFrames } = tl.compile();
      expect(actions).toHaveLength(0);
      expect(totalFrames).toBe(0);
    });

    it('returns a copy of actions', () => {
      const tl = new Timeline(60);
      tl.play('fadeIn', 'obj1', { runTime: 1 });
      const result1 = tl.compile();
      const result2 = tl.compile();
      expect(result1.actions).not.toBe(result2.actions);
      expect(result1.actions).toEqual(result2.actions);
    });
  });

  describe('currentFrame and currentTime', () => {
    it('tracks cursor position accurately', () => {
      const tl = new Timeline(30);
      tl.play('fadeIn', 'obj1', { runTime: 2 }); // 60 frames at 30fps
      expect(tl.currentFrame).toBe(60);
      expect(tl.currentTime).toBeCloseTo(2);
    });
  });

  describe('complex timeline scenario', () => {
    it('builds a multi-step animation timeline', () => {
      const tl = new Timeline(60);

      // Step 1: Fade in circle (1s)
      tl.play('fadeIn', 'circle', { runTime: 1 });

      // Step 2: Draw line while fading in label (parallel, 1.5s)
      tl.add('draw', 'line', { runTime: 1.5 });
      tl.play('fadeIn', 'label', { runTime: 1 });

      // Step 3: Wait 0.5s
      tl.wait(0.5);

      // Step 4: Transform circle (1s)
      tl.play('transform', 'circle', { runTime: 1, props: { scale: 2 } });

      const { actions, totalFrames } = tl.compile();
      expect(actions).toHaveLength(5);
      expect(totalFrames).toBe(210); // 60+60+30+60

      // Verify timeline structure
      expect(actions[0]).toMatchObject({ id: 'circle', type: 'fadeIn', startFrame: 0 });
      expect(actions[1]).toMatchObject({ id: 'line', type: 'draw', startFrame: 60 });
      expect(actions[2]).toMatchObject({ id: 'label', type: 'fadeIn', startFrame: 60 });
      expect(actions[3]).toMatchObject({ type: 'wait', startFrame: 120 });
      expect(actions[4]).toMatchObject({ id: 'circle', type: 'transform', startFrame: 150, props: { scale: 2 } });
    });
  });
});
