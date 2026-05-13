import { expect, type Page, test } from '@playwright/test';

const EDITOR_URL = '/editor.html';

async function openEditor(page: Page) {
  await page.goto(EDITOR_URL);
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
}

async function expectWorkspaceSelected(page: Page, name: string) {
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
}

test.describe('editor shell', () => {
  test('keeps extracted chrome, panels, and workspace surfaces wired together', async ({ page }) => {
    await openEditor(page);

    await expect(page.getByText('Scene editor')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Editor workspace' })).toBeVisible();
    await page.getByRole('tab', { name: 'Design workspace' }).click();
    await expectWorkspaceSelected(page, 'Design workspace');
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

    await page.getByRole('button', { name: 'Hide Inspector' }).click();
    await expect(page.locator('.elucim-editor-inspector')).not.toBeVisible();
    await page.getByRole('button', { name: /^Show inspector$/i }).first().click();
    await expect(page.locator('.elucim-editor-inspector')).toBeVisible();

    await page.getByRole('tab', { name: 'Animate workspace' }).click();
    await expectWorkspaceSelected(page, 'Animate workspace');
    await expect(page.getByRole('tab', { name: 'Animations motion tab' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'State Machine workspace' }).click();
    await expectWorkspaceSelected(page, 'State Machine workspace');
    await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'State machines motion tab' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Hide Timeline' }).click();
    await expect(page.getByLabel('State machine graph walkthrough')).not.toBeVisible();
    await page.getByRole('button', { name: /^Show timeline$/i }).first().click();
    await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();

    await page.getByRole('tab', { name: 'Polish workspace' }).click();
    await expectWorkspaceSelected(page, 'Polish workspace');
    await expect(page.getByText(/Polish is for scene metadata/)).toBeVisible();
    await expect(page.getByLabel('Document intent')).toBeVisible();
  });
});
