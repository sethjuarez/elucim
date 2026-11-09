import { resolveColor } from '@elucim/core';
import type { ElucimDocument } from '../document';
import { renderToSvgString } from './renderToSvgString';
import { stripCssFunctions } from './renderToPng';

export interface RenderToStandaloneSvgOptions {
  /** Canonical timeline to evaluate before rendering this frame. */
  timelineId?: string;
  /** Output pixel width. Defaults to the scene width (or scaled from `height`). */
  width?: number;
  /** Output pixel height. Defaults to the scene height (or scaled from `width`). */
  height?: number;
  /**
   * `'scene'` (default) paints `scene.background` (white when unset),
   * `'transparent'` paints nothing so the result can be composited over video,
   * any other string is used as a CSS color.
   */
  background?: 'scene' | 'transparent' | (string & {});
}

/** Thrown when a document uses SVG features a standalone rasterizer cannot draw. */
export class ElucimStandaloneSvgError extends Error {
  readonly code: 'unsupported-foreign-object' | 'unsupported-remote-image' | 'invalid-size';

  constructor(code: ElucimStandaloneSvgError['code'], message: string) {
    super(message);
    this.name = 'ElucimStandaloneSvgError';
    this.code = code;
  }
}

/**
 * Renders one frame to a self-contained `<svg>` string that works outside the
 * DOM (resvg, librsvg, Image elements). The scene's viewBox is kept, so output
 * pixels are scaled from scene coordinates. CSS variables resolve to their
 * fallbacks and `light-dark()` resolves to the dark value. Works in Node.
 *
 * Throws {@link ElucimStandaloneSvgError} for `foreignObject` content (LaTeX)
 * and remote `http(s)` images, which standalone rasterizers cannot draw.
 */
export function renderToStandaloneSvg(
  doc: ElucimDocument,
  frame: number,
  options: RenderToStandaloneSvgOptions = {},
): string {
  const html = renderToSvgString(doc, frame, { timelineId: options.timelineId });
  const match = html.match(/<svg[\s\S]*<\/svg>/);
  if (!match) throw new Error('renderToSvgString did not produce an SVG element');
  let svg = match[0];

  if (/<foreignObject[\s>]/i.test(svg)) {
    throw new ElucimStandaloneSvgError(
      'unsupported-foreign-object',
      'This frame contains HTML content (foreignObject, e.g. LaTeX), which standalone SVG/PNG export cannot draw. Render it in a browser or replace it with text/paths.',
    );
  }
  if (/<image\b[^>]*\bhref="https?:/i.test(svg)) {
    throw new ElucimStandaloneSvgError(
      'unsupported-remote-image',
      'This frame references a remote http(s) image. Inline it as a data: URI before standalone export.',
    );
  }

  const viewBox = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
  const sceneWidth = viewBox ? Number(viewBox[3]) : doc.scene.width ?? 800;
  const sceneHeight = viewBox ? Number(viewBox[4]) : doc.scene.height ?? 600;
  const { width, height } = resolveOutputSize(sceneWidth, sceneHeight, options.width, options.height);

  svg = svg
    .replace(/^<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
    .replace(/^<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace(/^<svg([^>]*?)\sstyle="[^"]*"/, '<svg$1')
    .replace(/^<svg/, `<svg width="${width}" height="${height}" preserveAspectRatio="none"`);
  if (!/^<svg[^>]*\sxmlns=/.test(svg)) svg = svg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');

  const fill = resolveBackground(doc, options.background ?? 'scene');
  if (fill) {
    const x = viewBox ? viewBox[1] : '0';
    const y = viewBox ? viewBox[2] : '0';
    svg = svg.replace(/>/, `><rect x="${x}" y="${y}" width="${sceneWidth}" height="${sceneHeight}" fill="${fill}"/>`);
  }
  return stripCssFunctionsInMarkup(svg);
}

/** Resolves CSS functions only in attribute values and `<style>` blocks, leaving text content and hrefs untouched. */
function stripCssFunctionsInMarkup(svg: string): string {
  return svg
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open: string, css: string, close: string) => open + stripCssFunctions(css) + close)
    .replace(/(<[^\s/>!?][^>]*>)/g, tag => tag.replace(
      /(\s)([\w:.-]+)="([^"]*)"/g,
      (m, space: string, name: string, value: string) => (/href$/i.test(name) ? m : `${space}${name}="${stripCssFunctions(value)}"`),
    ));
}

function resolveOutputSize(sceneWidth: number, sceneHeight: number, width?: number, height?: number) {
  for (const [name, value] of [['width', width], ['height', height]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      throw new ElucimStandaloneSvgError('invalid-size', `Output ${name} must be a positive integer pixel count, got ${value}.`);
    }
  }
  if (width !== undefined && height !== undefined) {
    if (Math.abs(width * sceneHeight - height * sceneWidth) > Math.max(sceneWidth, sceneHeight)) {
      throw new ElucimStandaloneSvgError(
        'invalid-size',
        `Output ${width}x${height} does not match the scene aspect ratio ${sceneWidth}x${sceneHeight}. Give only width or height, or resize the scene to match the video.`,
      );
    }
    return { width, height };
  }
  if (width !== undefined) return { width, height: Math.round((width * sceneHeight) / sceneWidth) };
  if (height !== undefined) return { width: Math.round((height * sceneWidth) / sceneHeight), height };
  return { width: Math.round(sceneWidth), height: Math.round(sceneHeight) };
}

function resolveBackground(doc: ElucimDocument, background: string): string | undefined {
  if (background === 'transparent') return undefined;
  let color = background === 'scene' ? doc.scene.background ?? '#ffffff' : background;
  if (color.startsWith('$')) color = resolveColor(color) ?? '#ffffff';
  color = stripCssFunctions(color);
  return color === 'transparent' || color === 'none' ? undefined : color.replace(/"/g, '&quot;');
}
