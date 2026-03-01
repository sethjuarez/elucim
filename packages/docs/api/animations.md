# Animations API

## FadeIn
```ts
interface FadeInProps {
  durationInFrames: number;
  children: React.ReactNode;
}
```

## FadeOut
```ts
interface FadeOutProps {
  durationInFrames: number;
  children: React.ReactNode;
}
```

## Draw
```ts
interface DrawProps {
  durationInFrames: number;
  children: React.ReactNode;
}
```

## Write
```ts
interface WriteProps {
  durationInFrames: number;
  children: React.ReactNode;
}
```

## Transform
```ts
interface TransformState {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
}

interface TransformProps {
  from: TransformState;
  to: TransformState;
  durationInFrames: number;
  easing?: EasingFunction;
  children: React.ReactNode;
}
```

## Morph
```ts
interface MorphState {
  fill?: string;
  stroke?: string;
  opacity?: number;
}

interface MorphProps {
  from: MorphState;
  to: MorphState;
  durationInFrames: number;
  easing?: EasingFunction;
  children: React.ReactNode;
}
```

## Stagger
```ts
interface StaggerProps {
  interval: number; // frames between each child
  children: React.ReactNode;
}
```

## Parallel
```ts
// No special props — just groups children at the same time
interface ParallelProps {
  children: React.ReactNode;
}
```

## Timeline (Imperative)

```ts
class Timeline {
  constructor(fps?: number);

  play(type: AnimationType, targetId: string, options?: PlayOptions): this;
  add(type: AnimationType, targetId: string, options?: PlayOptions): this;
  wait(seconds?: number): this;
  compile(): { actions: TimelineAction[]; totalFrames: number };

  get currentFrame(): number;
  get currentTime(): number;
}

type AnimationType = 'fadeIn' | 'fadeOut' | 'draw' | 'write' | 'transform' | 'wait' | 'custom';

interface PlayOptions {
  runTime?: number;
  easing?: EasingFunction;
  props?: Record<string, unknown>;
}

interface TimelineAction {
  id: string;
  type: AnimationType;
  startFrame: number;
  durationFrames: number;
  easing: EasingFunction;
  props?: Record<string, unknown>;
}
```
