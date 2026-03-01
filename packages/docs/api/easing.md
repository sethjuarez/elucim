# Easing API

All easing functions have the signature `(t: number) => number` where `t` ranges from 0 to 1.

## Standard Easings

```ts
import {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeOutBounce,
} from '@elucim/core';
```

## Factory Functions

### spring

Creates a spring-based easing function.

```ts
function spring(config?: {
  stiffness?: number;  // default: 100
  damping?: number;    // default: 10
  mass?: number;       // default: 1
}): EasingFunction;
```

### cubicBezier

Creates a CSS-style cubic bezier easing.

```ts
function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction;
```

## Type

```ts
type EasingFunction = (t: number) => number;
```
