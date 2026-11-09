import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';
import type { ElucimDocument } from '@elucim/dsl';
import {
  exportFrames,
  ElucimFrameExportError,
  planFrameExport,
  renderFramePng,
  resolveExportTimeline,
  runCli,
} from '../index';

function capture() {
  let stdout = '';
  let stderr = '';
  return {
    io: {
      stdout: (value: string) => { stdout += value; },
      stderr: (value: string) => { stderr += value; },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'elucim-render-'));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A 25 fps overlay: a box fades in from frame 0 to 25 and a marker sits at 25. */
function overlayDoc(fps = 25): ElucimDocument {
  return {
    version: '2.0',
    scene: { type: 'player', width: 160, height: 90, fps, background: '#202020', children: ['box', 'arrow'] },
    anchors: { target: { x: 20, y: 20, width: 20, height: 20 } },
    elements: {
      box: { id: 'box', type: 'rect', layout: { anchor: { id: 'target', point: 'top-left' } }, props: { type: 'rect', x: 20, y: 20, width: 20, height: 20, fill: '#ff0000', opacity: 0 } },
      arrow: { id: 'arrow', type: 'line', layout: { anchor: { id: 'target', endpoint: 'end' } }, props: { type: 'line', x1: 0, y1: 0, x2: 30, y2: 30, stroke: '#00ff00', strokeWidth: 2 } },
    },
    timelines: {
      intro: {
        id: 'intro',
        duration: 50,
        markers: { show: 25 },
        tracks: [{ target: 'box', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 25, value: 1 }] }],
      },
    },
  };
}

function pixel(png: Uint8Array, x: number, y: number): [number, number, number, number] {
  const decoded = decodePng(png);
  const offset = (y * decoded.width + x) * 4;
  return [decoded.pixels[offset], decoded.pixels[offset + 1], decoded.pixels[offset + 2], decoded.pixels[offset + 3]];
}

/** Rasterizes the PNG back through resvg (as an <image>) to read RGBA pixels. */
function decodePng(png: Uint8Array) {
  const width = png[16] * 2 ** 24 + png[17] * 2 ** 16 + png[18] * 2 ** 8 + png[19];
  const height = png[20] * 2 ** 24 + png[21] * 2 ** 16 + png[22] * 2 ** 8 + png[23];
  const href = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${href}" width="${width}" height="${height}"/></svg>`;
  const rendered = new Resvg(svg, { background: 'rgba(0,0,0,0)', font: { loadSystemFonts: false } }).render();
  return { width, height, pixels: rendered.pixels };
}

