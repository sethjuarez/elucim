# Export API

## Functions

### exportAnimation

High-level export — captures all frames and triggers download.

```ts
async function exportAnimation(
  svgElement: SVGSVGElement,
  renderFrame: (frame: number) => void | Promise<void>,
  options: ExportOptions,
): Promise<void>;
```

### exportWithMediaRecorder

Low-level — returns a Blob instead of triggering download.

```ts
async function exportWithMediaRecorder(
  svgElement: SVGSVGElement,
  renderFrame: (frame: number) => void | Promise<void>,
  options: ExportOptions,
): Promise<Blob>;
```

### svgToCanvas

Renders an SVG element to an HTMLCanvasElement.

```ts
async function svgToCanvas(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
): Promise<HTMLCanvasElement>;
```

### downloadBlob

Triggers a browser download of a Blob.

```ts
function downloadBlob(blob: Blob, filename: string): void;
```

## Hooks

### useExport

React hook for video export with progress tracking.

```ts
interface UseExportResult {
  isExporting: boolean;
  progress: number;
  currentFrame: number;
  startExport: (svg: SVGSVGElement, setFrame: (f: number) => void, options: ExportOptions) => Promise<void>;
  cancel: () => void;
}

function useExport(): UseExportResult;
```

## Types

```ts
interface ExportOptions {
  fps?: number;           // default: 60
  totalFrames: number;
  width?: number;         // default: 1920
  height?: number;        // default: 1080
  format?: 'webm' | 'mp4'; // default: 'webm'
  bitrate?: number;       // default: 5_000_000
  onProgress?: (frame: number, total: number) => void;
}
```
