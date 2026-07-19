import { expect, test } from '@playwright/test';

const CAMERA_DOCUMENT = {
  version: '2.0',
  scene: {
    type: 'player',
    width: 800,
    height: 600,
    children: ['focus', 'focus-label'],
  },
  elements: {
    focus: {
      id: 'focus',
      type: 'rect',
      props: { type: 'rect', x: 200, y: 150, width: 400, height: 300, fill: '#4fc3f7' },
    },
    'focus-label': {
      id: 'focus-label',
      type: 'text',
      props: { type: 'text', x: 300, y: 260, content: 'Focus label', fontSize: 32, fill: '#001018' },
    },
  },
  timelines: {
    focus: {
      id: 'focus',
      duration: 120,
      tracks: [{ target: 'focus', property: 'opacity', keyframes: [{ frame: 0, value: 1 }] }],
      camera: {
        coordinateSpace: 'scene',
        fit: 'cover',
        keyframes: [{ frame: 0, viewport: { x: 200, y: 150, width: 400, height: 300 } }],
      },
    },
  },
};

const CAMERALESS_DOCUMENT = {
  ...CAMERA_DOCUMENT,
  timelines: undefined,
};

const TIMELINE_CAMERA_DOCUMENT = CAMERA_DOCUMENT;

const TIMELINE_CAMERALESS_DOCUMENT = {
  ...CAMERA_DOCUMENT,
  timelines: {
    focus: {
      ...CAMERA_DOCUMENT.timelines.focus,
      camera: undefined,
    },
  },
};

test('renders a normalized scene camera in the editor canvas', async ({ page }) => {
  await page.addInitScript(({ key, document }) => {
    window.localStorage.setItem(key, JSON.stringify(document));
  }, { key: 'scene-camera-e2e', document: CAMERA_DOCUMENT });

  await page.goto('/editor.html?document=localStorage&docKey=scene-camera-e2e');
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });

  const cameraViewports = page.locator('.elucim-editor-canvas [data-elucim-camera-viewport]');
  await expect(cameraViewports).toHaveCount(2);
  await expect(cameraViewports.first()).toHaveAttribute('viewBox', '200 150 400 300');
  await expect(cameraViewports.first()).toBeVisible();
});

test('keeps inline text editing aligned with a camera crop', async ({ page }) => {
  await page.addInitScript(({ key, document }) => {
    window.localStorage.setItem(key, JSON.stringify(document));
  }, { key: 'scene-camera-inline-edit', document: CAMERA_DOCUMENT });

  await page.goto('/editor.html?document=localStorage&docKey=scene-camera-inline-edit');
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });

  const text = page.locator('text').filter({ hasText: 'Focus label' });
  const textBounds = await text.boundingBox();
  if (!textBounds) throw new Error('Camera test text did not render');
  await page.mouse.click(textBounds.x + textBounds.width / 2, textBounds.y + textBounds.height / 2);
  await expect(page.getByRole('treeitem', { name: /focus-label/ })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');

  const editor = page.getByRole('textbox', { name: 'Edit text on canvas' });
  await expect(editor).toBeVisible();
  const editorBounds = await editor.boundingBox();
  if (!editorBounds) throw new Error('Inline text editor did not render');

  expect(Math.abs(editorBounds.x - textBounds.x)).toBeLessThan(20);
});

test('authors a camera viewport from the visual framing controls', async ({ page }) => {
  await page.addInitScript(({ key, document }) => {
    window.localStorage.setItem(key, JSON.stringify(document));
  }, { key: 'scene-camera-framing', document: TIMELINE_CAMERA_DOCUMENT });

  await page.goto('/editor.html?document=localStorage&docKey=scene-camera-framing');
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Canvas scene' }).click();
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await page.getByRole('button', { name: 'Frame timeline camera' }).click();

  await expect(page.getByLabel('Camera framing controls')).toBeVisible();
  await expect(page.getByTestId('camera-frame-handle-se')).toBeVisible();
  await page.locator('[role="treeitem"]').filter({ hasText: 'focusrect' }).click();
  const focusSelection = page.getByRole('button', { name: 'Focus selection' });
  await expect(focusSelection).toBeEnabled();
  await focusSelection.click();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByLabel('Camera framing controls')).toHaveCount(0);
  await expect(page.locator('.elucim-editor-canvas [data-elucim-camera-viewport]').first())
    .not.toHaveAttribute('viewBox', '200 150 400 300');
});

test('authors a camera viewport by drawing a frame', async ({ page }) => {
  await page.addInitScript(({ key, document }) => {
    window.localStorage.setItem(key, JSON.stringify(document));
  }, { key: 'scene-camera-draw-frame', document: TIMELINE_CAMERA_DOCUMENT });

  await page.goto('/editor.html?document=localStorage&docKey=scene-camera-draw-frame');
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Canvas scene' }).click();
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await page.getByRole('button', { name: 'Frame timeline camera' }).click();

  await page.getByRole('button', { name: 'Draw frame' }).click();
  const drawSurface = page.getByTestId('camera-frame-draw-surface');
  const bounds = await drawSurface.boundingBox();
  if (!bounds) throw new Error('Camera draw surface did not render');

  await page.mouse.move(bounds.x + bounds.width * 0.1, bounds.y + bounds.height * 0.15);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.6);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByLabel('Camera framing controls')).toHaveCount(0);
  await expect(page.locator('.elucim-editor-canvas [data-elucim-camera-viewport]').first())
    .not.toHaveAttribute('viewBox', '200 150 400 300');
});

test('does not create a camera when a new frame is canceled', async ({ page }) => {
  await page.addInitScript(({ key, document }) => {
    window.localStorage.setItem(key, JSON.stringify(document));
  }, { key: 'scene-camera-cancel-frame', document: TIMELINE_CAMERALESS_DOCUMENT });

  await page.goto('/editor.html?document=localStorage&docKey=scene-camera-cancel-frame');
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Canvas scene' }).click();
  await page.getByRole('button', { name: 'Show Inspector' }).click();
  await page.getByRole('button', { name: 'Frame timeline camera' }).click();

  await expect(page.getByLabel('Camera framing controls')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByLabel('Camera framing controls')).toHaveCount(0);
  await expect(page.locator('.elucim-editor-canvas [data-elucim-camera-viewport]')).toHaveCount(0);
});
