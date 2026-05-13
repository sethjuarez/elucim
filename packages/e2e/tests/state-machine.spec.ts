import { expect, Locator, Page, test } from '@playwright/test';

const EDITOR_URL = '/editor.html';

async function openStateMachineWorkspace(page: Page) {
  await page.goto(EDITOR_URL);
  await page.getByRole('tab', { name: 'State machines motion tab' }).click();
  await expect(page.getByLabel('State machine graph walkthrough')).toBeVisible();
}

function graphNode(page: Page, id: string): Locator {
  return page.locator(`.react-flow__node[data-id="${id}"]`);
}

async function nodeBox(page: Page, id: string) {
  const box = await graphNode(page, id).boundingBox();
  if (!box) throw new Error(`Expected graph node "${id}" to have a bounding box`);
  return box;
}

async function dragNode(page: Page, id: string, deltaX: number, deltaY: number) {
  const box = await nodeBox(page, id);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY, { steps: 12 });
  await page.mouse.up();
  return box;
}

async function expectNodeOffset(page: Page, id: string, before: { x: number; y: number }, minDx: number, minDy: number) {
  const after = await nodeBox(page, id);
  expect(after.x - before.x).toBeGreaterThanOrEqual(minDx);
  expect(after.y - before.y).toBeGreaterThanOrEqual(minDy);
  return after;
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function opacity(locator: Locator) {
  return Number(await locator.getAttribute('opacity'));
}

test.describe('Editor state-machine interactions', () => {
  test('expands the editor and graph when the browser is resized', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await openStateMachineWorkspace(page);

    const beforeEditor = await page.locator('.elucim-editor').boundingBox();
    const beforeGraph = await page.getByLabel('State machine graph walkthrough').boundingBox();
    expect(beforeEditor?.width).toBe(1000);
    expect(beforeEditor?.height).toBe(700);
    expect(beforeGraph?.height).toBeGreaterThan(300);

    await page.setViewportSize({ width: 1700, height: 1050 });
    await page.waitForTimeout(500);

    const afterEditor = await page.locator('.elucim-editor').boundingBox();
    const afterGraph = await page.getByLabel('State machine graph walkthrough').boundingBox();
    expect(afterEditor?.width).toBe(1700);
    expect(afterEditor?.height).toBe(1050);
    expect(afterGraph?.width ?? 0).toBeGreaterThan((beforeGraph?.width ?? 0) + 500);
    expect(afterGraph?.height ?? 0).toBeGreaterThan(300);
  });

  test('opens in a readable layout with compact, separated nodes', async ({ page }) => {
    await openStateMachineWorkspace(page);

    const entry = await nodeBox(page, '__entry__');
    const idle = await nodeBox(page, 'idle');
    const focus = await nodeBox(page, 'focus');

    expect(entry.width).toBeLessThanOrEqual(80);
    expect(idle.width).toBeLessThanOrEqual(140);
    expect(focus.width).toBeLessThanOrEqual(140);
    expect(intersects(entry, idle)).toBe(false);
    expect(intersects(idle, focus)).toBe(false);
  });

  test('keeps Entry and state node positions after drag, graph sync, and tab switches', async ({ page }) => {
    await openStateMachineWorkspace(page);

    const entryBefore = await dragNode(page, '__entry__', 96, 48);
    await page.waitForTimeout(5000);
    const entryAfter = await expectNodeOffset(page, '__entry__', entryBefore, 55, 25);

    const idleBefore = await dragNode(page, 'idle', 70, 36);
    await page.waitForTimeout(2000);
    const idleAfter = await expectNodeOffset(page, 'idle', idleBefore, 35, 18);

    await page.getByRole('tab', { name: 'Animations motion tab' }).click();
    await expect(page.getByRole('button', { name: 'Select animation intro' })).toBeVisible();
    await page.getByRole('tab', { name: 'State machines motion tab' }).click();

    const entryRestored = await nodeBox(page, '__entry__');
    const idleRestored = await nodeBox(page, 'idle');
    expect(Math.abs(entryRestored.x - entryAfter.x)).toBeLessThan(3);
    expect(Math.abs(entryRestored.y - entryAfter.y)).toBeLessThan(3);
    expect(Math.abs(idleRestored.x - idleAfter.x)).toBeLessThan(3);
    expect(Math.abs(idleRestored.y - idleAfter.y)).toBeLessThan(3);
  });

  test('lets the Entry node move freely left and up', async ({ page }) => {
    await openStateMachineWorkspace(page);
    await page.waitForTimeout(500);

    const entryBefore = await dragNode(page, '__entry__', -80, -40);
    await page.waitForTimeout(500);
    const entryAfter = await nodeBox(page, '__entry__');

    expect(entryAfter.x - entryBefore.x).toBeLessThanOrEqual(-55);
    expect(entryAfter.y - entryBefore.y).toBeLessThanOrEqual(-25);
  });

  test('lets Entry use a gated click event from the graph preview before the first state', async ({ page }) => {
    await openStateMachineWorkspace(page);

    await page.getByRole('button', { name: 'Edit onStart transition from entry' }).click();
    await expect(page.getByText(/controls how the machine leaves Entry/)).toBeVisible();
    await page.getByLabel(/Transition entry-start event preset/).selectOption('onClick');

    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Waiting at Entry for Click/)).toBeVisible();
    await expect(page.getByLabel('Preview mode canvas')).toContainText(/Preview mode/);
    await expect(page.getByRole('button', { name: 'Exit state machine preview mode' })).toBeVisible();
    await page.getByTitle('Zoom in').click();
    await page.getByTitle('Zoom in').click();
    await expect(page.getByLabel('Preview mode canvas')).toBeInViewport();
    await page.getByRole('button', { name: 'Add state to walkthrough' }).focus();
    await page.getByRole('button', { name: 'Trigger onClick event from entry' }).click();
    await expect(page.getByText(/Previewing idle via onClick from entry/)).toBeVisible();
    await page.getByRole('button', { name: 'Exit state machine preview mode' }).click();
    await expect(page.getByLabel('Preview mode canvas')).not.toBeVisible();
  });

  test('waits for an onClick state transition after the source animation completes', async ({ page }) => {
    await openStateMachineWorkspace(page);

    await page.getByRole('button', { name: 'Edit Next transition from idle' }).click();
    await page.getByLabel('Transition idle-next type').selectOption('event');

    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Previewing idle/)).toBeVisible();
    await expect(page.getByText(/Previewing focus/)).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Trigger onClick event from idle' })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3600);
    await expect(page.getByText(/Finished idle/)).not.toBeVisible();
    await expect(page.getByText(/Preview(?:ing)? idle/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trigger onClick event from idle' })).toBeVisible();

    await page.getByRole('button', { name: 'Trigger onClick event from idle' }).click();
    await expect(page.getByText(/Previewing focus via onClick from idle/)).toBeVisible();
  });

  test('honors keyed events in the preview runner', async ({ page }) => {
    await openStateMachineWorkspace(page);

    await page.getByRole('button', { name: 'Edit onStart transition from entry' }).click();
    await page.getByLabel(/Transition entry-start event preset/).selectOption('onKey');
    await page.getByLabel('Transition entry-start key').press('Space');
    await expect(page.getByLabel('Transition entry-start key')).toHaveValue('Space');
    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Waiting at Entry for Press Space/)).toBeVisible();
    await expect(page.locator('.elucim-editor-canvas')).toBeFocused();
    await page.locator('.elucim-editor-canvas').press('Space');
    await expect(page.getByText(/Preview(?:ing)? idle via onKey from entry/)).toBeVisible();
  });

  test('supports inspector-authored event edits in state-machine preview', async ({ page }) => {
    await openStateMachineWorkspace(page);
    const introRect = page.locator('[data-measure-id="rect-1"] [data-testid="elucim-rect"]').first();
    const focusText = page.locator('[data-measure-id="text-1"] text').first();
    expect(await opacity(introRect)).toBeGreaterThan(0.99);

    await page.getByRole('button', { name: 'Edit Next transition from idle' }).click();
    await page.getByLabel('Transition idle-next type').selectOption('event');
    await page.getByLabel('Transition idle-next event preset').selectOption('custom');
    await page.getByLabel(/Rename transition trigger/).fill('continue');
    await page.getByLabel(/Rename transition trigger/).press('Enter');

    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Previewing idle/)).toBeVisible();
    await page.waitForTimeout(50);
    expect(await opacity(introRect)).toBeLessThan(0.3);
    expect(await opacity(focusText)).toBeLessThan(0.1);
    await expect.poll(() => opacity(introRect), { timeout: 3000 }).toBeGreaterThan(0.45);
    await expect(page.getByRole('button', { name: 'Trigger continue event from idle' })).toBeVisible({ timeout: 6000 });
    await page.getByRole('button', { name: 'Trigger continue event from idle' }).click();
    await expect(page.getByText(/Previewing focus via continue from idle/)).toBeVisible();
    expect(await opacity(introRect)).toBeGreaterThan(0.99);
    await expect.poll(() => opacity(focusText), { timeout: 3000 }).toBeGreaterThan(0.35);
  });

  test('holds the finished preview and restarts preview to start keyframes', async ({ page }) => {
    await openStateMachineWorkspace(page);
    const introRect = page.locator('[data-measure-id="rect-1"] [data-testid="elucim-rect"]').first();
    const focusText = page.locator('[data-measure-id="text-1"] text').first();

    await page.getByRole('button', { name: 'Preview state machine walkthrough' }).click();
    await expect(page.getByText(/Finished focus/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Preview mode canvas')).not.toBeVisible();
    expect(await opacity(introRect)).toBeGreaterThan(0.99);
    expect(await opacity(focusText)).toBeGreaterThan(0.99);

    await page.getByRole('button', { name: 'Restart state machine preview walkthrough' }).click();
    await expect(page.getByText(/Waiting at Entry/)).toBeVisible();
    expect(await opacity(introRect)).toBeLessThan(0.1);
    expect(await opacity(focusText)).toBeLessThan(0.1);
  });

  test('relayout remains usable and does not enlarge state cards', async ({ page }) => {
    await openStateMachineWorkspace(page);

    await page.getByRole('button', { name: 'Use vertical state machine layout' }).click();
    await page.waitForTimeout(500);
    let idle = await nodeBox(page, 'idle');
    let focus = await nodeBox(page, 'focus');
    expect(idle.width).toBeLessThanOrEqual(140);
    expect(focus.width).toBeLessThanOrEqual(140);
    expect(intersects(idle, focus)).toBe(false);

    await page.getByRole('button', { name: 'Use horizontal state machine layout' }).click();
    await page.waitForTimeout(500);
    idle = await nodeBox(page, 'idle');
    focus = await nodeBox(page, 'focus');
    expect(idle.width).toBeLessThanOrEqual(140);
    expect(focus.width).toBeLessThanOrEqual(140);
    expect(intersects(idle, focus)).toBe(false);
  });
});
