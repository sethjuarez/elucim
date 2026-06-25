import { expect, test } from '@playwright/test';

const PNG_HEADER = [137, 80, 78, 71, 13, 10, 26, 10];

type BrowserElucim = {
  renderToPng(document: unknown, frame?: number, options?: { scale?: number }): Promise<Uint8Array>;
  renderToSvgString(document: unknown, frame?: number, options?: { width?: number; height?: number }): string;
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

  test('renders calculus primitives from a canonical document to measurable SVG geometry', async ({ page }) => {
    const result = await page.evaluate(() => {
      const elucim = window.__elucim;
      if (!elucim) throw new Error('Elucim browser API was not exposed');
      const { renderToSvgString } = elucim;
      const document = {
        version: '2.0',
        scene: {
          type: 'scene',
          width: 960,
          height: 540,
          children: ['axes', 'curve', 'riemann', 'area', 'secant', 'tangent'],
        },
        elements: {
          axes: {
            id: 'axes',
            type: 'axes',
            props: { type: 'axes', origin: [180, 470], xRange: [-1, 5], yRange: [-1, 8], scale: 70 },
          },
          curve: {
            id: 'curve',
            type: 'functionPlot',
            props: { type: 'functionPlot', fn: 'x^2', xRange: [-0.5, 3.5], origin: [180, 470], scale: 70 },
          },
          riemann: {
            id: 'riemann',
            type: 'riemannSum',
            props: { type: 'riemannSum', fn: 'x^2', interval: [0, 3], n: 7, method: 'midpoint', origin: [180, 470], scale: 70 },
          },
          area: {
            id: 'area',
            type: 'accumulationArea',
            props: { type: 'accumulationArea', fn: 'x^2', from: 0, to: 2.4, samples: 80, origin: [180, 470], scale: 70 },
          },
          secant: {
            id: 'secant',
            type: 'secantLine',
            props: { type: 'secantLine', fn: 'x^2', x: 1, dx: 0.85, length: 3, origin: [180, 470], scale: 70, showPoints: true },
          },
          tangent: {
            id: 'tangent',
            type: 'tangentLine',
            props: { type: 'tangentLine', fn: 'x^2', derivative: '2*x', x: 1.85, length: 3, origin: [180, 470], scale: 70, showPoints: true },
          },
        },
      };
      const svg = renderToSvgString(document, 45, { width: 960, height: 540 });
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const svgElement = parsed.querySelector('svg');
      const element = (testId: string) => parsed.querySelector(`[data-testid="${testId}"]`);
      const pathData = (testId: string) => element(testId)?.getAttribute('d') ?? '';

      return {
        hasSvg: svgElement !== null,
        secantLines: element('elucim-secant-line')?.querySelectorAll('line').length ?? 0,
        secantPoints: element('elucim-secant-line')?.querySelectorAll('circle').length ?? 0,
        tangentLines: element('elucim-tangent-line')?.querySelectorAll('line').length ?? 0,
        tangentPoints: element('elucim-tangent-line')?.querySelectorAll('circle').length ?? 0,
        riemannRects: element('elucim-riemann-sum')?.querySelectorAll('rect').length ?? 0,
        accumulationPathLength: pathData('elucim-accumulation-area').length,
        functionPlotPathLength: pathData('elucim-function-plot').length,
      };
    });

    expect(result.hasSvg).toBe(true);
    expect(result.secantLines).toBe(1);
    expect(result.secantPoints).toBe(2);
    expect(result.tangentLines).toBe(1);
    expect(result.tangentPoints).toBe(1);
    expect(result.riemannRects).toBe(7);
    expect(result.accumulationPathLength).toBeGreaterThan(100);
    expect(result.functionPlotPathLength).toBeGreaterThan(100);
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
