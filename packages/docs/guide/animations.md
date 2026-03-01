# Animation Components

Elucim provides composable animation wrapper components.

## FadeIn

```tsx
<FadeIn durationInFrames={30}>
  <Circle cx={200} cy={200} r={80} stroke="#4ecdc4" />
</FadeIn>
```

Fades children from opacity 0 → 1 over the specified frames.

## FadeOut

```tsx
<FadeOut durationInFrames={30}>
  <Circle cx={200} cy={200} r={80} stroke="#ff6b6b" />
</FadeOut>
```

Fades children from opacity 1 → 0.

## Draw

```tsx
<Draw durationInFrames={40}>
  <circle cx={200} cy={200} r={80} stroke="#4ecdc4" fill="none" strokeWidth={3} />
</Draw>
```

Animates `strokeDashoffset` to progressively reveal strokes.

## Write

```tsx
<Write durationInFrames={30}>
  <Text x={200} y={200} fill="#e0e0e0" fontSize={24} textAnchor="middle">
    E = mc²
  </Text>
</Write>
```

Combines opacity fade with a slight scale effect for a "writing" appearance.

## Transform

```tsx
<Transform
  from={{ x: 100, y: 100, scale: 0.5, rotate: 0 }}
  to={{ x: 300, y: 200, scale: 1.5, rotate: 360 }}
  durationInFrames={60}
>
  <Rect x={-40} y={-40} width={80} height={80} stroke="#a29bfe" />
</Transform>
```

Animates position, scale, and rotation. Children should be centered at origin.

## Morph

```tsx
<Morph
  from={{ fill: '#ff6b6b', stroke: '#ff6b6b', opacity: 0.5 }}
  to={{ fill: '#4ecdc4', stroke: '#4ecdc4', opacity: 1 }}
  durationInFrames={60}
>
  <Circle cx={200} cy={200} r={60} />
</Morph>
```

Interpolates colors and opacity between two states.

## Stagger

```tsx
<Stagger interval={8}>
  <FadeIn durationInFrames={20}>
    <Circle cx={100} cy={150} r={20} stroke="#4ecdc4" />
  </FadeIn>
  <FadeIn durationInFrames={20}>
    <Circle cx={200} cy={150} r={20} stroke="#4ecdc4" />
  </FadeIn>
  <FadeIn durationInFrames={20}>
    <Circle cx={300} cy={150} r={20} stroke="#4ecdc4" />
  </FadeIn>
</Stagger>
```

Staggers children by `interval` frames. The first child plays immediately, the second after `interval` frames, etc.

## Parallel

```tsx
<Parallel>
  <FadeIn durationInFrames={30}>
    <Circle ... />
  </FadeIn>
  <Draw durationInFrames={40}>
    <Line ... />
  </Draw>
</Parallel>
```

Renders all children simultaneously (syntactic sugar for grouping).
