import { expect, type Locator, type Page, test } from '@playwright/test';

async function visibleSection(page: Page, id: string): Promise<Locator> {
  const section = page.locator(`#${id}`);
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  return section;
}

async function seekToFrame(page: Page, sectionId: string, frame: number, totalFrames: number) {
  const scrubbar = page.locator(`#${sectionId} [data-testid="elucim-scrubbar"]`);
  await scrubbar.scrollIntoViewIfNeeded();
  await scrubbar.waitFor({ state: 'visible' });
  const box = await scrubbar.boundingBox();
  if (!box) throw new Error(`Scrubbar not found for ${sectionId}`);
  await page.mouse.click(box.x + (frame / (totalFrames - 1)) * box.width, box.y + box.height / 2);
}

test.describe('demo renderer contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders core primitives and player controls without relying on screenshots', async ({ page }) => {
    const section = await visibleSection(page, 'all-primitives');
    await expect(section.locator('[data-testid="elucim-player"]')).toBeVisible();
    await expect(section.locator('[data-testid="elucim-controls"]')).toBeVisible();
    await expect(section.locator('[data-testid="elucim-frame-display"]')).toContainText('F0');

    await seekToFrame(page, 'all-primitives', 120, 180);
    await expect(section.locator('[data-testid="elucim-frame-display"]')).toContainText('F120');
    expect(await section.locator('svg *').count()).toBeGreaterThan(0);
    await expect(section.locator('svg text').filter({ hasText: 'Elucim Primitives' })).toBeVisible();
  });

  test('renders math and advanced primitive demos with measurable SVG output', async ({ page }) => {
    const latex = await visibleSection(page, 'latex-demo');
    await seekToFrame(page, 'latex-demo', 140, 150);
    await expect(latex.locator('.katex').first()).toBeVisible();
    expect(await latex.locator('.katex').count()).toBeGreaterThanOrEqual(4);

    const vectorField = await visibleSection(page, 'vector-field-demo');
    await seekToFrame(page, 'vector-field-demo', 60, 90);
    expect(await vectorField.locator('svg line').count()).toBeGreaterThan(10);

    const polygon = await visibleSection(page, 'polygon-demo');
    await seekToFrame(page, 'polygon-demo', 100, 120);
    expect(await polygon.locator('svg polygon').count()).toBeGreaterThanOrEqual(2);
  });

  test('renders Elucim Document examples and validation errors', async ({ page }) => {
    const hello = await visibleSection(page, 'dsl-hello');
    await expect(hello.locator('[data-testid="dsl-root"]')).toBeVisible();
    expect(await hello.locator('svg circle').count()).toBeGreaterThan(0);

    const math = await visibleSection(page, 'dsl-math');
    await expect(math.locator('[data-testid="dsl-root"]')).toBeVisible();
    expect(await math.locator('svg line').count()).toBeGreaterThan(0);

    const animated = await visibleSection(page, 'dsl-animated');
    await expect(animated.locator('[data-testid="dsl-root"]')).toBeVisible();
    expect(await animated.locator('svg circle, svg rect, svg g').count()).toBeGreaterThan(0);

    const error = await visibleSection(page, 'dsl-error');
    await expect(error.locator('[data-testid="dsl-error"]')).toContainText('Validation Errors');
    await expect(error.locator('[data-testid="dsl-error"]')).toContainText('Element type is required');
  });

  test('keeps preset, theme, poster, and ref integration contracts', async ({ page }) => {
    const presets = await visibleSection(page, 'cutready-presets');
    await expect(presets.locator('[data-testid="preset-card"] [data-testid="dsl-root"]')).toBeVisible();
    await expect(presets.locator('[data-testid="preset-slide"] [data-testid="dsl-root"]')).toBeVisible();
    await expect(presets.locator('[data-testid="preset-square"] [data-testid="dsl-root"]')).toBeVisible();

    const themes = await visibleSection(page, 'cutready-theme');
    const warmRoot = themes.locator('[data-testid="theme-warm"] [data-testid="dsl-root"]');
    await expect(warmRoot).toBeVisible();
    expect((await warmRoot.evaluate(el => getComputedStyle(el).getPropertyValue('--elucim-foreground'))).trim()).toBe('#ffeedd');

    const poster = await visibleSection(page, 'cutready-poster');
    await expect(poster.locator('[data-testid="poster-first"] [data-testid="elucim-scene"]')).toBeVisible();
    await expect(poster.locator('[data-testid="poster-last"] [data-testid="elucim-scene"]')).toBeVisible();
    await expect(poster.locator('[data-testid="poster-frame45"] [data-testid="elucim-scene"]')).toBeVisible();

    const refDemo = await visibleSection(page, 'cutready-ref');
    await refDemo.locator('[data-testid="ref-seek"]').click();
    await expect(refDemo.locator('[data-testid="ref-output"]')).toContainText('Seeked to F60');
    await refDemo.locator('[data-testid="ref-info"]').click();
    await expect(refDemo.locator('[data-testid="ref-output"]')).toContainText('SVG: svg');
  });

  test('supports presentation navigation, notes, and HUD state', async ({ page }) => {
    const presentation = await visibleSection(page, 'presentation-demo');
    const hud = presentation.locator('[data-testid="elucim-presentation-hud"]');
    const next = presentation.locator('[data-testid="elucim-next-btn"]');

    await expect(hud).toContainText('1 / 5');
    await expect(hud).toContainText('Welcome');
    await expect(presentation.locator('[data-testid="elucim-presenter-notes"]')).toContainText('Introduce Elucim and its purpose');

    await next.click();
    await expect(hud).toContainText('2 / 5');
    await expect(hud).toContainText('The Unit Circle');
    await expect(presentation.locator('[data-testid="elucim-presenter-notes"]')).toContainText('sine, cosine and the unit circle');
  });
});
