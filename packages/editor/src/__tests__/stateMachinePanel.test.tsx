/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ElucimV2Document } from '@elucim/dsl';
import { ElucimEditor } from '../ElucimEditor';

const v2Document: ElucimV2Document = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, durationInFrames: 90, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      intent: { role: 'title', importance: 'primary', generated: true },
      props: { type: 'text', content: 'Hello', x: 100, y: 120 },
    },
  },
  timelines: {
    idle: { id: 'idle', duration: 1, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 1 }] }] },
    intro: { id: 'intro', duration: 30, tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }] },
  },
  stateMachines: {
    deck: {
      id: 'deck',
      initial: 'idle',
      states: {
        idle: { timeline: 'idle', on: { start: { target: 'intro', timeline: 'intro' } } },
        intro: { timeline: 'intro' },
      },
    },
  },
  metadata: { polishLevel: 'draft', intent: 'Explain the CutReady flow' },
};

describe('StateMachinePanel', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.CSS = { escape: (value: string) => value } as any;
  });

  afterEach(() => {
    cleanup();
  });

  it('previews v2 state machines from initial documents', () => {
    render(React.createElement(ElucimEditor, { initialDocument: v2Document }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));

    expect(screen.getByLabelText('State machine')).toBeTruthy();
    expect(screen.getAllByText('idle').length).toBeGreaterThan(0);
    expect(screen.getByText('Timeline: idle')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    expect(screen.getAllByText('intro').length).toBeGreaterThan(0);
    expect(screen.getByText('Timeline: intro')).toBeTruthy();
  });

  it('edits v2 metadata and selected element intent without losing v2 extras', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Document, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));
    fireEvent.change(screen.getByLabelText('V2 polish level'), { target: { value: 'refined' } });

    await waitFor(() => expect(onV2DocumentChange).toHaveBeenCalled());
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].metadata.polishLevel).toBe('refined');
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].timelines?.intro).toBeTruthy();
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines?.deck).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Hierarchy' }));
    fireEvent.click(screen.getAllByText('title')[0]);
    fireEvent.click(screen.getByRole('tab', { name: 'States' }));
    fireEvent.change(screen.getByLabelText('V2 selected role'), { target: { value: 'hero' } });

    await waitFor(() => expect(onV2DocumentChange.mock.calls.at(-1)?.[0].elements.title.intent.role).toBe('hero'));
  });

  it('surfaces warnings for lossy v2 compatibility output', () => {
    render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...v2Document,
        elements: {
          ...v2Document.elements,
          ghost: { id: 'ghost', type: 'text', props: { type: 'text', content: 'Hidden', x: 100, y: 200 } },
        },
        timelines: {
          ...v2Document.timelines,
          ghostTimeline: {
            id: 'ghostTimeline',
            duration: 10,
            tracks: [{ target: 'ghost', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 10, value: 1 }] }],
          },
        },
      },
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));

    expect(screen.getByText('V2 compatibility warnings')).toBeTruthy();
    expect(screen.getByText(/Timeline "ghostTimeline"/)).toBeTruthy();
  });

  it('creates state machines and authors states/transitions from the panel', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: { ...v2Document, stateMachines: undefined },
      onV2DocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'States' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create v2 state machine' }));

    await waitFor(() => expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines?.deck).toBeTruthy());
    fireEvent.change(screen.getByLabelText('V2 new state id'), { target: { value: 'focus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add v2 state' }));

    await waitFor(() => expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines.deck.states.focus).toBeTruthy());
    fireEvent.change(screen.getByLabelText('V2 new transition event'), { target: { value: 'advance' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add v2 transition' }));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      expect(latest.stateMachines?.deck.states.focus.on?.advance).toEqual({ target: 'idle' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove v2 state focus' }));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      expect(latest.stateMachines?.deck.states.focus).toBeUndefined();
      expect(latest.stateMachines?.deck.initial).toBe('idle');
    });
  });
});
