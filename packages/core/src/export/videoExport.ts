/**
 * Video Export — captures animation frames and produces downloadable video.
 *
 * Renders SVG frames to Canvas → MediaRecorder → WebM/MP4.
 */

export interface ExportOptions {
  /** Frames per second. Default: 60 */
  fps?: number;
  /** Total number of frames to capture */
  totalFrames: number;
  /** Output width in pixels. Default: 1920 */
  width?: number;
  /** Output height in pixels. Default: 1080 */
  height?: number;
  /** Output format. Default: 'webm' */
  format?: 'webm' | 'mp4';
  /** Video bitrate in bits/second. Default: 5_000_000 (5 Mbps) */
  bitrate?: number;
  /** Progress callback: (frameIndex, totalFrames) => void */
  onProgress?: (frame: number, total: number) => void;
}

/**
 * Renders an SVG element to a canvas at a specific size.
 */
export async function svgToCanvas(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG to canvas'));
    };
    img.src = url;
  });
}

/**
 * Export animation using MediaRecorder API.
 * Takes a render function that updates the scene for each frame.
 */
export async function exportWithMediaRecorder(
  svgElement: SVGSVGElement,
  renderFrame: (frame: number) => void | Promise<void>,
  options: ExportOptions,
): Promise<Blob> {
  const {
    fps = 60,
    totalFrames,
    width = 1920,
    height = 1080,
    format = 'webm',
    bitrate = 5_000_000,
    onProgress,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(0);
  const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
    videoBitsPerSecond: bitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  for (let frame = 0; frame < totalFrames; frame++) {
    await renderFrame(frame);

    // Render SVG to canvas
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const track = stream.getVideoTracks()[0];
        if (track && 'requestFrame' in track) {
          (track as any).requestFrame();
        }
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to render frame ${frame}`));
      };
      img.src = url;
    });

    await new Promise((r) => setTimeout(r, 1000 / fps));
    onProgress?.(frame + 1, totalFrames);
  }

  recorder.stop();

  return new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });
}

/**
 * Triggers a browser download of a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-level: captures all frames and downloads as video.
 */
export async function exportAnimation(
  svgElement: SVGSVGElement,
  renderFrame: (frame: number) => void | Promise<void>,
  options: ExportOptions,
): Promise<void> {
  const format = options.format ?? 'webm';
  const blob = await exportWithMediaRecorder(svgElement, renderFrame, options);
  downloadBlob(blob, `elucim-export.${format}`);
}
