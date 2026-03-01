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
// FadeIn / FadeOut
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Fade Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#fade-demo');
  });

  test('frame 0 — FadeIn starting (circle barely visible)', async ({ page }) => {
    await screenshotSection(page, 'fade-demo', 'p3-01-fade-frame0.png');
  });

  test('frame 30 — FadeIn midway', async ({ page }) => {
    await seekToFrame(page, '#fade-demo [data-testid="elucim-player"]', 30, 120);
    await screenshotSection(page, 'fade-demo', 'p3-02-fade-frame30.png');
  });

  test('frame 55 — FadeIn complete, before FadeOut starts', async ({ page }) => {
    await seekToFrame(page, '#fade-demo [data-testid="elucim-player"]', 55, 120);
    await screenshotSection(page, 'fade-demo', 'p3-03-fade-frame55.png');
  });

  test('frame 80 — FadeOut in progress', async ({ page }) => {
    await seekToFrame(page, '#fade-demo [data-testid="elucim-player"]', 80, 120);
    await screenshotSection(page, 'fade-demo', 'p3-04-fade-frame80.png');
  });

  test('frame 115 — FadeOut nearly complete', async ({ page }) => {
    await seekToFrame(page, '#fade-demo [data-testid="elucim-player"]', 115, 120);
    await screenshotSection(page, 'fade-demo', 'p3-05-fade-frame115.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Write Animation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Write Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#write-demo');
  });

  test('frame 0 — text invisible', async ({ page }) => {
    await screenshotSection(page, 'write-demo', 'p3-06-write-frame0.png');
  });

  test('frame 25 — text partially written', async ({ page }) => {
    await seekToFrame(page, '#write-demo [data-testid="elucim-player"]', 25, 90);
    await screenshotSection(page, 'write-demo', 'p3-07-write-frame25.png');
  });

  test('frame 60 — text fully written', async ({ page }) => {
    await seekToFrame(page, '#write-demo [data-testid="elucim-player"]', 60, 90);
    await screenshotSection(page, 'write-demo', 'p3-08-write-frame60.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Transform Animation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Transform Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#transform-anim-demo');
  });

  test('frame 0 — small rect at start position', async ({ page }) => {
    await screenshotSection(page, 'transform-anim-demo', 'p3-09-transform-frame0.png');
  });

  test('frame 40 — rect mid-journey, rotating', async ({ page }) => {
    await seekToFrame(page, '#transform-anim-demo [data-testid="elucim-player"]', 40, 120);
    await screenshotSection(page, 'transform-anim-demo', 'p3-10-transform-frame40.png');
  });

  test('frame 80 — rect approaching end, larger', async ({ page }) => {
    await seekToFrame(page, '#transform-anim-demo [data-testid="elucim-player"]', 80, 120);
    await screenshotSection(page, 'transform-anim-demo', 'p3-11-transform-frame80.png');
  });

  test('frame 115 — rect at end position, full size', async ({ page }) => {
    await seekToFrame(page, '#transform-anim-demo [data-testid="elucim-player"]', 115, 120);
    await screenshotSection(page, 'transform-anim-demo', 'p3-12-transform-frame115.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stagger Animation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Stagger Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#stagger-demo');
  });

  test('frame 0 — first circle appearing', async ({ page }) => {
    await screenshotSection(page, 'stagger-demo', 'p3-13-stagger-frame0.png');
  });

  test('frame 30 — first few circles visible', async ({ page }) => {
    await seekToFrame(page, '#stagger-demo [data-testid="elucim-player"]', 30, 120);
    await screenshotSection(page, 'stagger-demo', 'p3-14-stagger-frame30.png');
  });

  test('frame 60 — most circles visible, stagger pattern clear', async ({ page }) => {
    await seekToFrame(page, '#stagger-demo [data-testid="elucim-player"]', 60, 120);
    await screenshotSection(page, 'stagger-demo', 'p3-15-stagger-frame60.png');
  });

  test('frame 100 — all circles fully visible', async ({ page }) => {
    await seekToFrame(page, '#stagger-demo [data-testid="elucim-player"]', 100, 120);
    await screenshotSection(page, 'stagger-demo', 'p3-16-stagger-frame100.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Morph Animation
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Morph Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#morph-demo');
  });

  test('frame 0 — initial red color, small scale', async ({ page }) => {
    await screenshotSection(page, 'morph-demo', 'p3-17-morph-frame0.png');
  });

  test('frame 50 — color transitioning, scale increasing', async ({ page }) => {
    await seekToFrame(page, '#morph-demo [data-testid="elucim-player"]', 50, 120);
    await screenshotSection(page, 'morph-demo', 'p3-18-morph-frame50.png');
  });

  test('frame 100 — teal color, larger scale', async ({ page }) => {
    await seekToFrame(page, '#morph-demo [data-testid="elucim-player"]', 100, 120);
    await screenshotSection(page, 'morph-demo', 'p3-19-morph-frame100.png');
  });
});
