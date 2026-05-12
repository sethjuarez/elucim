import { expect, test } from '@playwright/test';

const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];

type BrowserElucim = {
  renderToPng(document: unknown, frame?: number, options?: { scale?: number }): Promise<Uint8Array>;
  stripCssFunctions(value: string): string;
};

declare global {
  interface Window {
    __elucim?: BrowserElucim;
  }
}

test.describe('export contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__elucim?.renderToPng);
  });

  test('renders an Elucim Document to valid PNG bytes', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const elucim = window.__elucim;
      if (!elucim) throw new Error('Elucim browser API was not exposed');
      const { renderToPng } = elucim;
      const document = {
        version: '2.0',
        scene: {
          type: 'scene',
          width: 400,
          height: 300,
          background: '#1a1a2e',
          children: ['circle'],
        },
        elements: {
          circle: {
            id: 'circle',
            type: 'circle',
            props: { type: 'circle', cx: 200, cy: 150, r: 50, fill: '#ff0000' },
          },
        },
      };
      const png = await renderToPng(document, 0, { scale: 1 });
      return { len: png.byteLength, header: Array.from(png.slice(0, 8)) };
    });

    expect(result.header).toEqual(PNG_HEADER);
    expect(result.len).toBeGreaterThan(100);
  });

  test('resolves semantic color tokens during PNG export', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const elucim = window.__elucim;
      if (!elucim) throw new Error('Elucim browser API was not exposed');
      const { renderToPng } = elucim;
      const document = {
        version: '2.0',
        scene: {
          type: 'scene',
          width: 640,
          height: 360,
          background: '$background',
          children: ['title', 'shape', 'surface'],
        },
        elements: {
          title: {
            id: 'title',
            type: 'text',
            props: { type: 'text', content: 'Hello World', fill: '$foreground', x: 100, y: 100, fontSize: 32 },
          },
          shape: {
            id: 'shape',
            type: 'circle',
            props: { type: 'circle', cx: 400, cy: 200, r: 60, fill: '$accent', stroke: '$border', strokeWidth: 2 },
          },
          surface: {
            id: 'surface',
            type: 'rect',
            props: { type: 'rect', x: 50, y: 250, width: 200, height: 40, fill: '$surface' },
          },
        },
      };
      const png = await renderToPng(document, 0, { scale: 1 });
      return { len: png.byteLength, header: Array.from(png.slice(0, 8)) };
    });

    expect(result.header).toEqual(PNG_HEADER);
    expect(result.len).toBeGreaterThan(100);
  });

  test('higher scale increases PNG byte size', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const elucim = window.__elucim;
      if (!elucim) throw new Error('Elucim browser API was not exposed');
      const { renderToPng } = elucim;
      const document = {
        version: '2.0',
        scene: { type: 'scene', width: 200, height: 100, children: ['dot'] },
        elements: {
          dot: {
            id: 'dot',
            type: 'circle',
            props: { type: 'circle', cx: 100, cy: 50, r: 30, fill: '$primary' },
          },
        },
      };
      const png1 = await renderToPng(document, 0, { scale: 1 });
      const png2 = await renderToPng(document, 0, { scale: 2 });
      return { scale1: png1.byteLength, scale2: png2.byteLength };
    });

    expect(result.scale2).toBeGreaterThan(result.scale1);
  });

  test('strips browser-only CSS color functions for standalone SVG export', async ({ page }) => {
    const results = await page.evaluate(() => {
      const elucim = window.__elucim;
      if (!elucim) throw new Error('Elucim browser API was not exposed');
      const { stripCssFunctions } = elucim;
      return [
        { input: 'var(--elucim-foreground, #c8d6e5)', expected: '#c8d6e5' },
        { input: 'var(--elucim-scene-bg, var(--elucim-background, #0a0a1e))', expected: '#0a0a1e' },
        { input: 'var(--elucim-scene-fg, light-dark(#333, #e0e0e0))', expected: '#e0e0e0' },
        { input: 'var(--elucim-custom)', expected: 'none' },
        { input: 'light-dark(#333, #e0e0e0)', expected: '#e0e0e0' },
      ].map(({ input, expected }) => ({ input, expected, actual: stripCssFunctions(input) }));
    });

    for (const result of results) {
      expect(result.actual, `stripCssFunctions(${result.input})`).toBe(result.expected);
    }
  });
});
