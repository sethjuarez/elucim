# Animation Frames

## useCurrentFrame

The `useCurrentFrame()` hook returns the current frame number within the nearest `<Sequence>` (or root `<Scene>`).

```tsx
import { useCurrentFrame } from '@elucim/core';

function PulsingDot() {
  const frame = useCurrentFrame();
  const scale = 1 + 0.2 * Math.sin(frame * 0.1);
  return <circle cx={100} cy={100} r={10 * scale} fill="#4ecdc4" />;
}
```

## interpolate

The `interpolate()` function maps a frame number through input/output ranges with optional easing.

```tsx
import { interpolate, easeOutCubic } from '@elucim/core';

const opacity = interpolate(frame, [0, 30], [0, 1]);
const x = interpolate(frame, [0, 60], [100, 500], { easing: easeOutCubic });
```

### Multi-Segment Interpolation

```tsx
// Go up, then come back down
const y = interpolate(frame, [0, 30, 60], [200, 50, 200]);
```

### Extrapolation

```tsx
// Clamp (default) — values stay within output range
interpolate(-10, [0, 60], [0, 100]); // → 0

// Extend — values continue beyond the range
interpolate(120, [0, 60], [0, 100], { extrapolateRight: 'extend' }); // → 200
```

### Signature

```ts
function interpolate(
  frame: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: {
    easing?: EasingFunction;
    extrapolateLeft?: 'clamp' | 'extend';
    extrapolateRight?: 'clamp' | 'extend';
  }
): number;
```
