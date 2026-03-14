import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3100';

test.describe('CutReady Integration — Scene Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#cutready-presets').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('card preset renders at 640×360 aspect ratio', async ({ page }) => {
    const card = page.locator('[data-testid="preset-card"]');
    await expect(card.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(card).toHaveScreenshot('preset-card.png', { maxDiffPixels: 200 });
  });

  test('slide preset renders at 1280×720 aspect ratio', async ({ page }) => {
    const slide = page.locator('[data-testid="preset-slide"]');
    await expect(slide.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(slide).toHaveScreenshot('preset-slide.png', { maxDiffPixels: 200 });
  });

  test('square preset renders at 600×600 aspect ratio', async ({ page }) => {
    const square = page.locator('[data-testid="preset-square"]');
    await expect(square.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(square).toHaveScreenshot('preset-square.png', { maxDiffPixels: 200 });
  });

  test('all three presets visible side-by-side', async ({ page }) => {
    const section = page.locator('#cutready-presets');
    await expect(section).toHaveScreenshot('presets-all.png', { maxDiffPixels: 300 });
  });
});

test.describe('CutReady Integration — Theme Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#cutready-theme').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('default theme renders normally', async ({ page }) => {
    const def = page.locator('[data-testid="theme-default"]');
    await expect(def.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(def).toHaveScreenshot('theme-default.png', { maxDiffPixels: 200 });
  });

  test('warm theme injects CSS custom properties', async ({ page }) => {
    const warm = page.locator('[data-testid="theme-warm"]');
    const root = warm.locator('[data-testid="dsl-root"]');
    await expect(root).toBeVisible();
    // Verify CSS vars are set
    const fgVar = await root.evaluate(el => getComputedStyle(el).getPropertyValue('--elucim-foreground'));
    expect(fgVar.trim()).toBe('#ffeedd');
    await expect(warm).toHaveScreenshot('theme-warm.png', { maxDiffPixels: 200 });
  });

  test('cool theme injects CSS custom properties', async ({ page }) => {
    const cool = page.locator('[data-testid="theme-cool"]');
    const root = cool.locator('[data-testid="dsl-root"]');
    await expect(root).toBeVisible();
    const accentVar = await root.evaluate(el => getComputedStyle(el).getPropertyValue('--elucim-accent'));
    expect(accentVar.trim()).toBe('#00bfff');
    await expect(cool).toHaveScreenshot('theme-cool.png', { maxDiffPixels: 200 });
  });

  test('all themes side-by-side', async ({ page }) => {
    const section = page.locator('#cutready-theme');
    await expect(section).toHaveScreenshot('themes-all.png', { maxDiffPixels: 300 });
  });
});

test.describe('CutReady Integration — Poster Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#cutready-poster').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('poster="first" renders a static scene (no controls)', async ({ page }) => {
    const first = page.locator('[data-testid="poster-first"]');
    await expect(first.locator('[data-testid="elucim-scene"]')).toBeVisible();
    // No controls should exist — it's a static scene, not a player
    await expect(first.locator('[data-testid="elucim-controls"]')).toHaveCount(0);
    await expect(first).toHaveScreenshot('poster-first.png', { maxDiffPixels: 200 });
  });

  test('poster="last" renders a static scene (no controls)', async ({ page }) => {
    const last = page.locator('[data-testid="poster-last"]');
    await expect(last.locator('[data-testid="elucim-scene"]')).toBeVisible();
    await expect(last.locator('[data-testid="elucim-controls"]')).toHaveCount(0);
    await expect(last).toHaveScreenshot('poster-last.png', { maxDiffPixels: 200 });
  });

  test('poster=45 renders a static scene', async ({ page }) => {
    const mid = page.locator('[data-testid="poster-frame45"]');
    await expect(mid.locator('[data-testid="elucim-scene"]')).toBeVisible();
    await expect(mid.locator('[data-testid="elucim-controls"]')).toHaveCount(0);
    await expect(mid).toHaveScreenshot('poster-frame45.png', { maxDiffPixels: 200 });
  });

  test('all poster modes side-by-side', async ({ page }) => {
    const section = page.locator('#cutready-poster');
    await expect(section).toHaveScreenshot('poster-all.png', { maxDiffPixels: 300 });
  });
});

