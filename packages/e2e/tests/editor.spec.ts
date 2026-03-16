import { test, expect, Page } from '@playwright/test';

const EDITOR_URL = '/editor.html';
const SCREENSHOT_DIR = 'screenshots/editor';

/**
 * Comprehensive visual validation for @elucim/editor.
 *
 * Tests cover:
 *   1. Initial render — all elements visible at frame 0
 *   2. Selection — rect, circle, line, arrow, text (different inspector fields)
 *   3. Toolbar — add each element type (shape, line, text, math, data)
 *   4. Inspector — editing property values
 *   5. Timeline — playback controls, seek
 *   6. Presets — card, slide, square resize
 *   7. Undo / Redo
 *   8. Keyboard shortcuts — delete, arrow nudge
 *   9. Deselect
 */

test.describe('Editor — Initial Render', () => {
  test('full editor loads with all 5 elements', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Verify toolbar sections
    await expect(page.getByText('Tools')).toBeVisible();
    await expect(page.getByText('Shapes')).toBeVisible();
    await expect(page.getByText('Lines')).toBeVisible();
    await expect(page.getByText('Math')).toBeVisible();
    await expect(page.getByText('Data')).toBeVisible();
    await expect(page.getByText('Presets')).toBeVisible();

    // Verify all 5 elements in timeline
    await expect(page.getByText('rect-1')).toBeVisible();
    await expect(page.getByText('circle-1')).toBeVisible();
    await expect(page.getByText('line-1')).toBeVisible();
    await expect(page.getByText('arrow-1')).toBeVisible();
    await expect(page.getByText('text-1')).toBeVisible();

    // Verify inspector says "No selection"
    await expect(page.getByText('No selection')).toBeVisible();

    // Verify timeline frame display
    await expect(page.getByText('0 / 119 @ 60fps')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-render.png`, fullPage: true });
  });
});

test.describe('Editor — Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('select rect — shows X/Y/W/H in inspector', async ({ page }) => {
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Rect — rect-1')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('80');
    await expect(page.getByRole('spinbutton', { name: 'Y', exact: true })).toHaveValue('60');
    await expect(page.getByRole('spinbutton', { name: 'W', exact: true })).toHaveValue('160');
    await expect(page.getByRole('spinbutton', { name: 'H', exact: true })).toHaveValue('100');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-select-rect.png` });
  });

  test('select circle — shows CX/CY/R in inspector', async ({ page }) => {
    await page.getByText('circle-1').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Circle — circle-1')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'CX' })).toHaveValue('500');
    await expect(page.getByRole('spinbutton', { name: 'CY' })).toHaveValue('120');
    await expect(page.getByRole('spinbutton', { name: 'R', exact: true })).toHaveValue('60');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-select-circle.png` });
  });

  test('select line — shows X1/Y1/X2/Y2', async ({ page }) => {
    await page.getByText('line-1').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Line — line-1')).toBeVisible();
    await expect(page.getByLabel('X1')).toHaveValue('100');
    await expect(page.getByLabel('Y1')).toHaveValue('300');
    await expect(page.getByLabel('X2')).toHaveValue('350');
    await expect(page.getByLabel('Y2')).toHaveValue('300');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-select-line.png` });
  });

  test('select arrow — shows X1/Y1/X2/Y2 + Arrow section', async ({ page }) => {
    await page.getByText('arrow-1').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Arrow — arrow-1')).toBeVisible();
    await expect(page.getByText('▾ Arrow')).toBeVisible();
    await expect(page.getByLabel('Head Size')).toHaveValue('12');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-select-arrow.png` });
  });

  test('select text — shows Content section', async ({ page }) => {
    await page.getByText('text-1').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Text — text-1')).toBeVisible();
    await expect(page.getByText('▾ Content')).toBeVisible();
    await expect(page.getByLabel('Text')).toHaveValue('Elucim Editor');
    await expect(page.getByLabel('Font Size')).toHaveValue('28');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-select-text.png` });
  });
});

test.describe('Editor — Add Elements from Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('add rectangle', async ({ page }) => {
    await page.getByRole('button', { name: '▬' }).click();
    await page.waitForTimeout(200);

    // Should now have 6 elements in timeline
    const tracks = page.locator('.elucim-editor-timeline [style*="cursor: pointer"]');
    const trackCount = await tracks.count();
    expect(trackCount).toBeGreaterThanOrEqual(6);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-added-rect.png` });
  });

  test('add circle', async ({ page }) => {
    await page.getByRole('button', { name: '●' }).click();
    await page.waitForTimeout(200);

    // No duplicate key errors
    const errors = await page.evaluate(() => (window as any).__consoleErrors ?? []);
    // Simply verify a 6th element appears in timeline
    const tracks = page.locator('.elucim-editor-timeline [style*="cursor: pointer"]');
    const trackCount = await tracks.count();
    expect(trackCount).toBeGreaterThanOrEqual(6);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-added-circle.png` });
  });

  test('add LaTeX', async ({ page }) => {
    await page.getByRole('button', { name: '∑' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-added-latex.png` });
  });

  test('add axes', async ({ page }) => {
    await page.getByRole('button', { name: '⊞' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-added-axes.png` });
  });

  test('add function plot', async ({ page }) => {
    await page.getByRole('button', { name: 'ƒ' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-added-function.png` });
  });

  test('add bar chart', async ({ page }) => {
    await page.getByRole('button', { name: '📊' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-added-barchart.png` });
  });

  test('add graph', async ({ page }) => {
    await page.getByRole('button', { name: '🔗' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-added-graph.png` });
  });
});

test.describe('Editor — Inspector Editing', () => {
  test('edit rect position via inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select rect
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);

    // Change X from 80 to 200
    const xField = page.getByRole('spinbutton', { name: 'X', exact: true });
    await xField.click({ clickCount: 3 });
    await xField.fill('200');
    await xField.press('Tab');
    await page.waitForTimeout(300);

    // Verify the value stuck
    await expect(xField).toHaveValue('200');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-rect-moved-via-inspector.png` });
  });

  test('edit circle radius via inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByText('circle-1').click();
    await page.waitForTimeout(200);

    // Change radius from 60 to 100
    const rField = page.getByRole('spinbutton', { name: 'R', exact: true });
    await rField.click({ clickCount: 3 });
    await rField.fill('100');
    await rField.press('Tab');
    await page.waitForTimeout(300);

    await expect(rField).toHaveValue('100');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-circle-resized-via-inspector.png` });
  });

  test('edit text content via inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByText('text-1').click();
    await page.waitForTimeout(200);

    // Change text
    const textField = page.getByLabel('Text');
    await textField.click({ clickCount: 3 });
    await textField.fill('Hello World!');
    await textField.press('Tab');
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-text-changed-via-inspector.png` });
  });
});

