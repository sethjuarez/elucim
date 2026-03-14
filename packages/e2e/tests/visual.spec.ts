import { test, expect, Page } from '@playwright/test';

/**
 * Helper: advance the player to a specific frame by clicking the scrub bar.
 * Uses proportional positioning to seek to the desired frame.
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
  // Wait for React to re-render
  await page.waitForTimeout(200);
}

/**
 * Helper: take a screenshot of a section by its id
 */
async function screenshotSection(page: Page, sectionId: string, filename: string) {
  const section = page.locator(`#${sectionId}`);
  await expect(section).toBeVisible();
  await section.screenshot({ path: `screenshots/${filename}` });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Scene & Player rendering
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Scene and Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="elucim-player"]');
  });

  test('full page renders at frame 0', async ({ page }) => {
    await page.screenshot({
      path: 'screenshots/01-full-page-frame0.png',
      fullPage: true,
    });
  });

  test('player controls are visible', async ({ page }) => {
    const controls = page.locator('[data-testid="elucim-controls"]').first();
    await expect(controls).toBeVisible();

    // Verify play button exists (renders SVG icon, not text)
    const playBtn = page.locator('[data-testid="elucim-play-btn"]').first();
    await expect(playBtn).toBeVisible();

    // Verify frame display
    const frameDisplay = page.locator('[data-testid="elucim-frame-display"]').first();
    await expect(frameDisplay).toContainText('F0');

    await controls.screenshot({ path: 'screenshots/02-player-controls.png' });
  });

  test('scrub bar handle visible', async ({ page }) => {
    const handle = page.locator('[data-testid="elucim-scrub-handle"]').first();
    await expect(handle).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: All Primitives composite scene
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('All Primitives Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#all-primitives');
  });

  test('frame 0 — empty scene before animations start', async ({ page }) => {
    await screenshotSection(page, 'all-primitives', '03-all-primitives-frame0.png');
  });

  test('frame 15 — circle drawing begins', async ({ page }) => {
    await seekToFrame(page, '#all-primitives [data-testid="elucim-player"]', 15, 180);
    await screenshotSection(page, 'all-primitives', '04-all-primitives-frame15.png');
  });

  test('frame 45 — circle + rect + line visible', async ({ page }) => {
    await seekToFrame(page, '#all-primitives [data-testid="elucim-player"]', 45, 180);
    await screenshotSection(page, 'all-primitives', '05-all-primitives-frame45.png');
  });

  test('frame 90 — All Primitives appearing', async ({ page }) => {
    await seekToFrame(page, '#all-primitives [data-testid="elucim-player"]', 90, 180);
    await screenshotSection(page, 'all-primitives', '06-all-primitives-frame90.png');
  });

  test('frame 120 — text visible', async ({ page }) => {
    await seekToFrame(page, '#all-primitives [data-testid="elucim-player"]', 120, 180);
    await screenshotSection(page, 'all-primitives', '07-all-primitives-frame120.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Individual primitive demos
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Circle Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#circle-demo');
  });

  test('frame 0 — circle invisible (draw not started)', async ({ page }) => {
    await screenshotSection(page, 'circle-demo', '08-circle-frame0.png');
  });

  test('frame 25 — circle half drawn', async ({ page }) => {
    await seekToFrame(page, '#circle-demo [data-testid="elucim-player"]', 25, 60);
    await screenshotSection(page, 'circle-demo', '09-circle-frame25.png');
  });

  test('frame 50 — circle fully drawn', async ({ page }) => {
    await seekToFrame(page, '#circle-demo [data-testid="elucim-player"]', 50, 60);
    await screenshotSection(page, 'circle-demo', '10-circle-frame50.png');
  });
});

test.describe('Line Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#line-demo');
  });

  test('frame 0 — line invisible', async ({ page }) => {
    await screenshotSection(page, 'line-demo', '11-line-frame0.png');
  });

  test('frame 25 — line half drawn', async ({ page }) => {
    await seekToFrame(page, '#line-demo [data-testid="elucim-player"]', 25, 60);
    await screenshotSection(page, 'line-demo', '12-line-frame25.png');
  });

  test('frame 55 — line fully drawn', async ({ page }) => {
    await seekToFrame(page, '#line-demo [data-testid="elucim-player"]', 55, 60);
    await screenshotSection(page, 'line-demo', '13-line-frame55.png');
  });
});

test.describe('Arrow Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#arrow-demo');
  });

  test('frame 0 — arrow invisible (fadeIn not started)', async ({ page }) => {
    await screenshotSection(page, 'arrow-demo', '14-arrow-frame0.png');
  });

  test('frame 15 — arrow half faded in', async ({ page }) => {
    await seekToFrame(page, '#arrow-demo [data-testid="elucim-player"]', 15, 60);
    await screenshotSection(page, 'arrow-demo', '15-arrow-frame15.png');
  });

  test('frame 40 — arrow fully visible', async ({ page }) => {
    await seekToFrame(page, '#arrow-demo [data-testid="elucim-player"]', 40, 60);
    await screenshotSection(page, 'arrow-demo', '16-arrow-frame40.png');
  });
});

