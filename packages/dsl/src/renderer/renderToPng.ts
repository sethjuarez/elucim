import { renderToSvgString } from './renderToSvgString';
import { resolveColor, SEMANTIC_TOKENS } from './resolveColor';
import type { ElucimDocument } from '../schema/types';

/**
 * Strip all CSS functions that are invalid in standalone SVGs loaded via Image:
 * - var(--x, fallback) → fallback (iterative for nested vars)
 * - var(--x) with no fallback → 'none'
 * - light-dark(light, dark) → dark value (elucim defaults to dark theme)
 */
export function stripCssFunctions(s: string): string {
  // Iteratively resolve var() from innermost out (handles nesting)
  let prev: string;
  do {
    prev = s;
    s = s.replace(/var\(--[a-z][\w-]*,\s*([^)]+)\)/gi, '$1');
  } while (s !== prev);
  // Bare var() with no fallback
  s = s.replace(/var\(--[a-z][\w-]*\)/gi, 'none');
  // light-dark() → pick dark value (second arg)
  s = s.replace(/light-dark\([^,]+,\s*([^)]+)\)/gi, '$1');
  return s;
}

export interface RenderToPngOptions {
  /** Output width in pixels (default: document width) */
  width?: number;
  /** Output height in pixels (default: document height) */
  height?: number;
  /** Device pixel ratio for retina output (default: 2) */
  scale?: number;
}

/**
 * Render a DSL document at a specific frame directly to PNG bytes.
 *
 * Goes from DSL JSON → SVG string → PNG without requiring a mounted DOM
 * element, blob URLs, or manual Image loading. Uses data URIs internally
 * to avoid CSP issues in restricted webview contexts (e.g. Tauri).
 *
 * Works in any browser environment. Does NOT work in Node.js (needs
 * canvas + Image APIs).
 *
 * @example
 * ```ts
 * import { renderToPng } from '@elucim/dsl';
 *
 * const png = await renderToPng(myDocument, 0);
 * // png is a Uint8Array of PNG bytes
 *
 * // Save as file download:
 * const blob = new Blob([png], { type: 'image/png' });
 * const url = URL.createObjectURL(blob);
 * ```
 */
export async function renderToPng(
  dsl: ElucimDocument,
  frame: number,
  options?: RenderToPngOptions,
): Promise<Uint8Array> {
  const scale = options?.scale ?? 2;

  // 1. Render DSL → HTML string containing <svg> (server-side, no DOM needed)
  const htmlString = renderToSvgString(dsl, frame, {
    width: options?.width,
    height: options?.height,
  });

  // 2. Extract the <svg>...</svg> element (Scene wraps SVG in a <div>)
  const svgMatch = htmlString.match(/<svg[\s\S]*<\/svg>/);
  if (!svgMatch) {
    throw new Error('renderToSvgString did not produce an SVG element');
  }
  let svgString = svgMatch[0];

  // 3. Parse viewBox to get logical dimensions
  const vbMatch = svgString.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const logicalW = options?.width ?? (vbMatch ? parseFloat(vbMatch[1]) : 800);
  const logicalH = options?.height ?? (vbMatch ? parseFloat(vbMatch[2]) : 600);
  const w = Math.round(logicalW * scale);
  const h = Math.round(logicalH * scale);

  // 4. Fix SVG for standalone rendering: replace width/height="100%" with pixels,
  //    add xmlns if missing, add background via a rect (the div bg is lost)
  svgString = svgString
    .replace(/width="100%"/, `width="${w}"`)
    .replace(/height="100%"/, `height="${h}"`);
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // Remove position:absolute style (not needed standalone)
  svgString = svgString.replace(/style="[^"]*position:\s*absolute[^"]*"/, '');

  // 5. Inject background rect from the DSL root
  //    $token → resolveColor → var(--elucim-X, #hex) → strip to #hex
  let bg: string = (dsl.root as any).background ?? '#ffffff';
  if (bg.startsWith('$')) {
    bg = resolveColor(bg) ?? '#ffffff';
  }
  bg = stripCssFunctions(bg);
  const bgRect = `<rect width="${logicalW}" height="${logicalH}" fill="${bg}"/>`;
  svgString = svgString.replace(/>/, `>${bgRect}`);

  // 6. Strip all CSS var() and light-dark() from the SVG — standalone SVGs
  //    loaded via Image/createImageBitmap have no DOM CSS context.
  svgString = stripCssFunctions(svgString);

  // 8. Convert SVG to data URI (avoids blob URLs → works under strict CSP)
  const encoded = btoa(unescape(encodeURIComponent(svgString)));
  const dataUri = `data:image/svg+xml;base64,${encoded}`;

  // 9. Rasterize: data URI → Image → OffscreenCanvas/Canvas → PNG bytes
  if (typeof OffscreenCanvas !== 'undefined') {
    return rasterizeOffscreen(dataUri, w, h);
  }
  return rasterizeDom(dataUri, w, h);
}

/** Rasterize using OffscreenCanvas (no DOM insertion needed). */
async function rasterizeOffscreen(
  dataUri: string,
  w: number,
  h: number,
): Promise<Uint8Array> {
  const response = await fetch(dataUri);
  const svgBlob = await response.blob();
  const bitmap = await createImageBitmap(svgBlob, { resizeWidth: w, resizeHeight: h });

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

/** Fallback: rasterize using a temporary DOM canvas + Image element. */
function rasterizeDom(
  dataUri: string,
  w: number,
  h: number,
): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to render PNG from SVG'));
          blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
        },
        'image/png',
      );
    };
    img.onerror = () => reject(new Error('Failed to load SVG data URI for PNG render'));
    img.src = dataUri;
  });
}
