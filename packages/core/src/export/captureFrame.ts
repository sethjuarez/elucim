/**
 * Static Frame Capture — renders an SVG scene at a specific frame to a PNG/JPEG Blob.
 *
 * Uses the existing svgToCanvas() pipeline. Ideal for exporting thumbnails,
 * Word document images, or poster frames.
 */
import { svgToCanvas } from './videoExport';

export interface CaptureFrameOptions {
  /** Output width in pixels. Default: SVG viewBox width */
  width?: number;
  /** Output height in pixels. Default: SVG viewBox height */
  height?: number;
  /** Image format. Default: 'png' */
  format?: 'png' | 'jpeg';
  /** JPEG quality 0–1. Default: 0.92 */
  quality?: number;
  /** Device pixel ratio for retina output. Default: 2 */
  scale?: number;
}

/** Wait for N animation frames (lets React re-render). */
function waitFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = n;
    function tick() {
      if (--remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Capture a single frame of an Elucim scene as a PNG or JPEG Blob.
 *
 * @param svgElement  The mounted SVG element to capture
 * @param frame       Target frame index
 * @param renderFrame Callback that advances the scene to the given frame
 *                    (e.g. a React state setter: `(f) => setFrame(f)`)
 * @param options     Output size, format, quality, and scale
 */
export async function captureFrame(
  svgElement: SVGSVGElement,
  frame: number,
  renderFrame: (frame: number) => void,
  options: CaptureFrameOptions = {},
): Promise<Blob> {
  const {
    format = 'png',
    quality = 0.92,
    scale = 2,
  } = options;

  // Resolve dimensions from SVG viewBox if not specified
  const viewBox = svgElement.viewBox.baseVal;
  const width = (options.width ?? (viewBox.width || svgElement.clientWidth)) * scale;
  const height = (options.height ?? (viewBox.height || svgElement.clientHeight)) * scale;

  // Advance scene to the target frame and wait for React to re-render
  renderFrame(frame);
  await waitFrames(2);

  // Rasterize SVG → Canvas
  const canvas = await svgToCanvas(svgElement, width, height);

  // Convert canvas → Blob
  return new Promise<Blob>((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to capture frame ${frame} as ${format}`));
      },
      mimeType,
      format === 'jpeg' ? quality : undefined,
    );
  });
}
