# Easing Functions

Elucim includes 20+ easing functions for smooth, natural-feeling animations.

## Usage

```tsx
import { interpolate, easeOutCubic } from '@elucim/core';

const value = interpolate(frame, [0, 60], [0, 100], { easing: easeOutCubic });
```

## Available Functions

### Standard Easings

| Function | Description |
|----------|-------------|
| `linear` | No easing — constant speed |
| `easeInQuad` | Accelerate from zero |
| `easeOutQuad` | Decelerate to zero |
| `easeInOutQuad` | Accelerate then decelerate |
| `easeInCubic` | Stronger accelerate |
| `easeOutCubic` | Stronger decelerate |
| `easeInOutCubic` | Stronger in-out |
| `easeInQuart` | Even stronger accelerate |
| `easeOutQuart` | Even stronger decelerate |
| `easeInOutQuart` | Even stronger in-out |

### Trigonometric

| Function | Description |
|----------|-------------|
| `easeInSine` | Gentle sine-based acceleration |
| `easeOutSine` | Gentle sine-based deceleration |
| `easeInOutSine` | Gentle sine-based in-out |

### Exponential

| Function | Description |
|----------|-------------|
| `easeInExpo` | Exponential acceleration |
| `easeOutExpo` | Exponential deceleration |
| `easeInOutExpo` | Exponential in-out |

### Special

| Function | Description |
|----------|-------------|
| `easeInBack` | Slight anticipation (overshoots backward) |
| `easeOutBack` | Overshoots then settles |
| `easeOutElastic` | Spring-like elastic bounce |
| `easeOutBounce` | Bouncing ball effect |

## Custom Easings

### Spring

```tsx
import { spring } from '@elucim/core';

const springEase = spring({ stiffness: 100, damping: 10, mass: 1 });
const value = interpolate(frame, [0, 60], [0, 100], { easing: springEase });
```

### Cubic Bezier

```tsx
import { cubicBezier } from '@elucim/core';

const ease = cubicBezier(0.25, 0.1, 0.25, 1.0); // CSS "ease"
const value = interpolate(frame, [0, 60], [0, 100], { easing: ease });
```

### Custom Function

Any function `(t: number) => number` where `t` goes from 0 to 1:

```tsx
const customEase = (t: number) => t * t * (3 - 2 * t); // smoothstep
```
