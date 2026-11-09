import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';
import {
  bindAnchors,
  renderToStandaloneSvg,
  type ElucimAnchorBindings,
  type ElucimDocument,
  type RenderToStandaloneSvgOptions,
} from '@elucim/dsl';

/** Scene/Player default when `scene.fps` is unset. */
export const DEFAULT_DOCUMENT_FPS = 60;

export interface FrameRenderOptions {
  /** Timeline to evaluate. Defaults to the default state machine's entry timeline, else the only timeline. */
  timelineId?: string;
  /** Output pixel width (keeps aspect ratio when height is omitted). */
  width?: number;
  /** Output pixel height (keeps aspect ratio when width is omitted). */
  height?: number;
  /** `'scene'` (default), `'transparent'` for alpha PNGs, or a CSS color. */
  background?: RenderToStandaloneSvgOptions['background'];
  /** Measured anchor boxes to bind before rendering (see `bindAnchors`). */
  anchors?: ElucimAnchorBindings;
  /**
   * Font files for text. When given, only these are loaded (fast: a few ms per
   * frame); otherwise system fonts are scanned for each frame with text, which
   * costs hundreds of ms per frame.
   */
  fontFiles?: string[];
  /** Also scan system fonts when `fontFiles` are given (default false). */
  systemFonts?: boolean;
}

export interface FramePlanOptions {
  timelineId?: string;
  /** Output frame rate. Defaults to the document fps (`scene.fps`, else 60). */
  fps?: number;
  /** First output frame index (default 0). */
  start?: number;
  /** Exclusive end output frame index. Mutually exclusive with `count`. */
  end?: number;
  /** Number of output frames. Defaults to covering the whole timeline. */
  count?: number;
  /** Explicit output frame indices; overrides start/end/count. */
  frames?: number[];
}

export interface FrameExportOptions extends FramePlanOptions, FrameRenderOptions {
  outDir: string;
  /** `png` (default) or standalone `svg`. */
  format?: 'png' | 'svg';
  /** File name prefix (default `frame-`); files are `<prefix><index, 6 digits>.<ext>`. */
  prefix?: string;
}

export interface PlannedFrame {
  /** Output frame index at the output fps. */
  index: number;
  /** Document frame evaluated for this output frame (`index * documentFps / fps`). */
  sourceFrame: number;
}

export interface FrameExportPlan {
  timelineId: string | null;
  documentFps: number;
  fps: number;
  /** Timeline duration in document frames (0 for static documents). */
  timelineDuration: number;
  frames: PlannedFrame[];
}

export interface FrameExportResult extends FrameExportPlan {
  outDir: string;
  format: 'png' | 'svg';
  width: number;
  height: number;
  background: string;
  /** printf-style pattern for ffmpeg, e.g. `frame-%06d.png` with `-start_number`. */
  pattern: string;
  files: string[];
}

export class ElucimFrameExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ElucimFrameExportError';
  }
}

/** Picks the timeline a headless export plays when none is named. */
export function resolveExportTimeline(doc: ElucimDocument, timelineId?: string): string | null {
  const timelines = doc.timelines ?? {};
  if (timelineId !== undefined) {
    if (!timelines[timelineId]) throw new ElucimFrameExportError(`Timeline "${timelineId}" does not exist. Available: ${Object.keys(timelines).join(', ') || '(none)'}.`);
    return timelineId;
  }
  const machine = doc.defaultStateMachine ? doc.stateMachines?.[doc.defaultStateMachine] : undefined;
  const entryTimeline = machine ? machine.states[machine.entry]?.timeline : undefined;
  if (entryTimeline && timelines[entryTimeline]) return entryTimeline;
  const ids = Object.keys(timelines);
  if (ids.length === 1) return ids[0];
  if (ids.length === 0) return null;
  throw new ElucimFrameExportError(`Document has ${ids.length} timelines and no default state machine; pass a timeline id (${ids.join(', ')}).`);
}

/**
 * Plans which document frames to render. Output frame `n` at `fps` samples
 * document frame `n * documentFps / fps` (exact when the rates match, e.g. a
 * 25 fps scene retimed to 25 fps cues). The frame count is exactly what was
 * requested; the default covers frames 0..duration inclusive. Frames after the
 * timeline end hold its final state.
 */
