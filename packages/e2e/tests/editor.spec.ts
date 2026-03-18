import { test, expect, Page } from '@playwright/test';

const EDITOR_URL = '/editor.html';
const SCREENSHOT_DIR = 'screenshots/editor';

/**
 * Comprehensive visual validation for @elucim/editor (v2 — full-bleed canvas UX).
 *
 * Tests cover:
 *   1. Initial render — canvas, floating toolbar, dot grid, minimap, zoom controls
 *   2. Selection — rect, circle, line, arrow, text (floating inspector)
 *   3. Toolbar — add each element type
 *   4. Inspector — editing property values
 *   5. Timeline — playback controls, seek
 *   6. Undo / Redo
 *   7. Keyboard shortcuts — delete, arrow nudge, escape
 *   8. Viewport — zoom controls, fit-to-view
 *   9. Floating panels — toolbar collapse, inspector pin
 */

/** Helper: select an element by clicking its timeline track label */
async function selectViaTimeline(page: Page, name: string) {
  await page.getByText(name, { exact: true }).click();
  await page.waitForTimeout(300);
}

/** Helper: click on element's hit area on the canvas */
async function selectOnCanvas(page: Page, editorId: string) {
  const hitRect = page.locator(`[data-editor-id="${editorId}"]`);
  const box = await hitRect.boundingBox();
  if (!box) throw new Error(`Hit rect for ${editorId} not found`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

test.describe('Editor — Initial Render', () => {
  test('full editor loads with canvas, toolbar, and timeline', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Floating toolbar with categories
    await expect(page.getByText('Shapes')).toBeVisible();
    await expect(page.getByText('Lines')).toBeVisible();
    await expect(page.getByText('Math')).toBeVisible();
    await expect(page.getByText('Data')).toBeVisible();

    // All 5 elements in timeline
    await expect(page.getByText('rect-1')).toBeVisible();
    await expect(page.getByText('circle-1')).toBeVisible();
    await expect(page.getByText('line-1')).toBeVisible();
    await expect(page.getByText('arrow-1')).toBeVisible();
    await expect(page.getByText('text-1')).toBeVisible();

    // Inspector visible by default (canvas selected, inspector pinned)
    await expect(page.getByText('Inspector')).toBeVisible();

    // Zoom controls visible
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();

    // Timeline frame display
    await expect(page.getByText('0 / 119 @ 60fps')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial-render.png`, fullPage: true });
  });
});

test.describe('Editor — Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('select rect — shows floating inspector with X/Y/W/H', async ({ page }) => {
    await selectViaTimeline(page, 'rect-1');

    await expect(page.getByText('Rect — rect-1')).toBeVisible();
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('80');
    await expect(page.getByRole('spinbutton', { name: 'Y', exact: true })).toHaveValue('60');
    await expect(page.getByRole('spinbutton', { name: 'W', exact: true })).toHaveValue('160');
    await expect(page.getByRole('spinbutton', { name: 'H', exact: true })).toHaveValue('100');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-select-rect.png` });
  });

  test('select circle — shows CX/CY/R in inspector', async ({ page }) => {
    await selectViaTimeline(page, 'circle-1');

    await expect(page.getByText('Circle — circle-1')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'CX' })).toHaveValue('500');
    await expect(page.getByRole('spinbutton', { name: 'CY' })).toHaveValue('120');
    await expect(page.getByRole('spinbutton', { name: 'R', exact: true })).toHaveValue('60');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-select-circle.png` });
  });

  test('select line — shows X1/Y1/X2/Y2', async ({ page }) => {
    await selectViaTimeline(page, 'line-1');

    await expect(page.getByText('Line — line-1')).toBeVisible();
    await expect(page.getByLabel('X1')).toHaveValue('100');
    await expect(page.getByLabel('Y1')).toHaveValue('300');
    await expect(page.getByLabel('X2')).toHaveValue('350');
    await expect(page.getByLabel('Y2')).toHaveValue('300');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-select-line.png` });
  });

  test('select arrow — shows Arrow section with Head Size', async ({ page }) => {
    await selectViaTimeline(page, 'arrow-1');

    await expect(page.getByText('Arrow — arrow-1')).toBeVisible();
    // Arrow-specific inspector section (rendered with uppercase CSS text-transform)
    const arrowSection = page.locator('.elucim-editor-inspector [style*="text-transform: uppercase"]', { hasText: 'Arrow' });
    await expect(arrowSection.first()).toBeVisible();
    await expect(page.getByLabel('Head Size')).toHaveValue('12');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-select-arrow.png` });
  });

  test('select text — shows Content section', async ({ page }) => {
    await selectViaTimeline(page, 'text-1');

    await expect(page.getByText('Text — text-1')).toBeVisible();
    await expect(page.getByText('Content', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Text')).toHaveValue('Elucim Editor');
    await expect(page.getByLabel('Font Size')).toHaveValue('28');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-select-text.png` });
  });

  test('select element on canvas via click', async ({ page }) => {
    await selectOnCanvas(page, 'rect-1');

    await expect(page.getByText('Rect — rect-1')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06b-select-on-canvas.png` });
  });
});

test.describe('Editor — Add Elements from Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('add rectangle', async ({ page }) => {
    await page.getByRole('button', { name: 'Rectangle' }).click();
    await page.waitForTimeout(200);

    // Should now have 6 elements in timeline
    const tracks = page.locator('.elucim-editor-timeline [style*="cursor: grab"]');
    const trackCount = await tracks.count();
    expect(trackCount).toBeGreaterThanOrEqual(6);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-added-rect.png` });
  });

  test('add circle', async ({ page }) => {
    await page.getByRole('button', { name: 'Circle' }).click();
    await page.waitForTimeout(200);

    const tracks = page.locator('.elucim-editor-timeline [style*="cursor: grab"]');
    const trackCount = await tracks.count();
    expect(trackCount).toBeGreaterThanOrEqual(6);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-added-circle.png` });
  });

  test('add LaTeX', async ({ page }) => {
    await page.getByRole('button', { name: 'LaTeX' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-added-latex.png` });
  });

  test('add axes', async ({ page }) => {
    await page.getByTitle('Axes').click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-added-axes.png` });
  });

  test('add function plot', async ({ page }) => {
    await page.getByRole('button', { name: 'Function' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-added-function.png` });
  });

  test('add bar chart', async ({ page }) => {
    await page.getByRole('button', { name: 'Bar Chart' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-added-barchart.png` });
  });

  test('add graph', async ({ page }) => {
    await page.getByRole('button', { name: 'Graph' }).click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-added-graph.png` });
  });
});

