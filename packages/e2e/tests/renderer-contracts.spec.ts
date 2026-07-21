import { expect, type Locator, type Page, test } from '@playwright/test';

async function visibleSection(page: Page, id: string): Promise<Locator> {
  const section = page.locator(`#${id}`);
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  return section;
}

test.describe('canonical demo renderer contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders normalized JSON documents for shape and math scenes', async ({ page }) => {
    const hello = await visibleSection(page, 'dsl-hello');
    await expect(hello.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(hello.locator('svg circle')).toHaveCount(1);
    await expect(hello.locator('svg text').filter({ hasText: 'Hello, Elucim!' })).toBeVisible();

    const math = await visibleSection(page, 'dsl-math');
    await expect(math.locator('[data-testid="dsl-root"]')).toBeVisible();
    expect(await math.locator('svg line').count()).toBeGreaterThan(10);
    await expect(math.locator('[data-testid="elucim-vector"]')).toBeVisible();
  });

  test('renders canonical JSX through the same DSL renderer', async ({ page }) => {
    const canonicalReact = await visibleSection(page, 'dsl-react-authoring');

    await expect(canonicalReact.locator('[data-testid="dsl-root"]')).toBeVisible();
    await expect(canonicalReact.locator('[data-testid="elucim-scene"]')).toBeVisible();
    await expect(canonicalReact.locator('[data-testid="elucim-text"]')).toHaveCount(2);
    await expect(canonicalReact.locator('[data-testid="elucim-rect"]')).toHaveCount(1);
  });

  test('keeps preset, theme, poster, and renderer-ref contracts on canonical documents', async ({ page }) => {
    const presets = await visibleSection(page, 'cutready-presets');
    await expect(presets.locator('[data-testid="preset-card"] [data-testid="dsl-root"]')).toBeVisible();

    const themes = await visibleSection(page, 'cutready-theme');
    const warmRoot = themes.locator('[data-testid="theme-warm"] [data-testid="dsl-root"]');
    await expect(warmRoot).toBeVisible();
    expect((await warmRoot.evaluate(el => getComputedStyle(el).getPropertyValue('--elucim-foreground'))).trim()).toBe('#ffeedd');

    const poster = await visibleSection(page, 'cutready-poster');
    await expect(poster.locator('[data-testid="poster-first"] [data-testid="elucim-scene"]')).toBeVisible();
    await expect(poster.locator('[data-testid="poster-last"] [data-testid="elucim-scene"]')).toBeVisible();

    const refDemo = await visibleSection(page, 'cutready-ref');
    await refDemo.locator('[data-testid="ref-seek"]').click();
    await expect(refDemo.locator('[data-testid="ref-output"]')).toContainText('Seeked to F45');
    await refDemo.locator('[data-testid="ref-info"]').click();
    await expect(refDemo.locator('[data-testid="ref-output"]')).toContainText('Total: 61');
  });
});
