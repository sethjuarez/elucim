/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ElucimDocument } from '@elucim/dsl';
import { normalizeDocument, toRenderableDocument, validateDocument } from '@elucim/dsl';
import { ElucimEditor } from '../ElucimEditor';

const canonicalFixture: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title', 'metric'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      intent: { role: 'title', importance: 'primary', generated: true, hints: ['Keep readable'] },
      props: { type: 'text', content: 'Original title', x: 100, y: 120 },
    },
    metric: {
      id: 'metric',
      type: 'text',
      intent: { role: 'metric', importance: 'secondary' },
      props: { type: 'text', content: '42%', x: 100, y: 200 },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 30,
      tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
    },
  },
  stateMachines: {
    deck: {
      id: 'deck',
      entry: 'idle',
      inputs: { start: { type: 'trigger' } },
      states: {
        idle: {},
        intro: { timeline: 'intro' },
      },
      transitions: [
        { id: 'idle-start', from: 'idle', to: 'intro', trigger: 'start' },
        { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
      ],
    },
  },
  metadata: { polishLevel: 'draft', intent: 'CutReady persistence fixture', generatedBy: 'test' },
};

describe('canonical document editor persistence', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.CSS = { escape: (value: string) => value } as any;
  });

  afterEach(() => cleanup());

  it('keeps legacy-rootless visuals valid through edit, canonical callback, validation, and renderable conversion', async () => {
    const normalized = normalizeDocument({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'text', id: 'caption', text: 'Before' }],
    });
    const onDocumentChange = vi.fn();

    render(React.createElement(ElucimEditor, { initialDocument: normalized.document, onDocumentChange }));

    fireEvent.click(screen.getByRole('button', { name: 'Show Inspector' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Objects' }));
    fireEvent.click(screen.getAllByText('caption')[0]);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'After' } });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.elements.caption.props.content).toBe('After');
      expect(validateDocument(latest).valid).toBe(true);
      expect(toRenderableDocument(latest).root.children).toHaveLength(2);
    });
  });

  it('preserves canonical timelines/state machines and updates timeline targets after ID rename', async () => {
    const onDocumentChange = vi.fn();
    const onCompatibilityWarnings = vi.fn();

    render(React.createElement(ElucimEditor, {
      initialDocument: canonicalFixture,
      onDocumentChange,
      onCompatibilityWarnings,
    }));

    fireEvent.doubleClick(screen.getAllByText('title').at(-1)!);
    const renameInput = screen.getAllByDisplayValue('title').find(element => element.tagName === 'INPUT')!;
    fireEvent.change(renameInput, { target: { value: 'hero-title' } });
    fireEvent.blur(screen.getByDisplayValue('hero-title'));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.elements['hero-title'].intent?.role).toBe('title');
      expect(latest?.timelines?.intro.tracks[0].target).toBe('hero-title');
      expect(latest?.stateMachines?.deck.states.intro.timeline).toBe('intro');
      expect(validateDocument(latest).valid).toBe(true);
    });
    expect(onCompatibilityWarnings.mock.calls.flat().join('\n')).toContain('renamed to "hero-title"');
  });

  it('preserves canonical-only element layout fields through editor round-trips', async () => {
    const onDocumentChange = vi.fn();
    const documentWithLayout: ElucimDocument = {
      ...canonicalFixture,
      elements: {
        ...canonicalFixture.elements,
        title: {
          ...canonicalFixture.elements.title,
          layout: { x: 100, y: 120, scale: 1.15, role: 'callout' },
          props: { type: 'text', content: 'Original title' },
        },
      },
    };

    render(React.createElement(ElucimEditor, { initialDocument: documentWithLayout, onDocumentChange }));

    fireEvent.click(screen.getByRole('button', { name: 'Show Inspector' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Objects' }));
    fireEvent.click(screen.getAllByText('title')[0]);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Updated title' } });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.elements.title.props.content).toBe('Updated title');
      expect(latest?.elements.title.layout).toMatchObject({ x: 100, y: 120, scale: 1.15, role: 'callout' });
      expect(validateDocument(latest).valid).toBe(true);
    });
  });

  it('keeps scene layout and legacy duration while committing dragged keyframes to the dropped frame', async () => {
    const onDocumentChange = vi.fn();

    function ControlledEditor() {
      const [document, setDocument] = React.useState<ElucimDocument>(canonicalFixture);
      return React.createElement(ElucimEditor, {
        initialDocument: document,
        onDocumentChange: nextDocument => {
          onDocumentChange(nextDocument);
          setDocument(nextDocument);
        },
      });
    }

    render(React.createElement(ControlledEditor));

    fireEvent.click(screen.getByRole('button', { name: 'Show Inspector' }));
    const sceneWidthInput = screen.getByLabelText('Width') as HTMLInputElement;
    fireEvent.change(sceneWidthInput, { target: { value: '1' } });
    expect(onDocumentChange).not.toHaveBeenCalled();
    fireEvent.change(sceneWidthInput, { target: { value: '900' } });
    expect(onDocumentChange).not.toHaveBeenCalled();
    fireEvent.blur(sceneWidthInput);

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.scene.width).toBe(900);
    });
    onDocumentChange.mockClear();

    expect(screen.getByText('Duration is defined by timelines, state-machine preview, or export policy.')).toBeTruthy();

    const keyframe = await screen.findByRole('button', { name: 'Go to intro title.opacity keyframe 30' });
    const lane = keyframe.parentElement!;
    lane.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 20,
      width: 300,
      height: 20,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(keyframe, { clientX: 300 });
    fireEvent.pointerMove(keyframe, { clientX: 140 });
    fireEvent.pointerUp(keyframe, { clientX: 140 });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect('durationInFrames' in (latest?.scene ?? {})).toBe(false);
      expect(latest?.timelines?.intro.tracks[0].keyframes[1].frame).toBe(14);
    });
  });

  it('applies safe polish nudges through onDocumentChange', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: canonicalFixture, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply nudge Mark document as refined' }));

    expect(await screen.findByText('Applied Mark document as refined')).toBeTruthy();
    expect(screen.getByText('Updated document metadata.')).toBeTruthy();
    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.metadata?.polishLevel).toBe('refined');
      expect(validateDocument(latest).valid).toBe(true);
    });
    expect((screen.getByLabelText('Polish level') as HTMLSelectElement).value).toBe('refined');
  });

  it('lets users dismiss suggested nudges without changing the canonical document', () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: canonicalFixture, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss nudge Mark document as refined' }));

    expect(screen.queryByRole('button', { name: 'Apply nudge Mark document as refined' })).toBeNull();
    expect(onDocumentChange).not.toHaveBeenCalled();
  });

  it('shows previewed nudge command results before applying', () => {
    render(React.createElement(ElucimEditor, { initialDocument: canonicalFixture }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getAllByText('Previewed changes').length).toBeGreaterThan(0);
    expect(screen.getByText('Updated document metadata.')).toBeTruthy();
  });

  it('prunes deleted timeline references from states and transitions while keeping canonical document valid', async () => {
    const onDocumentChange = vi.fn();
    const onCompatibilityWarnings = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: canonicalFixture,
      onDocumentChange,
      onCompatibilityWarnings,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'Objects' }));
    fireEvent.click(screen.getAllByText('title')[0]);
    fireEvent.keyDown(document, { key: 'Delete' });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument | undefined;
      expect(latest?.timelines?.intro).toBeUndefined();
      expect(latest?.stateMachines?.deck.transitions?.[0]).toMatchObject({ from: 'idle', to: 'intro', trigger: 'start' });
      expect(latest?.stateMachines?.deck.states.intro.timeline).toBeUndefined();
      expect(validateDocument(latest).valid).toBe(true);
    });
    const warnings = onCompatibilityWarnings.mock.calls.flat().join('\n');
    expect(warnings).toContain('references missing timeline "intro"');
  });
});