test.describe('CutReady Integration — Enhanced Error Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#cutready-errors').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('shows grouped validation errors', async ({ page }) => {
    const errDiv = page.locator('[data-testid="rich-errors"] [data-testid="dsl-error"]');
    await expect(errDiv).toBeVisible();
    // Should contain collapsible details sections
    const details = errDiv.locator('details');
    expect(await details.count()).toBeGreaterThan(0);
    await expect(errDiv).toHaveScreenshot('errors-grouped.png', { maxDiffPixels: 200 });
  });

  test('error display contains "Raw JSON" collapsible', async ({ page }) => {
    const errDiv = page.locator('[data-testid="rich-errors"] [data-testid="dsl-error"]');
    const rawJson = errDiv.locator('details:has(summary:text("Raw JSON"))');
    await expect(rawJson).toBeVisible();
  });

  test('error messages include path highlighting', async ({ page }) => {
    const errDiv = page.locator('[data-testid="rich-errors"] [data-testid="dsl-error"]');
    const codes = errDiv.locator('code');
    expect(await codes.count()).toBeGreaterThan(0);
  });
});

test.describe('CutReady Integration — DslRendererRef', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.locator('#cutready-ref').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('ref demo renders player with control buttons', async ({ page }) => {
    const refDemo = page.locator('[data-testid="ref-demo"]');
    await expect(refDemo.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(refDemo.locator('[data-testid="ref-controls"]')).toBeVisible();
    await expect(refDemo).toHaveScreenshot('ref-demo-initial.png', { maxDiffPixels: 200 });
  });

  test('Get Info button returns SVG element info', async ({ page }) => {
    const refDemo = page.locator('[data-testid="ref-demo"]');
    await refDemo.locator('[data-testid="ref-info"]').click();
    await page.waitForTimeout(100);
    const output = refDemo.locator('[data-testid="ref-output"]');
    const text = await output.textContent();
    expect(text).toContain('Total: 120');
    expect(text).toContain('SVG: svg');
  });

  test('Play/Pause buttons toggle playback', async ({ page }) => {
    const refDemo = page.locator('[data-testid="ref-demo"]');

    // Click Play
    await refDemo.locator('[data-testid="ref-play"]').click();
    await page.waitForTimeout(100);
    let output = await refDemo.locator('[data-testid="ref-output"]').textContent();
    expect(output).toContain('Playing');

    // Click Pause
    await refDemo.locator('[data-testid="ref-pause"]').click();
    await page.waitForTimeout(100);
    output = await refDemo.locator('[data-testid="ref-output"]').textContent();
    expect(output).toContain('Paused');
  });

  test('Seek button navigates to frame 60', async ({ page }) => {
    const refDemo = page.locator('[data-testid="ref-demo"]');
    await refDemo.locator('[data-testid="ref-seek"]').click();
    await page.waitForTimeout(100);
    const output = await refDemo.locator('[data-testid="ref-output"]').textContent();
    expect(output).toContain('Seeked to F60');
    await expect(refDemo).toHaveScreenshot('ref-after-seek.png', { maxDiffPixels: 300 });
  });

  test('Get Info after Play shows playing=true', async ({ page }) => {
    const refDemo = page.locator('[data-testid="ref-demo"]');
    await refDemo.locator('[data-testid="ref-play"]').click();
    await page.waitForTimeout(200);
    await refDemo.locator('[data-testid="ref-info"]').click();
    await page.waitForTimeout(100);
    const output = await refDemo.locator('[data-testid="ref-output"]').textContent();
    expect(output).toContain('Playing: true');
  });
});
