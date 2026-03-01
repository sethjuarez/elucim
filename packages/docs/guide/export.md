# Video Export

Export your Elucim animations to video files directly from the browser.

## useExport Hook

The simplest way to export:

```tsx
import { useExport } from '@elucim/core';

function ExportButton({ svgRef, setFrame, totalFrames }) {
  const { isExporting, progress, startExport, cancel } = useExport();

  return (
    <div>
      {isExporting ? (
        <>
          <progress value={progress} max={1} />
          <span>{Math.round(progress * 100)}%</span>
          <button onClick={cancel}>Cancel</button>
        </>
      ) : (
        <button onClick={() => startExport(svgRef.current, setFrame, {
          totalFrames,
          fps: 60,
          width: 1920,
          height: 1080,
        })}>
          Export Video
        </button>
      )}
    </div>
  );
}
```

## Low-Level API

### exportAnimation

```ts
import { exportAnimation } from '@elucim/core';

await exportAnimation(svgElement, (frame) => {
  setFrame(frame); // Update your scene
}, {
  totalFrames: 180,
  fps: 60,
  width: 1920,
  height: 1080,
  format: 'webm',
  bitrate: 5_000_000,
  onProgress: (frame, total) => console.log(`${frame}/${total}`),
});
```

### svgToCanvas

```ts
import { svgToCanvas } from '@elucim/core';

const canvas = await svgToCanvas(svgElement, 1920, 1080);
// canvas is an HTMLCanvasElement with the SVG rendered to it
```

### downloadBlob

```ts
import { downloadBlob } from '@elucim/core';

downloadBlob(blob, 'my-animation.webm');
```

## ExportOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fps` | `number` | `60` | Frames per second |
| `totalFrames` | `number` | — | Total frames to capture |
| `width` | `number` | `1920` | Output width |
| `height` | `number` | `1080` | Output height |
| `format` | `'webm' \| 'mp4'` | `'webm'` | Output format |
| `bitrate` | `number` | `5000000` | Video bitrate |
| `onProgress` | `(frame, total) => void` | — | Progress callback |

## Browser Support

Video export uses the MediaRecorder API, supported in all modern browsers. MP4 export may fall back to WebM if the browser doesn't support `video/mp4` recording.
