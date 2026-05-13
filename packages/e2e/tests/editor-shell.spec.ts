import { expect, type Page, test } from '@playwright/test';

const EDITOR_URL = '/editor.html';

async function openEditor(page: Page) {
  await page.goto(EDITOR_URL);
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
}

test.describe('editor shell', () => {
  test('keeps extracted chrome, panels, and workspace surfaces wired together', async ({ page }) => {
    await openEditor(page);

    await expect(page.getByText('Scene editor')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Left editor panel' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Objects' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.elucim-editor-canvas')).toBeVisible();

    await page.getByRole('tab', { name: 'Create' }).click();
    await expect(page.getByRole('tab', { name: 'Create' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTitle('Rectangle')).toBeVisible();

    await page.getByRole('button', { name: 'Hide Left panel' }).click();
    await expect(page.getByRole('tab', { name: 'Objects' })).not.toBeVisible();
    await page.getByRole('button', { name: /^Show left panel$/i }).first().click();
    await expect(page.getByRole('tab', { name: 'Objects' })).toBeVisible();

    await page.getByRole('button', { name: /^Show inspector$/i }).first().click();
    await expect(page.locator('.elucim-editor-inspector')).toBeVisible();
    await page.getByRole('button', { name: /^Hide inspector$/i }).click();
    await expect(page.locator('.elucim-editor-inspector')).not.toBeVisible();
    await page.getByRole('button', { name: /^Show inspector$/i }).first().click();
    await expect(page.locator('.elucim-editor-inspector')).toBeVisible();

    await page.getByRole('tab', { name: 'Animations motion tab' }).click();
    await expect(page.getByRole('tab', { name: 'Animations motion tab' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'State machines motion tab' }).click();
    await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'State machines motion tab' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Hide Timeline' }).click();
    await expect(page.getByLabel('State machine graph walkthrough')).not.toBeVisible();
    await page.getByRole('button', { name: /^Show timeline$/i }).first().click();
    await page.getByRole('tab', { name: 'State machines motion tab' }).click();
    await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();

    await page.getByRole('tab', { name: 'Polish' }).click();
    await expect(page.getByRole('tab', { name: 'Polish' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/Polish is for scene metadata/)).toBeVisible();
    await expect(page.getByLabel('Document intent')).toBeVisible();
  });

  test('toggles top bar panels without duplicate canvas panel controls', async ({ page }) => {
    await openEditor(page);

    await expect(page.getByRole('button', { name: 'Hide left panel' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Hide timeline' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Show Inspector' })).toHaveCount(1);
    await expect(page.locator('.elucim-editor-canvas').getByRole('button', { name: /panel|timeline|inspector/i })).toHaveCount(0);

    await page.getByRole('button', { name: 'Hide left panel' }).click();
    await expect(page.getByRole('tablist', { name: 'Left editor panel' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Show left panel' })).toHaveCount(1);
    await expect(page.locator('.elucim-editor-canvas').getByRole('button', { name: /panel|timeline|inspector/i })).toHaveCount(0);

    await page.getByRole('button', { name: 'Hide Timeline' }).click();
    await expect(page.getByRole('tab', { name: 'Animations motion tab' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Show timeline' })).toHaveCount(1);

    await page.getByRole('button', { name: 'Show Inspector' }).click();
    await expect(page.locator('.elucim-editor-inspector')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Inspector' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Hide Inspector' }).click();
    await expect(page.locator('.elucim-editor-inspector')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Inspector' })).toHaveCount(1);
  });

  test('reaches left panel tabs and applies Polish nudge feedback', async ({ page }) => {
    await openEditor(page);

    await page.getByRole('tab', { name: 'Objects' }).click();
    await expect(page.getByRole('tab', { name: 'Objects' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('treeitem').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Create' }).click();
    await expect(page.getByRole('tab', { name: 'Create' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTitle('Rectangle')).toBeVisible();

    await page.getByRole('tab', { name: 'Polish' }).click();
    await expect(page.getByRole('tab', { name: 'Polish' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Polish suggestions')).toBeVisible();
    await expect(page.getByText('What will change').first()).toBeVisible();
    await expect(page.getByText('Impact:').first()).toBeVisible();
    await expect(page.getByText('Review level:').first()).toBeVisible();

    await page.getByRole('button', { name: 'Apply nudge Mark document as refined' }).click();

    await expect(page.getByText('Applied Mark document as refined')).toBeVisible();
    await expect(page.getByText('Result is visible in Scene metadata.')).toBeVisible();
    await expect(page.getByText(/Safe · 1 change/)).toBeVisible();
    await expect(page.getByText('Matched preview: Updated document metadata.')).toBeVisible();
    await expect(page.getByLabel('Polish level')).toHaveValue('refined');
    await expect(page.getByRole('button', { name: 'Apply nudge Mark document as refined' })).not.toBeVisible();
  });
});
