# Hooks API

## useCurrentFrame

Returns the current frame number within the nearest `<Sequence>` or root `<Scene>`.

```ts
function useCurrentFrame(): number;
```

**Usage:**
```tsx
const frame = useCurrentFrame(); // 0, 1, 2, ... 
```

## useElucimContext

Returns the full Elucim context (frame, fps, duration).

```ts
interface ElucimContextValue {
  frame: number;
  fps: number;
  durationInFrames: number;
}

function useElucimContext(): ElucimContextValue;
```

## useAnimation

Low-level hook for applying animations to primitives. Used internally by primitives.

```ts
interface AnimationProps {
  fadeIn?: number;
  fadeOut?: number;
  draw?: number;
}

function useAnimation(props: AnimationProps): {
  opacity: number;
  strokeDashoffset?: number;
  strokeDasharray?: string;
};
```

## interpolate

Maps frame values through input/output ranges.

```ts
function interpolate(
  frame: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number;

interface InterpolateOptions {
  easing?: EasingFunction;
  extrapolateLeft?: 'clamp' | 'extend';
  extrapolateRight?: 'clamp' | 'extend';
}
```