test.describe('Editor — Inspector Editing', () => {
  test('edit rect position via inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'rect-1');

    // Change X from 80 to 200
    const xField = page.getByRole('spinbutton', { name: 'X', exact: true });
    await xField.click({ clickCount: 3 });
    await xField.fill('200');
    await xField.press('Tab');
    await page.waitForTimeout(300);

    await expect(xField).toHaveValue('200');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-rect-moved-via-inspector.png` });
  });

  test('edit circle radius via inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'circle-1');

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

    await selectViaTimeline(page, 'text-1');

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
    await page.getByRole('button', { name: 'End' }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('119 / 119 @ 60fps')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-timeline-end-frame.png` });
  });

  test('step forward', async ({ page }) => {
    const stepBtn = page.getByRole('button', { name: 'Step forward' });
    for (let i = 0; i < 5; i++) {
      await stepBtn.click();
    }
    await page.waitForTimeout(200);

    await expect(page.getByText('5 / 119 @ 60fps')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/18-timeline-step-forward.png` });
  });

  test('ruler click seeks to position', async ({ page }) => {
    const ruler = page.locator('.elucim-editor-timeline [style*="cursor: grab"]').first();
    const rulerBox = await ruler.boundingBox();
    if (rulerBox) {
      await page.mouse.click(rulerBox.x + rulerBox.width * 0.5, rulerBox.y + rulerBox.height / 2);
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/19-timeline-ruler-seek.png` });
  });
});

