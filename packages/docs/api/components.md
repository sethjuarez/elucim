# Components

## Scene

Root SVG container with frame clock.

```ts
interface SceneProps {
  width: number;
  height: number;
  fps?: number;            // default: 60
  durationInFrames: number;
  background?: string;     // default: 'transparent'
  children: React.ReactNode;
}
```

## Sequence

Time-offset wrapper.

```ts
interface SequenceProps {
  from: number;              // Start frame
  durationInFrames: number;  // Duration in frames
  children: React.ReactNode;
}
```

## Player

Interactive player with transport controls.

```ts
interface PlayerProps {
  width: number;
  height: number;
  fps?: number;
  durationInFrames: number;
  background?: string;
  children: React.ReactNode;
}
```

**Keyboard shortcuts:** Space (play/pause), ←/→ (step frame), Home/End (jump to start/end)
