import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cliBin = resolve(repoRoot, 'packages', 'cli', 'dist', 'index.js');

interface EditorDocument {
  scene: { children: string[] };
  elements: Record<string, unknown>;
  timelines?: Record<string, { tracks: Array<{ target: string }> }>;
  stateMachines?: Record<string, { states: Record<string, { timeline?: string }> }>;
  defaultStateMachine?: string;
}

declare global {
  interface Window {
    __elucimEditor?: {
      getDocument: () => EditorDocument;
    };
  }
}

async function runElucim(args: string[]) {
  try {
    await execFileAsync(process.execPath, [cliBin, ...args], {
      cwd: repoRoot,
      windowsHide: true,
    });
  } catch (error) {
    const details = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`elucim ${args.join(' ')} failed: ${details.message}\nstdout:\n${details.stdout ?? ''}\nstderr:\n${details.stderr ?? ''}`);
  }
}

async function makeCliAuthoredDocument(dir: string) {
  const seed = join(dir, 'seed.elc');
  const withCard = join(dir, 'with-card.elc');
  const withTitle = join(dir, 'with-title.elc');
  const withMotion = join(dir, 'with-motion.elc');
  const withMachine = join(dir, 'with-machine.elc');

  await writeFile(seed, `${JSON.stringify({
    version: '2.0',
    metadata: {
      title: 'CLI editor round trip',
      intent: 'Prove agent-authored Objects remain editable in the editor.',
    },
    scene: { type: 'player', width: 800, height: 450, background: '$background', controls: true, children: [] },
    elements: {},
  }, null, 2)}\n`, 'utf8');

  await runElucim([
    'add-element',
    seed,
    '--id', 'concept-card',
    '--type', 'rect',
    '--props-json', '{"x":120,"y":120,"width":260,"height":130,"rx":16,"fill":"$surface","stroke":"$primary","strokeWidth":3,"opacity":0}',
    '--layout-json', '{"x":120,"y":120,"width":260,"height":130}',
    '--role', 'object',
    '--intent-json', '{"purpose":"Show the central concept container"}',
    '--out', withCard,
    '--json',
  ]);

  await runElucim([
    'add-element',
    withCard,
    '--id', 'concept-title',
    '--type', 'text',
    '--props-json', '{"x":150,"y":190,"content":"Agent-authored Object","fill":"$foreground","fontSize":28,"opacity":0}',
    '--layout-json', '{"x":150,"y":170,"width":220,"height":40}',
    '--role', 'label',
    '--intent-json', '{"purpose":"Label the Object added by the CLI"}',
    '--out', withTitle,
    '--json',
  ]);

  await runElucim([
    'add-beat',
    withTitle,
    '--id', 'intro',
    '--preset', 'revealFlow',
    '--targets', 'concept-card,concept-title',
    '--duration', '36',
    '--out', withMotion,
    '--json',
  ]);

  await runElucim([
    'create-state-machine',
    withMotion,
    '--timeline', 'intro',
    '--id', 'presentation',
    '--start', 'onStart',
    '--exit-to', 'exit',
    '--out', withMachine,
    '--json',
  ]);

  return JSON.parse(await readFile(withMachine, 'utf8')) as unknown;
}

async function loadDocumentInEditor(page: Page, document: unknown) {
  const docKey = `elucim-e2e-${Date.now()}`;
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: docKey, value: document });
  await page.goto(`/editor.html?document=localStorage&docKey=${encodeURIComponent(docKey)}`);
  await expect(page.locator('.elucim-editor')).toBeVisible({ timeout: 15000 });
}

test.describe('CLI to editor round trip', () => {
  test('opens, previews, edits, and preserves CLI-authored state-machine documents', async ({ page }) => {
    const dir = await mkdtemp(join(tmpdir(), 'elucim-cli-editor-'));
    try {
      const cliDocument = await makeCliAuthoredDocument(dir);
      await loadDocumentInEditor(page, cliDocument);

      await page.getByRole('tab', { name: 'Design workspace' }).click();
      await expect(page.getByRole('treeitem').filter({ hasText: 'concept-card' })).toBeVisible();
      await expect(page.getByRole('treeitem').filter({ hasText: 'concept-title' })).toBeVisible();
      await expect(page.locator('[data-editor-id="concept-card"]')).toBeVisible();

      await page.getByRole('tab', { name: 'State Machine workspace' }).click();
      await expect(page.getByLabel('State machine graph presentation')).toBeVisible();
      const conceptCard = page.locator('[data-measure-id="concept-card"] [data-testid="elucim-rect"]').first();
      expect(Number(await conceptCard.getAttribute('opacity'))).toBeLessThan(0.01);

      await page.getByRole('button', { name: 'Preview state machine presentation' }).click();
      await expect(page.getByText(/Previewing intro/)).toBeVisible();
      await expect.poll(async () => Number(await conceptCard.getAttribute('opacity')), { timeout: 6000 }).toBeGreaterThan(0.99);

      await page.getByRole('tab', { name: 'Design workspace' }).click();
      await page.getByRole('tab', { name: 'Create' }).click();
      await page.getByTitle('Rectangle').click();
      await expect(page.locator('[data-editor-id^="rect-"]').first()).toBeVisible();

      await expect.poll(async () => page.evaluate(() => {
        const document = window.__elucimEditor?.getDocument();
        return {
          hasGeneratedRect: Object.keys(document?.elements ?? {}).some(id => id.startsWith('rect-')),
          timelineTargets: [...new Set(document?.timelines?.intro?.tracks.map(track => track.target) ?? [])].sort(),
          stateTimeline: document?.stateMachines?.presentation?.states.intro.timeline,
          defaultStateMachine: document?.defaultStateMachine,
          validationShape: document?.scene.children.includes('concept-card') && Boolean(document?.elements['concept-title']),
        };
      })).toEqual({
        hasGeneratedRect: true,
        timelineTargets: ['concept-card', 'concept-title'],
        stateTimeline: 'intro',
        defaultStateMachine: 'presentation',
        validationShape: true,
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
