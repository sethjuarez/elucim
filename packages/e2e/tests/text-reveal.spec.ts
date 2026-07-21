import { expect, test } from '@playwright/test';

test.describe('text reveal', () => {
  test('resolves canonical timeline reveal effects and removes the cursor when playback completes', async ({ page }) => {
    await page.goto('/');

    const demo = page.locator('#cutready-ref');
    const text = demo.getByTestId('elucim-text');
    const cursor = demo.getByTestId('elucim-text-cursor');

    await expect(text).toHaveText('');
    await expect(cursor).toHaveText('|');

    await demo.getByTestId('ref-seek').click();
    await expect(text).not.toHaveText('');
    await expect(cursor).toHaveText('|');

    await demo.getByTestId('ref-play').click();
    await expect(text).toHaveText('Hello, Elucim!');
    await expect(cursor).toHaveCount(0);
  });
});
