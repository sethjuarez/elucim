import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3100';
const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];

test.describe('renderToPng', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForFunction(() => (window as any).__elucim?.renderToPng);
  });

  test('renders plain hex colors to valid PNG', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderToPng } = (window as any).__elucim;
      const doc = {
        version: '1.0',
        root: {
          type: 'scene', durationInFrames: 30, width: 400, height: 300,
          background: '#1a1a2e',
          children: [{ type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' }],
        },
      };
      try {
        const png = await renderToPng(doc, 0, { scale: 1 });
        return { ok: true, len: png.byteLength, hdr: Array.from(png.slice(0, 8)) };
      } catch (e: any) { return { ok: false, err: e.message }; }
    });
    expect(result.ok, `renderToPng failed: ${(result as any).err}`).toBe(true);
    expect((result as any).hdr).toEqual(PNG_HEADER);
    expect((result as any).len).toBeGreaterThan(100);
  });

  test('renders $token colors without InvalidStateError (CutReady repro)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderToPng } = (window as any).__elucim;
      const doc = {
        version: '1.0',
        root: {
          type: 'scene', durationInFrames: 60, width: 640, height: 360,
          background: '$background',
          children: [
            { type: 'text', content: 'Hello World', fill: '$foreground', x: 100, y: 100, fontSize: 32 },
            { type: 'circle', cx: 400, cy: 200, r: 60, fill: '$accent', stroke: '$border', strokeWidth: 2 },
            { type: 'rect', x: 50, y: 250, width: 200, height: 40, fill: '$surface' },
          ],
        },
      };
      try {
        const png = await renderToPng(doc, 0, { scale: 1 });
        return { ok: true, len: png.byteLength, hdr: Array.from(png.slice(0, 8)) };
      } catch (e: any) { return { ok: false, err: e.message }; }
    });
    expect(result.ok, `renderToPng failed: ${(result as any).err}`).toBe(true);
    expect((result as any).hdr).toEqual(PNG_HEADER);
    expect((result as any).len).toBeGreaterThan(100);
  });

  test('renders ALL 14 semantic tokens without errors', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderToPng } = (window as any).__elucim;
      const doc = {
        version: '1.0',
        root: {
          type: 'scene', durationInFrames: 30, width: 800, height: 600,
          background: '$background',
          children: [
            { type: 'text', content: 'Title', fill: '$title', x: 50, y: 50, fontSize: 40 },
            { type: 'text', content: 'Subtitle', fill: '$subtitle', x: 50, y: 100, fontSize: 24 },
            { type: 'text', content: 'FG', fill: '$foreground', x: 50, y: 140, fontSize: 18 },
            { type: 'text', content: 'Muted', fill: '$muted', x: 50, y: 170, fontSize: 18 },
            { type: 'circle', cx: 600, cy: 100, r: 40, fill: '$accent' },
            { type: 'circle', cx: 600, cy: 200, r: 40, fill: '$primary' },
            { type: 'circle', cx: 600, cy: 300, r: 40, fill: '$secondary' },
            { type: 'circle', cx: 600, cy: 400, r: 40, fill: '$tertiary' },
            { type: 'rect', x: 50, y: 200, width: 300, height: 100, fill: '$surface', stroke: '$border', strokeWidth: 2 },
            { type: 'text', content: 'OK', fill: '$success', x: 70, y: 250, fontSize: 16 },
            { type: 'text', content: '!!', fill: '$warning', x: 170, y: 250, fontSize: 16 },
            { type: 'text', content: 'ERR', fill: '$error', x: 270, y: 250, fontSize: 16 },
          ],
        },
      };
      try {
        const png = await renderToPng(doc, 0, { scale: 1 });
        return { ok: true, len: png.byteLength, hdr: Array.from(png.slice(0, 8)) };
      } catch (e: any) { return { ok: false, err: e.message }; }
    });
    expect(result.ok, `renderToPng failed: ${(result as any).err}`).toBe(true);
    expect((result as any).hdr).toEqual(PNG_HEADER);
  });

  test('scale=2 produces larger PNG than scale=1', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderToPng } = (window as any).__elucim;
      const doc = {
        version: '1.0',
        root: {
          type: 'scene', durationInFrames: 30, width: 200, height: 100,
          children: [{ type: 'circle', cx: 100, cy: 50, r: 30, fill: '$primary' }],
        },
      };
      const png1 = await renderToPng(doc, 0, { scale: 1 });
      const png2 = await renderToPng(doc, 0, { scale: 2 });
      return { s1: png1.byteLength, s2: png2.byteLength };
    });
    expect(result.s2).toBeGreaterThan(result.s1);
  });

  test('no background specified defaults to white', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderToPng } = (window as any).__elucim;
      const doc = {
        version: '1.0',
        root: {
          type: 'scene', durationInFrames: 30, width: 100, height: 100,
          children: [{ type: 'circle', cx: 50, cy: 50, r: 20, fill: '#333' }],
        },
      };
      try {
        const png = await renderToPng(doc, 0, { scale: 1 });
        return { ok: true, len: png.byteLength, hdr: Array.from(png.slice(0, 8)) };
      } catch (e: any) { return { ok: false, err: e.message }; }
    });
    expect(result.ok, `renderToPng failed: ${(result as any).err}`).toBe(true);
    expect((result as any).hdr).toEqual(PNG_HEADER);
  });

  test('stripCssFunctions resolves all edge cases', async ({ page }) => {
    const results = await page.evaluate(() => {
      const { stripCssFunctions } = (window as any).__elucim;
      return [
        { i: 'var(--elucim-foreground, #c8d6e5)', e: '#c8d6e5' },
        { i: 'var(--elucim-scene-bg, var(--elucim-background, #0a0a1e))', e: '#0a0a1e' },
        { i: 'var(--elucim-scene-fg, light-dark(#333, #e0e0e0))', e: '#e0e0e0' },
        { i: 'var(--elucim-custom)', e: 'none' },
        { i: 'light-dark(#333, #e0e0e0)', e: '#e0e0e0' },
        { i: '#ff0000', e: '#ff0000' },
      ].map(({ i, e }) => ({ i, e, a: stripCssFunctions(i), ok: stripCssFunctions(i) === e }));
    });
    for (const r of results) {
      expect(r.a, `strip("${r.i}") → "${r.a}" (expected "${r.e}")`).toBe(r.e);
    }
  });
});
