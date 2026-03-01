# Sequences

## Overview

`<Sequence>` is the fundamental building block for timing in Elucim. It controls when children appear and how long they last.

## Basic Usage

```tsx
<Sequence from={30} durationInFrames={60}>
  <Circle cx={200} cy={200} r={80} stroke="#4ecdc4" draw={40} />
</Sequence>
```

This circle appears at frame 30 and lasts for 60 frames. Inside the Sequence, `useCurrentFrame()` returns 0 at frame 30, 1 at frame 31, etc.

## Overlapping Sequences

Sequences can overlap. This creates parallel animations:

```tsx
{/* Both start at the same time */}
<Sequence from={0} durationInFrames={60}>
  <Circle cx={200} cy={200} r={60} stroke="#4ecdc4" draw={30} />
</Sequence>
<Sequence from={0} durationInFrames={60}>
  <Circle cx={400} cy={200} r={60} stroke="#ff6b6b" draw={30} />
</Sequence>
```

## Nested Sequences

Sequences can nest. Inner sequences reference the parent's local time:

```tsx
<Sequence from={30} durationInFrames={120}>
  {/* This appears at global frame 30 */}
  <Circle cx={200} cy={200} r={60} stroke="#4ecdc4" draw={30} />

  <Sequence from={30} durationInFrames={60}>
    {/* This appears at global frame 60 (30 + 30) */}
    <Text x={200} y={300} fill="#e0e0e0" textAnchor="middle" fadeIn={20}>
      Nested!
    </Text>
  </Sequence>
</Sequence>
```

## Lifecycle

- Children are **mounted** when `globalFrame >= from`
- Children are **unmounted** when `globalFrame >= from + durationInFrames`
- This means components can use `useEffect` cleanup for exit logic
