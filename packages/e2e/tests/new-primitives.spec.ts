import { test, expect, Page } from '@playwright/test';

async function seekToFrame(page: Page, playerSelector: string, frame: number, totalFrames: number) {
  const scrubbar = page.locator(`${playerSelector} [data-testid="elucim-scrubbar"]`);
  await scrubbar.scrollIntoViewIfNeeded();
  await scrubbar.waitFor({ state: 'visible' });
  const box = await scrubbar.boundingBox();
  if (!box) throw new Error('Scrubbar not found');

  const ratio = frame / (totalFrames - 1);
  const x = box.x + ratio * box.width;
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

async function screenshotSection(page: Page, sectionId: string, filename: string) {
  const section = page.locator(`#${sectionId}`);
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await section.screenshot({ path: `screenshots/${filename}` });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LaTeX Rendering
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('LaTeX Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3100');
  });

  test('initial state — first equation visible', async ({ page }) => {
    await screenshotSection(page, 'latex-demo', 'latex-initial.png');
  });

  test('frame 20 — E=mc² fading in', async ({ page }) => {
    await seekToFrame(page, '#latex-demo', 20, 150);
    await screenshotSection(page, 'latex-demo', 'latex-frame20.png');
  });

  test('frame 50 — two equations visible', async ({ page }) => {
    await seekToFrame(page, '#latex-demo', 50, 150);
    await screenshotSection(page, 'latex-demo', 'latex-frame50.png');
  });

  test('frame 80 — three equations visible', async ({ page }) => {
    await seekToFrame(page, '#latex-demo', 80, 150);
    await screenshotSection(page, 'latex-demo', 'latex-frame80.png');
  });

  test('frame 130 — all four equations visible', async ({ page }) => {
    await seekToFrame(page, '#latex-demo', 130, 150);
    await screenshotSection(page, 'latex-demo', 'latex-frame130.png');
  });

  test('KaTeX renders math symbols correctly', async ({ page }) => {
    // Seek far enough that all equations are rendered
    await seekToFrame(page, '#latex-demo', 140, 150);
    const section = page.locator('#latex-demo');
    await section.scrollIntoViewIfNeeded();

    // Check that KaTeX classes are present (proves rendering worked)
    const katexElements = section.locator('.katex');
    await expect(katexElements.first()).toBeVisible();
    const count = await katexElements.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Vector Field
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Vector Field', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3100');
  });

  test('initial state — axes visible, arrows fading in', async ({ page }) => {
    await screenshotSection(page, 'vector-field-demo', 'vfield-initial.png');
  });

  test('frame 30 — arrows partially visible', async ({ page }) => {
    await seekToFrame(page, '#vector-field-demo', 30, 90);
    await screenshotSection(page, 'vector-field-demo', 'vfield-frame30.png');
  });

  test('frame 60 — fully visible rotation field', async ({ page }) => {
    await seekToFrame(page, '#vector-field-demo', 60, 90);
    await screenshotSection(page, 'vector-field-demo', 'vfield-frame60.png');
  });

  test('frame 80 — label text appears', async ({ page }) => {
    await seekToFrame(page, '#vector-field-demo', 80, 90);
    await screenshotSection(page, 'vector-field-demo', 'vfield-frame80.png');
  });

  test('arrows are rendered as line elements', async ({ page }) => {
    await seekToFrame(page, '#vector-field-demo', 60, 90);
    const section = page.locator('#vector-field-demo');
    await section.scrollIntoViewIfNeeded();
    // VectorField renders lines for arrows
    const arrows = section.locator('svg line');
    const count = await arrows.count();
    expect(count).toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Polygon
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Polygon', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3100');
  });

  test('initial state — pentagon outline starting', async ({ page }) => {
    await screenshotSection(page, 'polygon-demo', 'polygon-initial.png');
  });

  test('frame 30 — pentagon drawing, star appearing', async ({ page }) => {
    await seekToFrame(page, '#polygon-demo', 30, 120);
    await screenshotSection(page, 'polygon-demo', 'polygon-frame30.png');
  });

  test('frame 60 — both shapes mid-draw', async ({ page }) => {
    await seekToFrame(page, '#polygon-demo', 60, 120);
    await screenshotSection(page, 'polygon-demo', 'polygon-frame60.png');
  });

  test('frame 100 — both shapes fully drawn', async ({ page }) => {
    await seekToFrame(page, '#polygon-demo', 100, 120);
    await screenshotSection(page, 'polygon-demo', 'polygon-frame100.png');
  });

  test('polygon elements rendered', async ({ page }) => {
    await seekToFrame(page, '#polygon-demo', 100, 120);
    const section = page.locator('#polygon-demo');
    await section.scrollIntoViewIfNeeded();
    // Polygons render as <polygon> SVG elements
    const polygons = section.locator('svg polygon');
    const count = await polygons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