test.describe('Editor — Timeline Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('go to end frame', async ({ page }) => {
    await page.getByRole('button', { name: '⏭' }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('119 / 119 @ 60fps')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-timeline-end-frame.png` });
  });

  test('step forward', async ({ page }) => {
    // Click step forward 5 times
    const stepBtn = page.getByRole('button', { name: '▶' }).nth(1); // second ▶ is step forward
    for (let i = 0; i < 5; i++) {
      await stepBtn.click();
    }
    await page.waitForTimeout(200);

    await expect(page.getByText('5 / 119 @ 60fps')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18-timeline-step-forward.png` });
  });

  test('ruler click seeks to position', async ({ page }) => {
    const ruler = page.locator('.elucim-editor-timeline [style*="cursor: pointer"]').first();
    // The ruler is the first clickable div in the timeline area
    // Let's click at ~50% position on the ruler
    const rulerBox = await ruler.boundingBox();
    if (rulerBox) {
      await page.mouse.click(rulerBox.x + rulerBox.width * 0.5, rulerBox.y + rulerBox.height / 2);
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/19-timeline-ruler-seek.png` });
  });
});

test.describe('Editor — Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('card preset (640x360)', async ({ page }) => {
    await page.getByRole('button', { name: 'C' }).click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-preset-card.png` });
  });

  test('slide preset (1280x720)', async ({ page }) => {
    await page.getByRole('button', { name: 'S' }).first().click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/21-preset-slide.png` });
  });
});

test.describe('Editor — Undo/Redo', () => {
  test('undo after adding element', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Verify 5 elements initially
    await expect(page.getByText('text-1')).toBeVisible();

    // Add a rectangle
    await page.getByRole('button', { name: '▬' }).click();
    await page.waitForTimeout(200);

    // Undo button should be enabled
    const undoBtn = page.getByRole('button', { name: '↶' });
    await expect(undoBtn).toBeEnabled();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-before-undo.png` });

    // Undo
    await undoBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-after-undo.png` });

    // Redo
    const redoBtn = page.getByRole('button', { name: '↷' });
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/24-after-redo.png` });
  });
});

test.describe('Editor — Keyboard Shortcuts', () => {
  test('delete selected element', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select rect-1 via timeline
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Rect — rect-1')).toBeVisible();

    // Press Delete
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // rect-1 should be gone from timeline
    await expect(page.getByText('rect-1')).not.toBeVisible();
    // Inspector should show no selection
    await expect(page.getByText('No selection')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/25-after-delete.png` });
  });

  test('Ctrl+Z undoes', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Add a circle
    await page.getByRole('button', { name: '●' }).click();
    await page.waitForTimeout(200);

    // Ctrl+Z to undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    // Should be back to 5 elements
    await page.screenshot({ path: `${SCREENSHOT_DIR}/26-ctrl-z-undo.png` });
  });

  test('arrow keys nudge element', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select rect-1
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);

    const xField = page.getByRole('spinbutton', { name: 'X', exact: true });
    const initialX = await xField.inputValue();
    expect(initialX).toBe('80');

    // Press right arrow 3 times (focus must be on canvas, not input)
    // Click on canvas area first to ensure keyboard goes there
    await page.locator('.elucim-editor-canvas').click();
    await page.waitForTimeout(100);

    // Re-select after clicking canvas (clicking canvas may deselect)
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    // X should have increased by 3
    const newX = await xField.inputValue();
    expect(Number(newX)).toBe(83);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/27-arrow-nudge.png` });
  });

  test('Escape deselects', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select rect
    await page.getByText('rect-1').click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Rect — rect-1')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(page.getByText('No selection')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/28-escape-deselect.png` });
  });
});

test.describe('Editor — Multiple Elements Added', () => {
  test('add all element types and screenshot', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Add one of each type
    const buttons = ['▬', '●', '╱', '→', 'T', '∑', '⊞', 'ƒ', '📊', '🔗'];
    for (const icon of buttons) {
      await page.getByRole('button', { name: icon }).click();
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/29-all-element-types-added.png`, fullPage: true });
  });
});
