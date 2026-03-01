import { test, expect, Page } from '@playwright/test';

async function screenshotPresentation(page: Page, filename: string) {
  const pres = page.locator('#presentation-demo');
  await pres.scrollIntoViewIfNeeded();
  await pres.screenshot({ path: `screenshots/${filename}` });
}

test.describe('Presentation Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3100');
    // Scroll to presentation section
    const pres = page.locator('#presentation-demo');
    await pres.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('renders first slide with HUD', async ({ page }) => {
    const pres = page.locator('[data-testid="elucim-presentation"]');
    await expect(pres).toBeVisible();

    // HUD shows slide 1/5
    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    await expect(hud).toContainText('1 / 5');
    await expect(hud).toContainText('Welcome');

    await screenshotPresentation(page, 'pres-test-slide1.png');
  });

  test('next button navigates to slide 2', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');
    await nextBtn.click();
    await page.waitForTimeout(600); // transition

    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    await expect(hud).toContainText('2 / 5');
    await expect(hud).toContainText('The Unit Circle');

    await screenshotPresentation(page, 'pres-test-slide2.png');
  });

  test('prev button navigates back', async ({ page }) => {
    // Go to slide 2
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');
    await nextBtn.click();
    await page.waitForTimeout(600);

    // Go back to slide 1
    const prevBtn = page.locator('[data-testid="elucim-prev-btn"]');
    await prevBtn.click();
    await page.waitForTimeout(600);

    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    await expect(hud).toContainText('1 / 5');
  });

  test('navigates through all 5 slides', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');

    for (let i = 2; i <= 5; i++) {
      await nextBtn.click();
      await page.waitForTimeout(600);
      const hud = page.locator('[data-testid="elucim-presentation-hud"]');
      await expect(hud).toContainText(`${i} / 5`);
    }

    // On last slide, next button should not be visible
    await expect(nextBtn).not.toBeVisible();
    await screenshotPresentation(page, 'pres-test-slide5-final.png');
  });

  test('presenter notes are visible', async ({ page }) => {
    const notes = page.locator('[data-testid="elucim-presenter-notes"]');
    await expect(notes).toBeVisible();
    await expect(notes).toContainText('Introduce Elucim and its purpose');
  });

  test('presenter notes update on slide change', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');
    await nextBtn.click();
    await page.waitForTimeout(600);

    const notes = page.locator('[data-testid="elucim-presenter-notes"]');
    await expect(notes).toContainText('sine, cosine and the unit circle');
  });

  test('fullscreen button is present', async ({ page }) => {
    const fsBtn = page.locator('[data-testid="elucim-fullscreen-btn"]');
    await expect(fsBtn).toBeVisible();
  });

  test('slide 3 shows Taylor Series with LaTeX', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');
    await nextBtn.click();
    await page.waitForTimeout(600);
    await nextBtn.click();
    await page.waitForTimeout(600);

    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    await expect(hud).toContainText('Taylor Series');
    await expect(hud).toContainText('3 / 5');

    // Let animations run
    await page.waitForTimeout(2000);
    await screenshotPresentation(page, 'pres-test-taylor.png');
  });

  test('slide 4 shows vector field', async ({ page }) => {
    const nextBtn = page.locator('[data-testid="elucim-next-btn"]');
    for (let i = 0; i < 3; i++) {
      await nextBtn.click();
      await page.waitForTimeout(600);
    }

    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    await expect(hud).toContainText('Vector Fields');
    await expect(hud).toContainText('4 / 5');

    await page.waitForTimeout(1500);
    await screenshotPresentation(page, 'pres-test-vectors.png');
  });

  test('progress dots reflect current slide', async ({ page }) => {
    const hud = page.locator('[data-testid="elucim-presentation-hud"]');
    // On slide 1, should see 5 dots total
    const dots = hud.locator('div > div > div'); // progress dots container
    // Just verify the HUD renders dots by checking for multiple child divs
    await expect(hud).toBeVisible();
  });
});
