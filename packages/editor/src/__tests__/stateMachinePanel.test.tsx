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
      reset: 'idle',
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

  it('previews state machines in the motion graph', () => {
    render(React.createElement(ElucimEditor, { initialDocument: v2Document }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));

    expect(screen.queryByText('Animation timeline')).toBeNull();
    expect(screen.getByRole('tab', { name: 'State machines motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Animations motion tab' })).toBeTruthy();
    expect(screen.getByLabelText('State machine graph deck')).toBeTruthy();
    expect(screen.getByLabelText('State machine graph canvas deck')).toBeTruthy();
    expect(screen.queryByText('Add a transition to connect states.')).toBeNull();
    expect(screen.getByLabelText('State machine deck reset state')).toBeTruthy();
    expect(screen.getByText('animation: idle')).toBeTruthy();
    expect(screen.getAllByText('idle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('intro').length).toBeGreaterThan(0);
  });

  it('opens normalized documents in the animate workspace with animations visible', () => {
    render(React.createElement(ElucimEditor, { initialDocument: v2Document }));

    expect(screen.getByRole('tab', { name: 'Animate workspace' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Animations motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Animation clips')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select animation idle' })).toBeTruthy();
  });

  it('uses the bottom motion area for the state machine workspace', () => {
    render(React.createElement(ElucimEditor, { initialDocument: v2Document }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));

    expect(screen.getByRole('tab', { name: 'State Machine workspace' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('State machine graph deck')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select state machine deck' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Animations motion tab' }));

    expect(screen.getByRole('tab', { name: 'Animations motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Select animation idle' })).toBeTruthy();
    expect(screen.queryByLabelText('State machine graph deck')).toBeNull();
  });

  it('renders state machine graph nodes with persisted layout metadata', () => {
    const onV2DocumentChange = vi.fn();
    const { container } = render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...v2Document,
        stateMachines: {
          deck: {
            ...v2Document.stateMachines!.deck,
            layout: { states: { idle: { x: 120, y: 140 } } },
          },
        },
      },
      onV2DocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    const node = container.querySelector('.react-flow__node[data-id="idle"]');
    expect(node).toBeTruthy();
    expect(onV2DocumentChange).not.toHaveBeenCalled();
  });

  it('edits v2 metadata and selected element intent without losing v2 extras', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Document, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish workspace' }));
    fireEvent.change(screen.getByLabelText('Polish level'), { target: { value: 'refined' } });

    await waitFor(() => expect(onV2DocumentChange).toHaveBeenCalled());
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].metadata.polishLevel).toBe('refined');
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].timelines?.intro).toBeTruthy();
    expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines?.deck).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Design workspace' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Hierarchy' }));
    fireEvent.click(screen.getAllByText('title')[0]);
    fireEvent.click(screen.getByRole('tab', { name: 'Polish workspace' }));
    fireEvent.change(screen.getByLabelText('Selected role'), { target: { value: 'hero' } });

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

    fireEvent.click(screen.getByRole('tab', { name: 'Polish workspace' }));

    expect(screen.getByText('Document compatibility warnings')).toBeTruthy();
    expect(screen.getByText(/Timeline "ghostTimeline"/)).toBeTruthy();
  });

  it('creates state machines and authors states/transitions from the motion graph', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: { ...v2Document, stateMachines: undefined },
      onV2DocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add state machine' }));

    await waitFor(() => expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines?.['state-machine']).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add state to state-machine' }));

    await waitFor(() => expect(onV2DocumentChange.mock.calls.at(-1)?.[0].stateMachines['state-machine'].states.state).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Add transition from state' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove state state' }));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      expect(latest.stateMachines?.['state-machine'].states.state).toBeUndefined();
      expect(latest.stateMachines?.['state-machine'].initial).toBe('idle');
    });
  });

  it('renames state machines and states while preserving references', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Document, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    fireEvent.change(screen.getByLabelText('Rename state machine deck'), { target: { value: 'Deck Flow' } });
    fireEvent.blur(screen.getByLabelText('Rename state machine deck'));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      expect(latest.stateMachines?.['deck-flow']?.id).toBe('deck-flow');
      expect(latest.stateMachines?.deck).toBeUndefined();
    });

    fireEvent.click(screen.getByLabelText('Select graph state idle'));
    fireEvent.change(screen.getByLabelText('Rename state idle'), { target: { value: 'Ready' } });
    fireEvent.blur(screen.getByLabelText('Rename state idle'));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      const machine = latest.stateMachines?.['deck-flow'];
      expect(machine?.states.ready).toBeTruthy();
      expect(machine?.states.idle).toBeUndefined();
      expect(machine?.initial).toBe('ready');
      expect(machine?.reset).toBe('ready');
      expect(machine?.states.ready.on?.start).toEqual({ target: 'intro', timeline: 'intro' });
    });
  });

  it('renames state machines from the motion list on double click', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: v2Document, onV2DocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Select state machine deck' }));
    const renameInput = await screen.findByLabelText('Rename state machine deck inline');
    fireEvent.change(renameInput, { target: { value: 'Deck Flow' } });
    fireEvent.blur(renameInput);

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      expect(latest.stateMachines?.['deck-flow']?.id).toBe('deck-flow');
      expect(latest.stateMachines?.deck).toBeUndefined();
    });
  });

  it('clears transitions and onComplete references when deleting a state', async () => {
    const onV2DocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...v2Document,
        stateMachines: {
          deck: {
            ...v2Document.stateMachines!.deck,
            states: {
              idle: {
                timeline: 'idle',
                on: { start: { target: 'intro', timeline: 'intro' } },
                onComplete: { target: 'intro', timeline: 'intro' },
              },
              intro: { timeline: 'intro' },
            },
          },
        },
      },
      onV2DocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    fireEvent.click(screen.getByLabelText('Select graph state intro'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove state intro' }));

    await waitFor(() => {
      const latest = onV2DocumentChange.mock.calls.at(-1)?.[0] as ElucimV2Document;
      const idle = latest.stateMachines?.deck.states.idle;
      expect(latest.stateMachines?.deck.states.intro).toBeUndefined();
      expect(idle?.on).toBeUndefined();
      expect(idle?.onComplete).toBeUndefined();
    });
  });
});
