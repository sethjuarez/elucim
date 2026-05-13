import { expect, type Locator, type Page, test } from '@playwright/test';

const EDITOR_URL = '/editor.html';

async function openEditor(page: Page, query = '') {
  await page.goto(`${EDITOR_URL}${query}`);
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
}

async function opacity(locator: Locator) {
  return Number(await locator.getAttribute('opacity'));
}

test.describe('core editor workflows', () => {
  test('places an Object onto the canvas and exposes it in Objects', async ({ page }) => {
    await openEditor(page);
    const objects = page.getByRole('treeitem');
    const initialCount = await objects.count();

    await page.getByRole('tab', { name: 'Create' }).click();
    await page.getByTitle('Rectangle').click();
    await page.getByRole('tab', { name: 'Objects' }).click();

    await expect.poll(() => objects.count()).toBe(initialCount + 1);
    await expect(page.getByRole('treeitem').filter({ hasText: /^rect-\d+/ }).first()).toBeVisible();
    await expect(page.locator('[data-editor-id^="rect-"]').first()).toBeVisible();
  });

  test('previews animations embedded in the state machine', async ({ page }) => {
    await openEditor(page);
    await page.getByRole('tab', { name: 'State machines motion tab' }).click();
    await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();

    const introRect = page.locator('[data-measure-id="rect-1"] [data-testid="elucim-rect"]').first();
    const focusText = page.locator('[data-measure-id="text-1"] text').first();
    expect(await opacity(introRect)).toBeGreaterThan(0.99);

    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Previewing idle/)).toBeVisible();
    await expect.poll(() => opacity(introRect), { timeout: 2000 }).toBeLessThan(0.3);
    await expect(page.getByText(/Previewing focus via complete from idle/)).toBeVisible({ timeout: 6000 });
    await expect.poll(() => opacity(focusText), { timeout: 3000 }).toBeGreaterThan(0.35);
  });

  test('applies editor chrome tokens from the light theme', async ({ page }) => {
    await openEditor(page, '?theme=light');

    const tokens = await page.locator('.elucim-editor').evaluate(element => {
      const styles = getComputedStyle(element);
      return {
        bg: styles.getPropertyValue('--elucim-editor-bg').trim(),
        fg: styles.getPropertyValue('--elucim-editor-fg').trim(),
        shadow: styles.getPropertyValue('--elucim-editor-shadow-canvas').trim(),
        colorScheme: styles.colorScheme,
      };
    });

    expect(tokens.bg).toBe('#f1f5f9');
    expect(tokens.fg).toBe('#1e293b');
    expect(tokens.shadow).toContain('rgba(0,0,0,0.15)');
    expect(tokens.colorScheme).toBe('light');
  });
});
