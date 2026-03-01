# Timeline DSL

The Timeline class provides an imperative API for building complex animation sequences.

## Basic Usage

```tsx
import { Timeline, easeOutCubic } from '@elucim/core';

const tl = new Timeline(60); // 60 fps

tl.play('fadeIn', 'circle', { runTime: 1 });
tl.play('draw', 'curve', { runTime: 2, easing: easeOutCubic });
tl.wait(0.5);
tl.play('write', 'label', { runTime: 1 });

const { actions, totalFrames } = tl.compile();
```

## API

### `new Timeline(fps?)`

Creates a new timeline. Default fps is 60.

### `tl.play(type, targetId, options?)`

Plays an animation **sequentially** — advances the cursor after the animation.

```ts
tl.play('fadeIn', 'circle1', { runTime: 1.5 });
// cursor is now at 1.5s (90 frames at 60fps)
```

### `tl.add(type, targetId, options?)`

Plays an animation at the current cursor **without** advancing it. Use for parallel animations.

```ts
tl.add('fadeIn', 'obj1', { runTime: 1 });   // starts at cursor
tl.add('draw', 'obj2', { runTime: 1 });      // ALSO starts at cursor
tl.play('write', 'obj3', { runTime: 0.5 });  // starts at cursor, THEN advances
```

### `tl.wait(seconds?)`

Pauses the timeline for the given duration. Default: 0.5 seconds.

### `tl.compile()`

Returns the compiled actions and total duration:

```ts
const { actions, totalFrames } = tl.compile();
// actions: TimelineAction[]
// totalFrames: number
```

## Animation Types

| Type | Description |
|------|-------------|
| `'fadeIn'` | Opacity 0 → 1 |
| `'fadeOut'` | Opacity 1 → 0 |
| `'draw'` | Stroke draw animation |
| `'write'` | Write-in effect |
| `'transform'` | Position/rotation/scale |
| `'custom'` | Custom animation with props |
| `'wait'` | Pause (no visual) |

## PlayOptions

```ts
interface PlayOptions {
  runTime?: number;       // Duration in seconds (default: 1)
  easing?: EasingFunction; // Easing function (default: linear)
  props?: Record<string, unknown>; // Additional animation props
}
```

## Complex Example

```ts
const tl = new Timeline(60);

// Scene 1: Title appears
tl.play('fadeIn', 'title', { runTime: 1 });
tl.wait(0.5);

// Scene 2: Two objects animate in parallel
tl.add('fadeIn', 'axes', { runTime: 0.5 });
tl.play('draw', 'function-plot', { runTime: 2, easing: easeOutCubic });

// Scene 3: Labels write in
tl.play('write', 'x-label', { runTime: 0.5 });
tl.play('write', 'y-label', { runTime: 0.5 });

// Scene 4: Transform
tl.wait(1);
tl.play('transform', 'highlight', {
  runTime: 1,
  props: { scale: 2, rotate: 90 },
});

const { actions, totalFrames } = tl.compile();
// totalFrames = 330 (5.5 seconds at 60fps)
```
