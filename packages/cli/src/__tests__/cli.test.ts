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

describe('elucim CLI', () => {
  it('exposes a discoverable operation catalog', async () => {
    const output = capture();
    const code = await runCli(['ops', '--json'], output.io);

    expect(code).toBe(0);
    const payload = JSON.parse(output.stdout());
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('inspect');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('inspectPolishHeuristics');
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
});
