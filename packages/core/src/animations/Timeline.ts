import type { EasingFunction } from '../easing/types';
import { linear } from '../easing/functions';

/**
 * A timeline action produced by the imperative DSL.
 * Each action maps to a Sequence + animation wrapper in the declarative tree.
 */
export interface TimelineAction {
  id: string;
  type: 'fadeIn' | 'fadeOut' | 'draw' | 'write' | 'transform' | 'wait' | 'custom';
  startFrame: number;
  durationFrames: number;
  easing: EasingFunction;
  props?: Record<string, unknown>;
}

export interface PlayOptions {
  /** Duration in seconds. Default: 1 */
  runTime?: number;
  /** Easing function */
  easing?: EasingFunction;
  /** Additional props to pass to the animation */
  props?: Record<string, unknown>;
}

/**
 * Imperative timeline builder.
 * Builds a list of TimelineActions that can be rendered by <TimelineRenderer>.
 *
 * Usage:
 *   const timeline = new Timeline(60); // 60 fps
 *   timeline.play('fadeIn', 'circle1', { runTime: 1 });
 *   timeline.play('draw', 'curve1', { runTime: 2 });
 *   timeline.wait(0.5);
 *   timeline.play('write', 'label1');
 *
 *   // Get the compiled actions + total duration
 *   const { actions, totalFrames } = timeline.compile();
 */
export class Timeline {
  private fps: number;
  private cursor: number = 0;
  private actions: TimelineAction[] = [];
  private idCounter = 0;

  constructor(fps: number = 60) {
    this.fps = fps;
  }

  /**
   * Play an animation sequentially (advances the cursor).
   */
  play(
    type: TimelineAction['type'],
    targetId: string,
    options: PlayOptions = {}
  ): this {
    const { runTime = 1, easing = linear, props } = options;
    const durationFrames = Math.round(runTime * this.fps);

    this.actions.push({
      id: targetId || `action-${this.idCounter++}`,
      type,
      startFrame: this.cursor,
      durationFrames,
      easing,
      props,
    });

    this.cursor += durationFrames;
    return this;
  }

  /**
   * Play an animation at the current cursor WITHOUT advancing it.
   * Use for parallel animations.
   */
  add(
    type: TimelineAction['type'],
    targetId: string,
    options: PlayOptions = {}
  ): this {
    const { runTime = 1, easing = linear, props } = options;
    const durationFrames = Math.round(runTime * this.fps);

    this.actions.push({
      id: targetId || `action-${this.idCounter++}`,
      type,
      startFrame: this.cursor,
      durationFrames,
      easing,
      props,
    });

    // Don't advance cursor — this runs in parallel with the next action
    return this;
  }

  /**
   * Pause the timeline for a duration.
   */
  wait(seconds: number = 0.5): this {
    const durationFrames = Math.round(seconds * this.fps);

    this.actions.push({
      id: `wait-${this.idCounter++}`,
      type: 'wait',
      startFrame: this.cursor,
      durationFrames,
      easing: linear,
    });

    this.cursor += durationFrames;
    return this;
  }

  /**
   * Get the compiled timeline.
   */
  compile(): { actions: TimelineAction[]; totalFrames: number } {
    const maxEnd = this.actions.reduce(
      (max, a) => Math.max(max, a.startFrame + a.durationFrames),
      0
    );
    return {
      actions: [...this.actions],
      totalFrames: maxEnd,
    };
  }

  /** Get current cursor position in frames */
  get currentFrame(): number {
    return this.cursor;
  }

  /** Get current cursor position in seconds */
  get currentTime(): number {
    return this.cursor / this.fps;
  }
}