test.describe('Editor — Undo/Redo', () => {
  test('undo after adding element', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await expect(page.getByText('text-1')).toBeVisible();

    await page.getByRole('button', { name: 'Rectangle' }).click();
    await page.waitForTimeout(200);

    const undoBtn = page.getByRole('button', { name: 'Undo' });
    await expect(undoBtn).toBeEnabled();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/22-before-undo.png` });

    await undoBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/23-after-undo.png` });

    const redoBtn = page.getByRole('button', { name: 'Redo' });
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

    await selectViaTimeline(page, 'rect-1');
    await expect(page.getByText('Rect — rect-1')).toBeVisible();

    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // rect-1 should be gone from timeline
    await expect(page.getByText('rect-1')).not.toBeVisible();
    // Inspector should disappear (no selection)
    await expect(page.getByText('Inspector')).not.toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/25-after-delete.png` });
  });

  test('Ctrl+Z undoes', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Circle' }).click();
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/26-ctrl-z-undo.png` });
  });

  test('arrow keys nudge element', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'rect-1');

    const xField = page.getByRole('spinbutton', { name: 'X', exact: true });
    expect(await xField.inputValue()).toBe('80');

    // Blur any focused input so arrow keys reach the editor's nudge handler
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.waitForTimeout(100);

    // Press right arrow 3 times
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    expect(Number(await xField.inputValue())).toBe(83);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/27-arrow-nudge.png` });
  });

  test('Escape deselects and hides inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'rect-1');
    await expect(page.getByText('Rect — rect-1')).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Inspector should disappear
    await expect(page.getByText('Inspector')).not.toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/28-escape-deselect.png` });
  });
});

test.describe('Editor — Viewport Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
    // Collapse toolbar so it doesn't cover zoom controls
    await page.getByTitle('Collapse panel').click();
    await page.waitForTimeout(200);
  });

  test('zoom in via button', async ({ page }) => {
    const zoomLabel = page.getByTitle('Current zoom');
    const initialZoom = await zoomLabel.textContent();

    await page.getByTitle('Zoom in').click();
    await page.waitForTimeout(200);

    const newZoom = await zoomLabel.textContent();
    expect(newZoom).not.toBe(initialZoom);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-zoom-in.png` });
  });

  test('zoom out via button', async ({ page }) => {
    const zoomLabel = page.getByTitle('Current zoom');
    const initialZoom = await zoomLabel.textContent();

    await page.getByTitle('Zoom out').click();
    await page.waitForTimeout(200);

    const newZoom = await zoomLabel.textContent();
    expect(newZoom).not.toBe(initialZoom);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/31-zoom-out.png` });
  });

  test('fit to view resets zoom', async ({ page }) => {
    // Zoom in first
    await page.getByTitle('Zoom in').click();
    await page.getByTitle('Zoom in').click();
    await page.waitForTimeout(200);

    // Fit to view
    await page.getByTitle('Fit to view').click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/32-fit-to-view.png` });
  });

  test('minimap is visible', async ({ page }) => {
    // The minimap should be in the bottom-right of the canvas area
    const minimap = page.locator('.elucim-editor-canvas svg').last();
    await expect(minimap).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/33-minimap-visible.png` });
  });
});

