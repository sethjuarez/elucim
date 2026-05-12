import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
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

const fixtureDir = fileURLToPath(new URL('../../fixtures/agent/', import.meta.url));
const agentFixtures = [
  'concept-card.elc',
  'animated-state-machine.elc',
] as const;

describe('elucim CLI', () => {
  it('exposes a discoverable operation catalog', async () => {
    const output = capture();
    const code = await runCli(['ops', '--json'], output.io);

    expect(code).toBe(0);
    const payload = JSON.parse(output.stdout());
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('inspect');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('add-element');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('update-element');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('add-connector');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('sample-beats');
    expect(payload.cli.commands.map((command: { name: string }) => command.name)).toContain('create-state-machine');
    expect(payload.cli.commands.every((command: { examples: unknown[] }) => command.examples.length > 0)).toBe(true);
    expect(payload.cli.commands.find((command: { name: string }) => command.name === 'create-state-machine').examples[0].argv)
      .toEqual(expect.arrayContaining(['create-state-machine', '--timeline', '--id']));
    expect(payload.cli.recommendedWorkflows).toContainEqual(expect.objectContaining({
      goal: 'Author a playable animated Elucim Document',
      commands: expect.arrayContaining(['add-element', 'add-beat', 'create-state-machine', 'validate', 'export-frames']),
    }));
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('inspectPolishHeuristics');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('createStepCardPreset');
    expect(payload.agentOperations.map((operation: { name: string }) => operation.name)).toContain('createSemanticMotionTimeline');
    expect(payload.cli.commands.map((command: { usage: string; description: string }) => `${command.usage} ${command.description}`).join(' '))
      .not.toMatch(/\bv[12]\b/i);
  });

  it('validates documents with structured JSON', async () => {
    await withTempDoc(doc, async file => {
      const output = capture();
      const code = await runCli(['validate', file, '--json'], output.io);

      expect(code).toBe(0);
      expect(JSON.parse(output.stdout()).validation.valid).toBe(true);
    });
  });

  it('ships valid copyable agent fixtures', async () => {
    for (const fixture of agentFixtures) {
      const file = join(fixtureDir, fixture);
      const validate = capture();
      const inspect = capture();

      expect(await runCli(['validate', file, '--json'], validate.io)).toBe(0);
      expect(JSON.parse(validate.stdout()).validation.valid).toBe(true);

      expect(await runCli(['inspect', file, '--json'], inspect.io)).toBe(0);
      expect(JSON.parse(inspect.stdout()).summary.elementCount).toBeGreaterThan(0);
    }

    const frames = capture();
    expect(await runCli([
      'export-frames',
      join(fixtureDir, 'animated-state-machine.elc'),
      '--timeline', 'intro',
      '--frames', '0,24,48',
      '--json',
    ], frames.io)).toBe(0);
    expect(JSON.parse(frames.stdout()).summaries).toHaveLength(3);
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

  it('writes in-place updates atomically without leaving temporary files', async () => {
    await withTempDoc(doc, async (file, dir) => {
      const output = capture();
      const code = await runCli(['polish', file, '--apply-safe', '--in-place', '--json'], output.io);

      expect(code).toBe(0);
      const next = JSON.parse(await readFile(file, 'utf8'));
      expect(next.elements.title.props.fontSize).toBe(40);
      expect(await readdir(dir)).toEqual(['diagram.elc']);
    });
  });

  it('adds, updates, and deletes arbitrary Objects from the CLI', async () => {
    await withTempDoc({
      version: '2.0',
      scene: { type: 'player', width: 640, height: 360, children: [] },
      elements: {},
    }, async (file, dir) => {
      const withObject = join(dir, 'with-object.elc');
      const updated = join(dir, 'updated.elc');
      const deleted = join(dir, 'deleted.elc');
      const add = capture();
      const update = capture();
      const remove = capture();

      expect(await runCli([
        'add-element',
        file,
        '--id', 'agent-rect',
        '--type', 'rect',
        '--props-json', '{"x":80,"y":90,"width":160,"height":80,"fill":"$primary","opacity":0}',
        '--layout-json', '{"x":80,"y":90,"width":160,"height":80}',
        '--role', 'object',
        '--intent-json', '{"purpose":"Show the concept container"}',
        '--out', withObject,
        '--json',
      ], add.io)).toBe(0);
      expect(JSON.parse(add.stdout()).validation.valid).toBe(true);

      expect(await runCli([
        'update-element',
        withObject,
        '--id', 'agent-rect',
        '--props-json', '{"fill":"$secondary","opacity":1}',
        '--layout-json', '{"x":96,"y":110,"width":180,"height":96}',
        '--out', updated,
        '--json',
      ], update.io)).toBe(0);
      const updatedDoc = JSON.parse(await readFile(updated, 'utf8'));
      expect(updatedDoc.scene.children).toContain('agent-rect');
      expect(updatedDoc.elements['agent-rect']).toMatchObject({
        type: 'rect',
        role: 'object',
        intent: { purpose: 'Show the concept container' },
        layout: { x: 96, y: 110, width: 180, height: 96 },
        props: expect.objectContaining({ type: 'rect', fill: '$secondary', opacity: 1 }),
      });

      expect(await runCli(['delete-element', updated, '--id', 'agent-rect', '--out', deleted, '--json'], remove.io)).toBe(0);
      const deletedDoc = JSON.parse(await readFile(deleted, 'utf8'));
      expect(deletedDoc.scene.children).not.toContain('agent-rect');
      expect(deletedDoc.elements['agent-rect']).toBeUndefined();
    });
  });

  it('reports JSON flag context and does not write invalid Object updates', async () => {
    await withTempDoc({
      version: '2.0',
      scene: { type: 'player', width: 640, height: 360, children: [] },
      elements: {},
    }, async (file, dir) => {
      const invalidJson = capture();
      const invalidDoc = capture();
      const out = join(dir, 'invalid.elc');

      expect(await runCli(['add-element', file, '--id', 'bad', '--type', 'rect', '--props-json', '{"x":}', '--json'], invalidJson.io)).toBe(1);
      expect(JSON.parse(invalidJson.stderr()).error).toContain('Invalid JSON for --props-json');

      expect(await runCli([
        'add-element',
        file,
        '--id', 'bad-group',
        '--type', 'group',
        '--children-json', '["missing-child"]',
        '--out', out,
        '--json',
      ], invalidDoc.io)).toBe(1);
      const payload = JSON.parse(invalidDoc.stdout());
      expect(payload.validation.valid).toBe(false);
      await expect(readFile(out, 'utf8')).rejects.toThrow();
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

  it('supports an agent-friendly Object, timeline, state-machine, validation, and frame-export workflow', async () => {
    await withTempDoc({
      version: '2.0',
      metadata: {
        title: 'Agent workflow',
        intent: 'Author an animated concept card through CLI contracts.',
      },
      scene: { type: 'player', width: 800, height: 450, children: [] },
      elements: {},
    }, async (file, dir) => {
      const objectDoc = join(dir, 'object.elc');
      const motionDoc = join(dir, 'motion.elc');
      const machineDoc = join(dir, 'machine.elc');

      const addObject = capture();
      expect(await runCli([
        'add-step-card',
        file,
        '--id', 'concept',
        '--x', '120',
        '--y', '96',
        '--title', 'Elucim Document',
        '--body', 'Agents author Objects, then animate them through state machines.',
        '--out', objectDoc,
        '--json',
      ], addObject.io)).toBe(0);
      expect(JSON.parse(addObject.stdout()).added).toContain('concept');

      const addMotion = capture();
      expect(await runCli([
        'add-beat',
        objectDoc,
        '--id', 'intro',
        '--preset', 'revealFlow',
        '--targets', 'concept',
        '--duration', '36',
        '--out', motionDoc,
        '--json',
      ], addMotion.io)).toBe(0);
      expect(JSON.parse(addMotion.stdout()).timeline).toMatchObject({ id: 'intro', duration: 36 });

      const createMachine = capture();
      expect(await runCli([
        'create-state-machine',
        motionDoc,
        '--timeline', 'intro',
        '--id', 'presentation',
        '--start', 'onStart',
        '--exit-to', 'exit',
        '--out', machineDoc,
        '--json',
        '--print-document',
      ], createMachine.io)).toBe(0);
      const machinePayload = JSON.parse(createMachine.stdout());
      expect(machinePayload.validation.valid).toBe(true);
      expect(machinePayload.summaries).toContain('Added state machine "presentation".');
      expect(machinePayload.document.defaultStateMachine).toBe('presentation');
      expect(machinePayload.document.stateMachines.presentation.states.intro.timeline).toBe('intro');
      expect(machinePayload.document.stateMachines.presentation.transitions).toEqual(expect.arrayContaining([
        expect.objectContaining({ from: 'entry', to: 'intro', trigger: 'onStart' }),
        expect.objectContaining({ from: 'intro', to: 'exit', exitTime: 1 }),
      ]));

      const validate = capture();
      expect(await runCli(['validate', machineDoc, '--json'], validate.io)).toBe(0);
      expect(JSON.parse(validate.stdout()).validation.valid).toBe(true);

      const inspect = capture();
      expect(await runCli(['inspect', machineDoc, '--json'], inspect.io)).toBe(0);
      const inspectPayload = JSON.parse(inspect.stdout());
      expect(inspectPayload.summary.elementCount).toBeGreaterThan(0);
      expect(inspectPayload.quality.issues.map((issue: { code: string }) => issue.code)).not.toContain('missing-state-machine');

      const frames = capture();
      expect(await runCli([
        'export-frames',
        machineDoc,
        '--timeline', 'intro',
        '--frames', '0,18,36',
        '--json',
        '--print-document',
      ], frames.io)).toBe(0);
      const framePayload = JSON.parse(frames.stdout());
      expect(framePayload.summaries).toEqual([
        expect.objectContaining({ frame: 0 }),
        expect.objectContaining({ frame: 18 }),
        expect.objectContaining({ frame: 36, visibleElementIds: expect.arrayContaining(['concept']) }),
      ]);
      expect(framePayload.documents[framePayload.documents.length - 1].document.elements.concept.props.opacity).toBeGreaterThan(0.99);
    });
  });

  it('rejects explicit state-machine id collisions for agent-safe follow-up commands', async () => {
    await withTempDoc({
      ...flowDoc,
      timelines: {
        intro: {
          id: 'intro',
          duration: 24,
          tracks: [{ target: 'start', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 24, value: 1 }] }],
        },
      },
      stateMachines: {
        presentation: {
          id: 'presentation',
          entry: 'intro',
          states: { intro: { timeline: 'intro' } },
          transitions: [{ id: 'entry-start', from: 'entry', to: 'intro', trigger: 'onStart' }],
        },
      },
    }, async file => {
      const output = capture();
      const code = await runCli(['create-state-machine', file, '--timeline', 'intro', '--id', 'presentation', '--json'], output.io);

      expect(code).toBe(1);
      expect(JSON.parse(output.stderr()).error).toBe('State machine "presentation" already exists.');
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
