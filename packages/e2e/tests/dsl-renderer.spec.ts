import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3100';

test.describe('DSL Renderer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(500);
  });

  test('hello circle DSL — renders Player with SVG', async ({ page }) => {
    const section = page.locator('#dsl-hello');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const dslRoot = section.locator('[data-testid="dsl-root"]');
    await expect(dslRoot).toBeVisible();
    const svg = section.locator('svg').first();
    await expect(svg).toBeVisible();
    await expect(section).toHaveScreenshot('dsl-hello-render.png', { maxDiffPixels: 200 });
  });

  test('hello circle DSL — contains circle element', async ({ page }) => {
    const section = page.locator('#dsl-hello');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const circles = section.locator('svg circle');
    const count = await circles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('math demo DSL — renders with axes lines', async ({ page }) => {
    const section = page.locator('#dsl-math');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const dslRoot = section.locator('[data-testid="dsl-root"]');
    await expect(dslRoot).toBeVisible();
    // Axes should render axis lines
    const lines = section.locator('svg line');
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
    await expect(section).toHaveScreenshot('dsl-math-render.png', { maxDiffPixels: 200 });
  });

  test('math demo DSL — SVG has content rendered', async ({ page }) => {
    const section = page.locator('#dsl-math');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // The SVG should have at least one child element (axes at minimum)
    const allSvgElements = section.locator('svg *');
    const count = await allSvgElements.count();
    expect(count).toBeGreaterThan(5); // axes alone renders many lines/text
  });

  test('animated scene DSL — renders stagger circles', async ({ page }) => {
    const section = page.locator('#dsl-animated');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const dslRoot = section.locator('[data-testid="dsl-root"]');
    await expect(dslRoot).toBeVisible();
    // Should have 6 stagger circles + 1 transform rect
    const circles = section.locator('svg circle');
    const count = await circles.count();
    expect(count).toBeGreaterThanOrEqual(6);
    await expect(section).toHaveScreenshot('dsl-animated-render.png', { maxDiffPixels: 200 });
  });

  test('animated scene DSL — contains SVG elements', async ({ page }) => {
    const section = page.locator('#dsl-animated');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    // Should contain circles from the stagger and g groups from transform
    const svgElements = section.locator('svg circle, svg rect, svg g');
    const count = await svgElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('error handling DSL — shows validation errors', async ({ page }) => {
    const section = page.locator('#dsl-error');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const errorDiv = section.locator('[data-testid="dsl-error"]');
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toContainText('Validation Errors');
    await expect(errorDiv).toContainText('durationInFrames');
    await expect(section).toHaveScreenshot('dsl-error-state.png', { maxDiffPixels: 100 });
  });

  test('error handling DSL — shows unknown type error', async ({ page }) => {
    const section = page.locator('#dsl-error');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const errorDiv = section.locator('[data-testid="dsl-error"]');
    await expect(errorDiv).toContainText('banana');
  });

  test('DSL renderer wraps valid content in dsl-root', async ({ page }) => {
    const section = page.locator('#dsl-hello');
    await section.scrollIntoViewIfNeeded();
    const root = section.locator('[data-testid="dsl-root"]');
    await expect(root).toBeVisible();
  });

  test('all three DSL demos render without errors', async ({ page }) => {
    for (const id of ['dsl-hello', 'dsl-math', 'dsl-animated']) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      // Should have dsl-root (not dsl-error)
      const root = section.locator('[data-testid="dsl-root"]');
      await expect(root).toBeVisible();
      const error = section.locator('[data-testid="dsl-error"]');
      await expect(error).toHaveCount(0);
    }
  });
});
