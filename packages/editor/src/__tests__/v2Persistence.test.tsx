/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ElucimV2Document } from '@elucim/dsl';
import { normalizeToV2, toRenderableV1, validateV2 } from '@elucim/dsl';
import { ElucimEditor } from '../ElucimEditor';

const v2Fixture: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, durationInFrames: 90, children: ['title', 'metric'] },
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
      initial: 'idle',
      states: {
        idle: { on: { start: { target: 'intro', timeline: 'intro' } } },
        intro: { timeline: 'intro' },
      },
    },
  },
  metadata: { polishLevel: 'draft', intent: 'CutReady persistence fixture', generatedBy: 'test' },
};

describe('v2 editor persistence', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.CSS = { escape: (value: string) => value } as any;
  });

  afterEach(() => cleanup());

  it('keeps legacy-rootless visuals valid through edit, v2 callback, validation, and renderable conversion', async () => {
    const normalized = normalizeToV2({
      version: 1,
      title: 'Legacy visual',
      elements: [{ type: 'text', id: 'caption', text: 'Before' }],
    });
    const onV2DocumentChange = vi.fn();

    render(React.createElement(ElucimEditor, { initialDocument: normalized.document, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'Hierarchy' }));
    fireEvent.click(screen.getAllByText('caption')[0]);
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'After' } });

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document | undefined;
      expect(latest?.elements.caption.props.content).toBe('After');
      expect(validateV2(latest).valid).toBe(true);
      expect(toRenderableV1(latest).root.children).toHaveLength(2);
    });
  });

  it('preserves v2 timelines/state machines and updates timeline targets after ID rename', async () => {
    const onV2DocumentChange = vi.fn();
    const onV2CompatibilityWarnings = vi.fn();

    render(React.createElement(ElucimEditor, {
      initialDocument: v2Fixture,
      onV2DocumentChange,
      onV2CompatibilityWarnings,
    }));

    fireEvent.doubleClick(screen.getAllByText('title').at(-1)!);
    fireEvent.change(screen.getByDisplayValue('title'), { target: { value: 'hero-title' } });
    fireEvent.blur(screen.getByDisplayValue('hero-title'));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document | undefined;
      expect(latest?.elements['hero-title'].intent?.role).toBe('title');
      expect(latest?.timelines?.intro.tracks[0].target).toBe('hero-title');
      expect(latest?.stateMachines?.deck.states.intro.timeline).toBe('intro');
      expect(validateV2(latest).valid).toBe(true);
    });
    expect(onV2CompatibilityWarnings.mock.calls.flat().join('\n')).toContain('renamed to "hero-title"');
  });

  it('applies safe polish nudges through onV2DocumentChange', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Fixture, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply v2 nudge Mark document as refined' }));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document | undefined;
      expect(latest?.metadata?.polishLevel).toBe('refined');
      expect(validateV2(latest).valid).toBe(true);
    });
  });

  it('lets users dismiss suggested nudges without changing the v2 document', () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Fixture, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss v2 nudge Mark document as refined' }));

    expect(screen.queryByRole('button', { name: 'Apply v2 nudge Mark document as refined' })).toBeNull();
    expect(onV2DocumentChange).not.toHaveBeenCalled();
  });
});
