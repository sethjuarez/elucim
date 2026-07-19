import { expect, test } from '@playwright/test';

test.describe('text reveal', () => {
  test('reveals centered text and removes its cursor when playback completes', async ({ page }) => {
    await page.goto('/');

    const demo = page.locator('#text-demo');
    const player = demo.getByTestId('elucim-player');
    const text = player.getByTestId('elucim-text');
    const cursor = player.getByTestId('elucim-text-cursor');

    await expect(text).toHaveText('');
    await expect(cursor).toHaveText('|');

    const stepForward = player.getByTitle('Step forward');
    for (let frame = 0; frame < 12; frame += 1) {
      await stepForward.click();
    }
    await expect(text).toHaveText('Hello ');
    await expect(cursor).toHaveText('|');

    for (let frame = 0; frame < 12; frame += 1) {
      await stepForward.click();
    }
    await expect(text).toHaveText('Hello Elucim');
    await expect(cursor).toHaveCount(0);
  });
});
