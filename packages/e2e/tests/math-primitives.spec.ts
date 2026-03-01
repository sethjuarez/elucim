import { test, expect, Page } from '@playwright/test';

/**
 * Helper: advance the player to a specific frame by clicking the scrub bar.
 */
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
// Axes + FunctionPlot
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Axes + Function Plots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#axes-function-demo');
  });

  test('frame 0 — axes visible, no functions yet', async ({ page }) => {
    await screenshotSection(page, 'axes-function-demo', 'p2-01-axes-frame0.png');
  });

  test('frame 40 — sin(x) partially drawn', async ({ page }) => {
    await seekToFrame(page, '#axes-function-demo [data-testid="elucim-player"]', 40, 120);
    await screenshotSection(page, 'axes-function-demo', 'p2-02-axes-frame40.png');
  });

  test('frame 80 — sin(x) complete, cos(x) drawing', async ({ page }) => {
    await seekToFrame(page, '#axes-function-demo [data-testid="elucim-player"]', 80, 120);
    await screenshotSection(page, 'axes-function-demo', 'p2-03-axes-frame80.png');
  });

  test('frame 115 — both functions and labels visible', async ({ page }) => {
    await seekToFrame(page, '#axes-function-demo [data-testid="elucim-player"]', 115, 120);
    await screenshotSection(page, 'axes-function-demo', 'p2-04-axes-frame115.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Vectors
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Vectors Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#vector-demo');
  });

  test('frame 0 — axes only', async ({ page }) => {
    await screenshotSection(page, 'vector-demo', 'p2-05-vectors-frame0.png');
  });

  test('frame 25 — first vector v₁ appearing', async ({ page }) => {
    await seekToFrame(page, '#vector-demo [data-testid="elucim-player"]', 25, 120);
    await screenshotSection(page, 'vector-demo', 'p2-06-vectors-frame25.png');
  });

  test('frame 55 — v₁ and v₂ visible, sum appearing', async ({ page }) => {
    await seekToFrame(page, '#vector-demo [data-testid="elucim-player"]', 55, 120);
    await screenshotSection(page, 'vector-demo', 'p2-07-vectors-frame55.png');
  });

  test('frame 90 — all vectors + parallelogram visible', async ({ page }) => {
    await seekToFrame(page, '#vector-demo [data-testid="elucim-player"]', 90, 120);
    await screenshotSection(page, 'vector-demo', 'p2-08-vectors-frame90.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tangent Line
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Tangent Line Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#tangent-demo');
  });

  test('frame 0 — tangent at left edge (steep negative slope)', async ({ page }) => {
    await screenshotSection(page, 'tangent-demo', 'p2-09-tangent-frame0.png');
  });

  test('frame 45 — tangent moving right, slope decreasing', async ({ page }) => {
    await seekToFrame(page, '#tangent-demo [data-testid="elucim-player"]', 45, 180);
    await screenshotSection(page, 'tangent-demo', 'p2-10-tangent-frame45.png');
  });

  test('frame 90 — tangent near origin (slope ≈ 0)', async ({ page }) => {
    await seekToFrame(page, '#tangent-demo [data-testid="elucim-player"]', 90, 180);
    await screenshotSection(page, 'tangent-demo', 'p2-11-tangent-frame90.png');
  });

  test('frame 135 — tangent on right side (positive slope)', async ({ page }) => {
    await seekToFrame(page, '#tangent-demo [data-testid="elucim-player"]', 135, 180);
    await screenshotSection(page, 'tangent-demo', 'p2-12-tangent-frame135.png');
  });

  test('frame 175 — tangent at far right (steep positive slope)', async ({ page }) => {
    await seekToFrame(page, '#tangent-demo [data-testid="elucim-player"]', 175, 180);
    await screenshotSection(page, 'tangent-demo', 'p2-13-tangent-frame175.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Matrix
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Matrix Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#matrix-demo');
  });

  test('frame 0 — matrix fading in', async ({ page }) => {
    await screenshotSection(page, 'matrix-demo', 'p2-14-matrix-frame0.png');
  });

  test('frame 30 — matrix visible', async ({ page }) => {
    await seekToFrame(page, '#matrix-demo [data-testid="elucim-player"]', 30, 90);
    await screenshotSection(page, 'matrix-demo', 'p2-15-matrix-frame30.png');
  });

  test('frame 60 — matrix with label', async ({ page }) => {
    await seekToFrame(page, '#matrix-demo [data-testid="elucim-player"]', 60, 90);
    await screenshotSection(page, 'matrix-demo', 'p2-16-matrix-frame60.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Graph
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Graph Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-demo');
  });

  test('frame 0 — graph fading in', async ({ page }) => {
    await screenshotSection(page, 'graph-demo', 'p2-17-graph-frame0.png');
  });

  test('frame 45 — graph fully visible', async ({ page }) => {
    await seekToFrame(page, '#graph-demo [data-testid="elucim-player"]', 45, 90);
    await screenshotSection(page, 'graph-demo', 'p2-18-graph-frame45.png');
  });

  test('frame 70 — graph with shortest path label', async ({ page }) => {
    await seekToFrame(page, '#graph-demo [data-testid="elucim-player"]', 70, 90);
    await screenshotSection(page, 'graph-demo', 'p2-19-graph-frame70.png');
  });
});