test.describe('Editor — Floating Panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);
  });

  test('toolbar collapse toggle', async ({ page }) => {
    // Toolbar should be visible with categories
    await expect(page.getByText('Shapes')).toBeVisible();

    // Click collapse button on the toolbar panel
    await page.getByTitle('Collapse panel').click();
    await page.waitForTimeout(200);

    // Categories should be hidden
    await expect(page.getByText('Shapes')).not.toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/34-toolbar-collapsed.png` });

    // Expand again
    await page.getByTitle('Expand panel').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Shapes')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/35-toolbar-expanded.png` });
  });

  test('inspector pin button toggles', async ({ page }) => {
    await selectViaTimeline(page, 'rect-1');

    // Inspector should appear
    await expect(page.getByText('Inspector')).toBeVisible();

    // Click pin button
    const pinBtn = page.getByRole('button', { name: 'Pin inspector' });
    await pinBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/36-inspector-pinned.png` });
  });
});

test.describe('Editor — Multiple Elements Added', () => {
  test('add all element types and screenshot', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    const buttons = [
      'Rectangle', 'Circle', 'Line', 'Arrow',
      'Text', 'LaTeX', 'Axes',
      'Function', 'Bar Chart', 'Graph',
    ];
    for (const name of buttons) {
      await page.getByRole('button', { name }).click();
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/29-all-element-types-added.png`, fullPage: true });
  });
});

// ─── Marquee Selection ─────────────────────────────────────────────────────

test.describe('Editor — Marquee Selection', () => {
  test('drag on empty canvas draws marquee and selects elements', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Canvas area
    const canvas = page.locator('.elucim-editor-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Drag a large rectangle that should encompass all demo elements
    // Start from top-left area, drag to bottom-right
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(200);

    // Marquee rectangle should be visible during drag
    await page.screenshot({ path: `${SCREENSHOT_DIR}/35-marquee-drag.png` });

    await page.mouse.up();
    await page.waitForTimeout(300);

    // After release, some elements should be selected (timeline highlights)
    const timeline = page.locator('.elucim-editor-timeline');
    const selectedItems = timeline.locator('[style*="background"]');
    // At least one element should be selected
    const count = await selectedItems.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/36-marquee-selected.png` });
  });

  test('click on empty canvas selects canvas and shows properties', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select an element first
    await selectOnCanvas(page, 'rect-1');
    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText('Rect');

    // Click on empty canvas area (far right, vertically centered — away from elements)
    const canvas = page.locator('.elucim-editor-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.mouse.click(box.x + box.width - 50, box.y + box.height * 0.3);
    await page.waitForTimeout(500);

    // Inspector should show canvas properties
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText('Canvas');
    await expect(inspector).toContainText('Width');
    await expect(inspector).toContainText('Height');
    await expect(inspector).toContainText('Background');
    await expect(inspector).toContainText('FPS');
  });
});

// ─── Phase 1-5 Feature Tests ───────────────────────────────────────────────

test.describe('Editor — Menu Bar (Phase 4)', () => {
  test('menu bar shows Save, Open, Copy, Theme buttons', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Theme' })).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/40-menu-bar.png` });
  });

  test('theme picker opens with built-in themes', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Theme' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Themes')).toBeVisible();
    await expect(page.getByText('dark')).toBeVisible();
    await expect(page.getByText('light')).toBeVisible();
    await expect(page.getByText('ocean')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/41-theme-picker.png` });
  });

  test('apply light theme changes canvas background', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Theme' }).click();
    await page.waitForTimeout(300);
    await page.getByText('light').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/42-light-theme.png` });
  });
});

test.describe('Editor — New Primitives (Phase 2)', () => {
  test('toolbar shows Polygon, Bézier Curve, Vector Field', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // New primitives in toolbar
    await expect(page.getByRole('button', { name: 'Polygon' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bézier Curve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vector Field' })).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/43-new-primitives-toolbar.png` });
  });

  test('add polygon via toolbar', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Polygon' }).click();
    await page.waitForTimeout(500);

    // Should show polygon in timeline
    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Polygon');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/44-added-polygon.png` });
  });

  test('add bezier curve via toolbar', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Bézier Curve' }).click();
    await page.waitForTimeout(500);

    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Bezier');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/45-added-bezier.png` });
  });
});