test.describe('Rect Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#rect-demo');
  });

  test('frame 0 — rect invisible (draw not started)', async ({ page }) => {
    await screenshotSection(page, 'rect-demo', '17-rect-frame0.png');
  });

  test('frame 25 — rect half drawn', async ({ page }) => {
    await seekToFrame(page, '#rect-demo [data-testid="elucim-player"]', 25, 60);
    await screenshotSection(page, 'rect-demo', '18-rect-frame25.png');
  });

  test('frame 55 — rect fully drawn', async ({ page }) => {
    await seekToFrame(page, '#rect-demo [data-testid="elucim-player"]', 55, 60);
    await screenshotSection(page, 'rect-demo', '19-rect-frame55.png');
  });
});

test.describe('Text Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#text-demo');
  });

  test('frame 0 — text invisible (fadeIn not started)', async ({ page }) => {
    await screenshotSection(page, 'text-demo', '20-text-frame0.png');
  });

  test('frame 15 — text half faded in', async ({ page }) => {
    await seekToFrame(page, '#text-demo [data-testid="elucim-player"]', 15, 60);
    await screenshotSection(page, 'text-demo', '21-text-frame15.png');
  });

  test('frame 35 — text fully visible', async ({ page }) => {
    await seekToFrame(page, '#text-demo [data-testid="elucim-player"]', 35, 60);
    await screenshotSection(page, 'text-demo', '22-text-frame35.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Easing visualization
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Easing Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#easing-demo');
  });

  test('frame 0 — all dots at start position', async ({ page }) => {
    await screenshotSection(page, 'easing-demo', '23-easing-frame0.png');
  });

  test('frame 30 — dots diverging (different easing speeds)', async ({ page }) => {
    await seekToFrame(page, '#easing-demo [data-testid="elucim-player"]', 30, 120);
    await screenshotSection(page, 'easing-demo', '24-easing-frame30.png');
  });

  test('frame 60 — midpoint showing easing differences', async ({ page }) => {
    await seekToFrame(page, '#easing-demo [data-testid="elucim-player"]', 60, 120);
    await screenshotSection(page, 'easing-demo', '25-easing-frame60.png');
  });

  test('frame 100 — dots converging at end', async ({ page }) => {
    await seekToFrame(page, '#easing-demo [data-testid="elucim-player"]', 100, 120);
    await screenshotSection(page, 'easing-demo', '26-easing-frame100.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Sequence timing
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Sequence Timing Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#sequence-timing');
  });

  test('frame 0 — only first circle visible', async ({ page }) => {
    await screenshotSection(page, 'sequence-timing', '27-sequence-frame0.png');
  });

  test('frame 35 — first two circles visible', async ({ page }) => {
    await seekToFrame(page, '#sequence-timing [data-testid="elucim-player"]', 35, 180);
    await screenshotSection(page, 'sequence-timing', '28-sequence-frame35.png');
  });

  test('frame 90 — all three circles fully expanded', async ({ page }) => {
    await seekToFrame(page, '#sequence-timing [data-testid="elucim-player"]', 90, 180);
    await screenshotSection(page, 'sequence-timing', '29-sequence-frame90.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Interpolated transforms
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Transform Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#transform-demo');
  });

  test('frame 0 — rect at start position', async ({ page }) => {
    await screenshotSection(page, 'transform-demo', '30-transform-frame0.png');
  });

  test('frame 50 — rect mid-rotation, color shifting', async ({ page }) => {
    await seekToFrame(page, '#transform-demo [data-testid="elucim-player"]', 50, 150);
    await screenshotSection(page, 'transform-demo', '31-transform-frame50.png');
  });

  test('frame 100 — rect further along', async ({ page }) => {
    await seekToFrame(page, '#transform-demo [data-testid="elucim-player"]', 100, 150);
    await screenshotSection(page, 'transform-demo', '32-transform-frame100.png');
  });

  test('frame 145 — rect near end position, full rotation', async ({ page }) => {
    await seekToFrame(page, '#transform-demo [data-testid="elucim-player"]', 145, 150);
    await screenshotSection(page, 'transform-demo', '33-transform-frame145.png');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Player interactivity
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Player Interactivity', () => {
  test('play button toggles to pause', async ({ page }) => {
    await page.goto('/');
    const player = page.locator('[data-testid="elucim-player"]').first();
    await player.click(); // Focus the player

    const playBtn = player.locator('[data-testid="elucim-play-btn"]');
    await expect(playBtn).toBeVisible();

    // Click play — button should contain a pause SVG icon
    await playBtn.click();
    await page.waitForTimeout(200);

    // Click pause
    await playBtn.click();
    await page.waitForTimeout(100);

    // Frame should have advanced
    const frameDisplay = player.locator('[data-testid="elucim-frame-display"]');
    const text = await frameDisplay.textContent();
    expect(text).not.toContain('F0');

    await player.screenshot({ path: 'screenshots/34-player-after-play-pause.png' });
  });

  test('clicking scrub bar seeks to position', async ({ page }) => {
    await page.goto('/');
    const player = page.locator('[data-testid="elucim-player"]').first();
    const scrubbar = player.locator('[data-testid="elucim-scrubbar"]');

    // Click at ~50% of scrub bar
    const box = await scrubbar.boundingBox();
    if (!box) throw new Error('Scrubbar not found');
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.waitForTimeout(100);

    // Frame should be approximately halfway
    const frameDisplay = player.locator('[data-testid="elucim-frame-display"]');
    const text = await frameDisplay.textContent();
    // Check that frame is not 0 (we seeked)
    expect(text).not.toContain('F0');

    await player.screenshot({ path: 'screenshots/35-player-after-scrub-50pct.png' });
  });
});