describe('frame planning', () => {
  it('covers the whole timeline at the document fps by default', () => {
    const plan = planFrameExport(overlayDoc());
    expect(plan.timelineId).toBe('intro');
    expect(plan.documentFps).toBe(25);
    expect(plan.fps).toBe(25);
    expect(plan.frames).toHaveLength(51);
    expect(plan.frames[25]).toEqual({ index: 25, sourceFrame: 25 });
  });

  it('resamples between frame rates with exact counts', () => {
    // 60 fps scene, 50 source frames: last output frame at 25 fps is floor(50*25/60)=20.
    const down = planFrameExport(overlayDoc(60), { fps: 25 });
    expect(down.frames).toHaveLength(21);
    expect(down.frames[12].sourceFrame).toBeCloseTo(28.8);
    // 24 fps -> 25 fps keeps the last frame despite float error.
    const doc24 = overlayDoc(24);
    doc24.timelines!.intro.duration = 48;
    const up = planFrameExport(doc24, { fps: 25 });
    expect(up.frames).toHaveLength(51);
    expect(up.frames[50].sourceFrame).toBeCloseTo(48);
    // 30 -> 25
    const doc30 = overlayDoc(30);
    doc30.timelines!.intro.duration = 60;
    expect(planFrameExport(doc30, { fps: 25 }).frames).toHaveLength(51);
  });

  it('honors start/end/count/frames exactly, including frames past the timeline', () => {
    expect(planFrameExport(overlayDoc(), { start: 10, end: 20 }).frames.map(frame => frame.index)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(planFrameExport(overlayDoc(), { start: 40, count: 30 }).frames).toHaveLength(30);
    expect(planFrameExport(overlayDoc(), { count: 0 }).frames).toHaveLength(0);
    expect(planFrameExport(overlayDoc(), { frames: [3, 1] }).frames.map(frame => frame.index)).toEqual([3, 1]);
  });

  it('rejects bad ranges and fps with typed errors', () => {
    expect(() => planFrameExport(overlayDoc(), { fps: 0 })).toThrow(ElucimFrameExportError);
    expect(() => planFrameExport(overlayDoc(), { start: -1 })).toThrow(/non-negative integer/);
    expect(() => planFrameExport(overlayDoc(), { start: 1.5 })).toThrow(/non-negative integer/);
    expect(() => planFrameExport(overlayDoc(), { end: 5, count: 5 })).toThrow(/end or count/);
    expect(() => planFrameExport(overlayDoc(), { start: 9, end: 5 })).toThrow(/>= start/);
    expect(() => planFrameExport(overlayDoc(), { frames: [1], count: 2 })).toThrow(/not both/);
    expect(() => planFrameExport(overlayDoc(), { timelineId: 'nope' })).toThrow(/does not exist/);
  });

  it('picks the default state machine entry timeline, else the only one, else static', () => {
    const doc = overlayDoc();
    doc.timelines!.other = { id: 'other', duration: 10, tracks: [] };
    expect(() => resolveExportTimeline(doc)).toThrow(/2 timelines/);
    doc.stateMachines = { main: { id: 'main', entry: 'start', states: { start: { timeline: 'other' } } } };
    doc.defaultStateMachine = 'main';
    expect(resolveExportTimeline(doc)).toBe('other');
    const staticDoc = { ...overlayDoc(), timelines: undefined };
    expect(resolveExportTimeline(staticDoc)).toBeNull();
    expect(planFrameExport(staticDoc).frames).toHaveLength(1);
  });
});

describe('PNG rendering', () => {
  it('keeps alpha with a transparent background and paints the scene background otherwise', () => {
    const transparent = renderFramePng(overlayDoc(), 25, { background: 'transparent' });
    expect(pixel(transparent, 1, 80)[3]).toBe(0);
    expect(pixel(transparent, 25, 35)).toEqual([255, 0, 0, 255]);
    const opaque = renderFramePng(overlayDoc(), 25);
    expect(pixel(opaque, 1, 80)).toEqual([32, 32, 32, 255]);
    // Frame 0: box is fully transparent.
    expect(pixel(renderFramePng(overlayDoc(), 0, { background: 'transparent' }), 25, 35)[3]).toBe(0);
  });

  it('scales to an output pixel size and binds anchors from data', () => {
    const png = renderFramePng(overlayDoc(), 25, {
      background: 'transparent',
      width: 320,
      anchors: { anchors: { target: { x: 100, y: 50, w: 20, h: 20 } } },
    });
    expect(decodePng(png).width).toBe(320);
    expect(decodePng(png).height).toBe(180);
    // Box moved to (100,50)-(120,70) in scene units = (200,100)-(240,140) in pixels.
    expect(pixel(png, 208, 132)).toEqual([255, 0, 0, 255]);
    expect(pixel(png, 60, 60)[3]).toBe(0);
  });
});

describe('exportFrames', () => {
  it('writes exactly the requested PNG frames with stable names', async () => {
    await withTempDir(async dir => {
      const result = await exportFrames(overlayDoc(), { outDir: dir, start: 20, count: 10, background: 'transparent' });
      expect(result.files).toHaveLength(10);
      expect(result.pattern).toBe('frame-%06d.png');
      expect(result.width).toBe(160);
      expect(result.height).toBe(90);
      const names = (await readdir(dir)).sort();
      expect(names[0]).toBe('frame-000020.png');
      expect(names[9]).toBe('frame-000029.png');
    });
  });

  it('writes standalone SVG frames', async () => {
    await withTempDir(async dir => {
      const result = await exportFrames(overlayDoc(), { outDir: dir, format: 'svg', frames: [0], prefix: 'f' });
      expect(result.files).toEqual([join(dir, 'f000000.svg')]);
      expect(await readFile(result.files[0], 'utf8')).toMatch(/^<svg[^>]*width="160"/);
    });
  });
});

describe('CLI export-frames --out-dir and retime', () => {
  it('lists retime in the catalog', async () => {
    const output = capture();
    expect(await runCli(['ops', '--json'], output.io)).toBe(0);
    const payload = JSON.parse(output.stdout());
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('retime');
    expect(payload.cli.recommendedWorkflows).toContainEqual(expect.objectContaining({ commands: ['retime', 'validate', 'export-frames'] }));
  });

  it('retimes to a cue map, then renders a transparent 25 fps sequence', async () => {
    await withTempDir(async dir => {
      const file = join(dir, 'overlay.elc');
      const retimed = join(dir, 'retimed.elc');
      const cues = join(dir, 'cues.json');
      const anchors = join(dir, 'boxes.json');
      const frames = join(dir, 'frames');
      await writeFile(file, JSON.stringify(overlayDoc()), 'utf8');
      await writeFile(cues, JSON.stringify({ cues: { show: 40 } }), 'utf8');
      await writeFile(anchors, JSON.stringify({ source: { width: 320, height: 180 }, anchors: { target: { x: 200, y: 100, w: 40, h: 40 } } }), 'utf8');

      const retime = capture();
      expect(await runCli(['retime', file, '--timeline', 'intro', '--map-file', cues, '--out', retimed, '--json'], retime.io), retime.stderr()).toBe(0);
      const retimePayload = JSON.parse(retime.stdout());
      expect(retimePayload.markers).toEqual({ show: 40 });
      expect(retimePayload.duration).toBe(65);
      const retimedDoc = JSON.parse(await readFile(retimed, 'utf8')) as ElucimDocument;
      expect(retimedDoc.timelines!.intro.tracks[0].keyframes.map(keyframe => keyframe.frame)).toEqual([0, 40]);

      const exported = capture();
      expect(await runCli([
        'export-frames', retimed, '--out-dir', frames, '--fps', '25', '--count', '66',
        '--background', 'transparent', '--anchors', anchors, '--json',
      ], exported.io), exported.stderr()).toBe(0);
      const payload = JSON.parse(exported.stdout());
      expect(payload.frameCount).toBe(66);
      expect((await readdir(frames)).length).toBe(66);
      const at40 = await readFile(join(frames, 'frame-000040.png'));
      expect(pixel(at40, 104, 66)).toEqual([255, 0, 0, 255]);
      expect(pixel(at40, 5, 85)[3]).toBe(0);
      const at20 = await readFile(join(frames, 'frame-000020.png'));
      expect(pixel(at20, 104, 66)[3]).toBeLessThan(255);
    });
  });

  it('accepts --map pairs with --cue-fps conversion and reports bad cues', async () => {
    await withTempDir(async dir => {
      const file = join(dir, 'overlay.elc');
      await writeFile(file, JSON.stringify(overlayDoc(50)), 'utf8');
      const ok = capture();
      expect(await runCli(['retime', file, '--timeline', 'intro', '--map', 'show=30', '--cue-fps', '25', '--json'], ok.io), ok.stderr()).toBe(0);
      expect(JSON.parse(ok.stdout()).markers).toEqual({ show: 60 });

      const unknown = capture();
      expect(await runCli(['retime', file, '--timeline', 'intro', '--map', 'nope=3', '--json'], unknown.io)).toBe(1);
      expect(JSON.parse(unknown.stderr()).error).toMatch(/nope/);

      const missing = capture();
      expect(await runCli(['retime', file, '--timeline', 'intro', '--json'], missing.io)).toBe(1);
      expect(JSON.parse(missing.stderr()).error).toMatch(/--map/);

      const malformed = capture();
      expect(await runCli(['retime', file, '--timeline', 'intro', '--map', 'show=abc', '--json'], malformed.io)).toBe(1);
    });
  });

  it('rejects invalid render flags', async () => {
    await withTempDir(async dir => {
      const file = join(dir, 'overlay.elc');
      await writeFile(file, JSON.stringify(overlayDoc()), 'utf8');
      const badFormat = capture();
      expect(await runCli(['export-frames', file, '--out-dir', join(dir, 'f'), '--format', 'gif', '--json'], badFormat.io)).toBe(1);
      const badAspect = capture();
      expect(await runCli(['export-frames', file, '--out-dir', join(dir, 'f'), '--width', '100', '--height', '100', '--count', '1', '--json'], badAspect.io)).toBe(1);
      expect(JSON.parse(badAspect.stderr()).error).toMatch(/aspect ratio/);
    });
  });
});