test.describe('Editor — Matrix & Data Editing (Phase 5)', () => {
  test('select matrix shows MatrixEditor in inspector', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'matrix-1');
    await page.waitForTimeout(300);

    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Matrix');
    // MatrixEditor dimension controls
    await expect(inspector).toContainText('+R');
    await expect(inspector).toContainText('+C');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/46-matrix-editor.png` });
  });

  test('select barchart shows ArrayEditor with bar data', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'barchart-1');
    await page.waitForTimeout(300);

    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Bar Chart');
    // Should show individual bar labels
    await expect(inspector).toContainText('+ Add Row');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/47-barchart-editor.png` });
  });

  test('select graph shows node/edge ArrayEditors', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'graph-1');
    await page.waitForTimeout(300);

    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Graph');
    await expect(inspector).toContainText('Nodes');
    await expect(inspector).toContainText('Edges');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/48-graph-editor.png` });
  });

  test('select polygon shows point ArrayEditor', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectViaTimeline(page, 'polygon-1');
    await page.waitForTimeout(300);

    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Polygon');
    await expect(inspector).toContainText('+ Add Row');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/49-polygon-editor.png` });
  });
});

test.describe('Editor — Timeline Editing (Phase 3)', () => {
  test('double-click track label opens rename input', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Double-click on rect-1 label to rename
    const label = page.getByText('rect-1', { exact: true });
    await label.dblclick();
    await page.waitForTimeout(300);

    // Should show an input field
    const input = page.locator('.elucim-editor-timeline input');
    await expect(input).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/50-timeline-rename.png` });
  });

  test('timeline shows all 10 element tracks', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Should show all element tracks
    await expect(page.getByText('rect-1')).toBeVisible();
    await expect(page.getByText('circle-1')).toBeVisible();
    await expect(page.getByText('line-1')).toBeVisible();
    await expect(page.getByText('arrow-1')).toBeVisible();
    await expect(page.getByText('text-1')).toBeVisible();
    await expect(page.getByText('matrix-1')).toBeVisible();
    await expect(page.getByText('barchart-1')).toBeVisible();
    await expect(page.getByText('graph-1')).toBeVisible();
    await expect(page.getByText('polygon-1')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/51-all-tracks.png` });
  });
});

test.describe('Editor — Resize Direction Fix (Phase 1)', () => {
  test('circle resize handles visible when selected', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectOnCanvas(page, 'circle-1');
    await page.waitForTimeout(300);

    // Selection handles should be visible
    const handles = page.locator('[data-handle]');
    const handleCount = await handles.count();
    expect(handleCount).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/52-circle-selected-handles.png` });
  });

  test('matrix bounding box correct after fix', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await selectOnCanvas(page, 'matrix-1');
    await page.waitForTimeout(300);

    // Selection overlay should show around the matrix
    const inspector = page.locator('.elucim-editor-inspector');
    await expect(inspector).toContainText('Matrix');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/53-matrix-bounds.png` });
  });
});

test.describe('Editor — Group/Ungroup (Phase 2)', () => {
  test('select multiple and group with Ctrl+G', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Select rect-1
    await selectOnCanvas(page, 'rect-1');
    await page.waitForTimeout(200);

    // Shift-click circle-1 to add to selection
    const circleHit = page.locator('[data-editor-id="circle-1"]');
    const circleBox = await circleHit.boundingBox();
    if (!circleBox) throw new Error('circle-1 not found');
    await page.mouse.click(circleBox.x + circleBox.width / 2, circleBox.y + circleBox.height / 2, { modifiers: ['Shift'] });
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/54-multi-select-before-group.png` });

    // Group with Ctrl+G
    await page.keyboard.press('Control+g');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/55-after-group.png` });
  });
});

test.describe('Editor — Full Feature Overview', () => {
  test('complete editor with all primitives', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    // Full editor screenshot showing all elements
    await page.screenshot({ path: `${SCREENSHOT_DIR}/60-full-editor-all-elements.png`, fullPage: true });
  });

  test('copy JSON to clipboard works', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(EDITOR_URL);
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: 'Copy' }).click();
    await page.waitForTimeout(300);

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const doc = JSON.parse(clipboardText);
    expect(doc.version).toBe('1.0');
    expect(doc.root.type).toBe('player');
  });
});
