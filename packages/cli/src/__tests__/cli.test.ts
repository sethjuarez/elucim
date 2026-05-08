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
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('sample-beats');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('inspectPolishHeuristics');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('createStepCardPreset');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('createSemanticMotionTimeline');
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

  it('adds semantic motion beats and samples beat diffs', async () => {
    await withTempDoc(flowDoc, async (file, dir) => {
      const out = join(dir, 'motion.elc');
      const output = capture();
      const addCode = await runCli([
        'add-beat',
        file,
        '--id', 'intro-flow',
        '--preset', 'revealFlow',
        '--targets', 'start,end',
        '--duration', '48',
        '--out', out,
        '--json',
      ], output.io);

      expect(addCode).toBe(0);
      const next = JSON.parse(await readFile(out, 'utf8'));
      expect(next.timelines['intro-flow'].tracks.map((track: { target: string }) => track.target)).toContain('start');

      const sample = capture();
      const sampleCode = await runCli(['sample-beats', out, '--timeline', 'intro-flow', '--beats', '3', '--json'], sample.io);

      expect(sampleCode).toBe(0);
      const payload = JSON.parse(sample.stdout());
      expect(payload.preview.length).toBe(3);
      expect(payload.lint.score).toBeGreaterThan(0);
    });
  });

  it('creates reduced-motion and final-frame outputs from CLI motion commands', async () => {
    await withTempDoc({
      ...flowDoc,
      elements: {
        ...flowDoc.elements,
        start: { ...flowDoc.elements.start, props: { ...flowDoc.elements.start.props, opacity: 0 } },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 24,
          tracks: [{ target: 'start', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 24, value: 1 }] }],
        },
      },
    }, async (file, dir) => {
      const reducedOut = join(dir, 'reduced.elc');
      const finalOut = join(dir, 'final.elc');
      const reduced = capture();
      const final = capture();

      expect(await runCli(['reduced-motion', file, '--mode', 'minimal', '--max-duration', '12', '--out', reducedOut, '--json'], reduced.io)).toBe(0);
      expect(await runCli(['hold-final', file, '--timeline', 'intro', '--out', finalOut, '--json'], final.io)).toBe(0);

      const reducedDoc = JSON.parse(await readFile(reducedOut, 'utf8'));
      const finalDoc = JSON.parse(await readFile(finalOut, 'utf8'));
      expect(reducedDoc.timelines.intro.duration).toBe(12);
      expect(finalDoc.elements.start.props.opacity).toBe(1);
    });
  });

  it('reports missing export-frame timelines directly', async () => {
    await withTempDoc(flowDoc, async file => {
      const output = capture();
      const code = await runCli(['export-frames', file, '--timeline', 'missing', '--json'], output.io);

      expect(code).toBe(1);
      expect(JSON.parse(output.stderr()).error).toBe('Timeline "missing" does not exist.');
    });
  });
});