export function planFrameExport(doc: ElucimDocument, options: FramePlanOptions = {}): FrameExportPlan {
  const timelineId = resolveExportTimeline(doc, options.timelineId);
  const timelineDuration = timelineId ? doc.timelines![timelineId].duration : 0;
  const documentFps = doc.scene.fps ?? DEFAULT_DOCUMENT_FPS;
  const fps = options.fps ?? documentFps;
  if (!(Number.isFinite(fps) && fps > 0)) throw new ElucimFrameExportError(`fps must be a positive number, got ${fps}.`);
  if (!(Number.isFinite(documentFps) && documentFps > 0)) throw new ElucimFrameExportError(`scene.fps must be a positive number, got ${documentFps}.`);

  let indices: number[];
  if (options.frames) {
    if (options.start !== undefined || options.end !== undefined || options.count !== undefined) {
      throw new ElucimFrameExportError('Use either an explicit frame list or start/end/count, not both.');
    }
    indices = options.frames.map(frame => requireIndex('frame', frame));
  } else {
    const start = requireIndex('start', options.start ?? 0);
    if (options.end !== undefined && options.count !== undefined) throw new ElucimFrameExportError('Use either end or count, not both.');
    let count: number;
    if (options.count !== undefined) {
      count = requireIndex('count', options.count);
    } else if (options.end !== undefined) {
      const end = requireIndex('end', options.end);
      if (end < start) throw new ElucimFrameExportError(`end (${end}) must be >= start (${start}).`);
      count = end - start;
    } else {
      // A float tolerance keeps 60->25 style conversions from losing the last frame to rounding.
      const lastIndex = Math.floor((timelineDuration * fps) / documentFps + 1e-9);
      count = Math.max(0, lastIndex + 1 - start);
    }
    indices = Array.from({ length: count }, (_, offset) => start + offset);
  }

  return {
    timelineId,
    documentFps,
    fps,
    timelineDuration,
    frames: indices.map(index => ({ index, sourceFrame: fps === documentFps ? index : (index * documentFps) / fps })),
  };
}

/** Renders one document frame to a standalone SVG string (Node-safe). */
export function renderFrameSvg(doc: ElucimDocument, sourceFrame: number, options: FrameRenderOptions = {}): string {
  const bound = options.anchors ? bindAnchors(doc, options.anchors) : doc;
  const timelineId = resolveExportTimeline(bound, options.timelineId) ?? undefined;
  return renderToStandaloneSvg(bound, sourceFrame, {
    timelineId,
    width: options.width,
    height: options.height,
    background: options.background,
  });
}

/** Renders one document frame to PNG bytes (RGBA; transparent background keeps alpha). */
export function renderFramePng(doc: ElucimDocument, sourceFrame: number, options: FrameRenderOptions = {}): Uint8Array {
  return rasterize(renderFrameSvg(doc, sourceFrame, options), options).png;
}

/**
 * Renders a frame sequence to `outDir` as PNG (default) or SVG files, written
 * one at a time. Anchors are bound once up front.
 */
export async function exportFrames(doc: ElucimDocument, options: FrameExportOptions): Promise<FrameExportResult> {
  const format = options.format ?? 'png';
  if (format !== 'png' && format !== 'svg') throw new ElucimFrameExportError(`format must be "png" or "svg", got "${String(format)}".`);
  const bound = options.anchors ? bindAnchors(doc, options.anchors) : doc;
  const plan = planFrameExport(bound, options);
  const prefix = options.prefix ?? 'frame-';
  await mkdir(options.outDir, { recursive: true });

  const renderOptions: FrameRenderOptions = {
    timelineId: plan.timelineId ?? undefined,
    width: options.width,
    height: options.height,
    background: options.background,
  };
  const files: string[] = [];
  let width = 0;
  let height = 0;
  // Held frames render to identical SVG; reuse the previous raster.
  let previous: { svg: string; png: Uint8Array } | undefined;
  for (const frame of plan.frames) {
    const svg = renderFrameSvg(bound, frame.sourceFrame, renderOptions);
    const file = join(options.outDir, `${prefix}${String(frame.index).padStart(6, '0')}.${format}`);
    if (format === 'svg') {
      await writeFile(file, svg, 'utf8');
      if (!width) [width, height] = svgSize(svg);
    } else {
      if (previous?.svg !== svg) {
        const rendered = rasterize(svg, options);
        width = rendered.width;
        height = rendered.height;
        previous = { svg, png: rendered.png };
      }
      await writeFile(file, previous.png);
    }
    files.push(file);
  }
  if (!width && plan.frames.length === 0) [width, height] = svgSize(renderFrameSvg(bound, 0, renderOptions));

  return {
    ...plan,
    outDir: options.outDir,
    format,
    width,
    height,
    background: options.background ?? 'scene',
    pattern: `${prefix}%06d.${format}`,
    files,
  };
}

function rasterize(svg: string, options: Pick<FrameRenderOptions, 'fontFiles' | 'systemFonts'>) {
  const hasText = /<text[\s>]/.test(svg);
  const fontFiles = options.fontFiles?.length ? options.fontFiles : undefined;
  const resvgOptions: ResvgRenderOptions = {
    background: 'rgba(0,0,0,0)',
    font: {
      loadSystemFonts: hasText && (fontFiles ? options.systemFonts === true : true),
      fontFiles: hasText ? fontFiles : undefined,
      defaultFontFamily: 'Arial',
    },
  };
  const rendered = new Resvg(svg, resvgOptions).render();
  return { width: rendered.width, height: rendered.height, png: rendered.asPng() as Uint8Array };
}

function svgSize(svg: string): [number, number] {
  const match = svg.match(/^<svg[^>]*\swidth="(\d+)"\s+height="(\d+)"/);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}

function requireIndex(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new ElucimFrameExportError(`${name} must be a non-negative integer, got ${value}.`);
  return value;
}
