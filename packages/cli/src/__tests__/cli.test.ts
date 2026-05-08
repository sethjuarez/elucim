import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runCli } from '../index';

function capture() {
  let stdout = '';
  let stderr = '';
  return {
    io: {
      stdout: (value: string) => { stdout += value; },
      stderr: (value: string) => { stderr += value; },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

async function withTempDoc<T>(doc: unknown, run: (file: string, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'elucim-cli-'));
  try {
    const file = join(dir, 'diagram.elc');
    await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    return await run(file, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const doc = {
  version: '2.0',
  scene: { type: 'player', width: 400, height: 240, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      props: { type: 'text', x: 40, y: 80, content: 'Hello', fontSize: 12 },
    },
  },
};

const flowDoc = {
  version: '2.0',
  scene: { type: 'player', width: 700, height: 360, children: ['start', 'end'] },
  elements: {
    start: {
      id: 'start',
      type: 'rect',
      layout: { x: 80, y: 120, width: 120, height: 80 },
      props: { type: 'rect', x: 80, y: 120, width: 120, height: 80, fill: '$surface' },
    },
    end: {
      id: 'end',
      type: 'rect',
      layout: { x: 420, y: 120, width: 120, height: 80 },
      props: { type: 'rect', x: 420, y: 120, width: 120, height: 80, fill: '$surface' },
    },
  },
};

describe('elucim CLI', () => {
  it('exposes a discoverable operation catalog', async () => {
    const output = capture();
    const code = await runCli(['ops', '--json'], output.io);

    expect(code).toBe(0);
    const payload = JSON.parse(output.stdout());
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('inspect');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('add-connector');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('inspectPolishHeuristics');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('createStepCardPreset');
  });

  it('validates documents with structured JSON', async () => {
    await withTempDoc(doc, async file => {
      const output = capture();
      const code = await runCli(['validate', file, '--json'], output.io);

      expect(code).toBe(0);
      expect(JSON.parse(output.stdout()).validation.valid).toBe(true);
    });
  });

  it('inspects raw heuristics', async () => {
    await withTempDoc(doc, async file => {
      const output = capture();
      const code = await runCli(['inspect', file, '--json'], output.io);

      expect(code).toBe(0);
      const payload = JSON.parse(output.stdout());
      expect(payload.heuristics.text).toContainEqual(expect.objectContaining({ id: 'title', belowMinimumSize: true }));
    });
  });

  it('applies safe polish nudges to an output file', async () => {
    await withTempDoc(doc, async (file, dir) => {
      const out = join(dir, 'polished.elc');
      const output = capture();
      const code = await runCli(['polish', file, '--apply-safe', '--out', out, '--json'], output.io);

      expect(code).toBe(0);
      const payload = JSON.parse(output.stdout());
      expect(payload.applied.map((item: { id: string }) => item.id)).toContain('polish-text-readability');
      const next = JSON.parse(await readFile(out, 'utf8'));
      expect(next.elements.title.props.fontSize).toBe(40);
    });
  });

  it('adds editable composite groups to documents', async () => {
    await withTempDoc(doc, async (file, dir) => {
      const out = join(dir, 'card.elc');
      const output = capture();
      const code = await runCli([
        'add-step-card',
        file,
        '--id', 'draft',
        '--x', '80',
        '--y', '120',
        '--title', 'Draft',
        '--body', 'Start from a shaped card.',
        '--out', out,
        '--json',
      ], output.io);

      expect(code).toBe(0);
      const payload = JSON.parse(output.stdout());
      expect(payload.added).toContain('draft');
      const next = JSON.parse(await readFile(out, 'utf8'));
      expect(next.scene.children).toContain('draft');
      expect(next.elements.draft).toMatchObject({ type: 'group', role: 'stepCard' });
      expect(next.elements['draft-card'].props.fill).toBe('$surface');
    });
  });

  it('adds semantic connectors between measured elements', async () => {
    await withTempDoc(flowDoc, async (file, dir) => {
      const out = join(dir, 'connected.elc');
      const output = capture();
      const code = await runCli([
        'add-connector',
        file,
        '--id', 'start-to-end',
        '--from', 'start',
        '--to', 'end',
        '--label', 'next',
        '--line-style', 'dashed',
        '--start-cap', 'dot',
        '--end-cap', 'arrow',
        '--stroke-width', '4',
        '--out', out,
        '--json',
      ], output.io);

      expect(code).toBe(0);
      const next = JSON.parse(await readFile(out, 'utf8'));
      expect(next.elements['start-to-end']).toMatchObject({
        type: 'group',
        role: 'connector',
        intent: { flowFrom: ['start'], flowTo: ['end'] },
      });
      expect(next.elements['start-to-end-curve'].type).toBe('bezierCurve');
      expect(next.elements['start-to-end-curve'].props).toMatchObject({
        lineStyle: 'dashed',
        startCap: 'dot',
        endCap: 'arrow',
        strokeWidth: 4,
      });
    });
  });
});
