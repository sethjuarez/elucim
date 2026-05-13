/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ElucimDocument } from '@elucim/dsl';
import { ElucimEditor } from '../ElucimEditor';

const documentModel: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
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
      entry: 'idle',
      inputs: { start: { type: 'trigger' } },
      states: {
        idle: { timeline: 'idle' },
        intro: { timeline: 'intro' },
      },
      transitions: [
        { id: 'idle-start', from: 'idle', to: 'intro', trigger: 'start' },
        { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
      ],
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
    render(React.createElement(ElucimEditor, { initialDocument: documentModel }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));

    expect(screen.getByRole('tab', { name: 'State machines motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Animations motion tab' })).toBeTruthy();
    expect(screen.getByLabelText('State machine graph deck')).toBeTruthy();
    expect(screen.getByLabelText('State machine graph canvas deck')).toBeTruthy();
    expect(screen.queryByText('Add a transition to connect states.')).toBeNull();
    expect(screen.queryByLabelText('State machine deck reset state')).toBeNull();
    expect(screen.getByRole('button', { name: 'Preview state machine deck' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play state machine deck' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preview state idle animation' })).toBeNull();
    expect(screen.getByText('Preview starts at idle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Trigger start event from idle' })).toBeNull();
    expect(screen.queryByText('Events live on transition edges. Select an edge to edit its event, then fire that event while its source state is active.')).toBeNull();
    expect(screen.queryByText('Event inputs')).toBeNull();
    expect(screen.getAllByText('idle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('idle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('intro').length).toBeGreaterThan(0);
  });

  it('opens normalized documents in the animate workspace with animations visible', () => {
    render(React.createElement(ElucimEditor, { initialDocument: documentModel }));

    expect(screen.getByRole('tab', { name: 'Animations motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Animation clips')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select animation idle' })).toBeTruthy();
  });

  it('stops animation playback when switching to state machines', async () => {
    render(React.createElement(ElucimEditor, { initialDocument: documentModel }));

    fireEvent.click(screen.getByTitle('Play'));
    expect(await screen.findByTitle('Pause')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));

    await waitFor(() => expect(screen.queryByTitle('Pause')).toBeNull());
  });

  it('uses the bottom motion area for state machines', () => {
    render(React.createElement(ElucimEditor, { initialDocument: documentModel }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));

    expect(screen.getByRole('tab', { name: 'State machines motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('State machine graph deck')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select state machine deck' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Animations motion tab' }));

    expect(screen.getByRole('tab', { name: 'Animations motion tab' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Select animation idle' })).toBeTruthy();
    expect(screen.queryByLabelText('State machine graph deck')).toBeNull();
  });

  it('renders state machine graph nodes with persisted layout metadata', () => {
    const onDocumentChange = vi.fn();
    const { container } = render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...documentModel,
        stateMachines: {
          deck: {
            ...documentModel.stateMachines!.deck,
            layout: { entry: { x: 32, y: 146 }, states: { idle: { x: 120, y: 140 } } },
          },
        },
      },
      onDocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    const entryNode = container.querySelector('.react-flow__node[data-id="__entry__"]');
    const node = container.querySelector('.react-flow__node[data-id="idle"]');
    expect(entryNode).toBeTruthy();
    expect(node).toBeTruthy();
    expect(onDocumentChange).not.toHaveBeenCalled();
  });

  it('edits canonical metadata and selected element intent without losing document extras', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: documentModel, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));
    fireEvent.change(screen.getByLabelText('Polish level'), { target: { value: 'refined' } });

    await waitFor(() => expect(onDocumentChange).toHaveBeenCalled());
    expect(onDocumentChange.mock.calls.at(-1)?.[0].metadata.polishLevel).toBe('refined');
    expect(onDocumentChange.mock.calls.at(-1)?.[0].timelines?.intro).toBeTruthy();
    expect(onDocumentChange.mock.calls.at(-1)?.[0].stateMachines?.deck).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Objects' }));
    fireEvent.click(screen.getAllByText('title')[0]);
    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));
    fireEvent.change(screen.getByLabelText('Selected role'), { target: { value: 'hero' } });

    await waitFor(() => expect(onDocumentChange.mock.calls.at(-1)?.[0].elements.title.intent.role).toBe('hero'));
  });

  it('surfaces warnings for lossy canonical compatibility output', () => {
    render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...documentModel,
        elements: {
          ...documentModel.elements,
          ghost: { id: 'ghost', type: 'text', props: { type: 'text', content: 'Hidden', x: 100, y: 200 } },
        },
        timelines: {
          ...documentModel.timelines,
          ghostTimeline: {
            id: 'ghostTimeline',
            duration: 10,
            tracks: [{ target: 'ghost', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 10, value: 1 }] }],
          },
        },
      },
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByText('Document compatibility warnings')).toBeTruthy();
    expect(screen.getByText(/Timeline "ghostTimeline"/)).toBeTruthy();
  });

  it('creates state machines and authors states/transitions from the motion graph', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: { ...documentModel, stateMachines: undefined },
      onDocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add state machine' }));

    await waitFor(() => expect(onDocumentChange.mock.calls.at(-1)?.[0].stateMachines?.['state-machine']).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Add state to state-machine' }));

    await waitFor(() => expect(onDocumentChange.mock.calls.at(-1)?.[0].stateMachines['state-machine'].states.state).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Add transition from state' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove selected state state' }));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.['state-machine'].states.state).toBeUndefined();
      expect(latest.stateMachines?.['state-machine'].entry).toBe('idle');
    });
  });

  it('renames state machines and states while preserving references', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: documentModel, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.change(screen.getByLabelText('Rename state machine deck'), { target: { value: 'Deck Flow' } });
    fireEvent.blur(screen.getByLabelText('Rename state machine deck'));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.['deck-flow']?.id).toBe('deck-flow');
      expect(latest.stateMachines?.deck).toBeUndefined();
    });

    fireEvent.click(screen.getByLabelText('Select graph state idle'));
    fireEvent.change(screen.getByLabelText('Rename state idle'), { target: { value: 'Ready' } });
    fireEvent.blur(screen.getByLabelText('Rename state idle'));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      const machine = latest.stateMachines?.['deck-flow'];
      expect(machine?.states.ready).toBeTruthy();
      expect(machine?.states.idle).toBeUndefined();
      expect(machine?.entry).toBe('ready');
      expect(machine?.transitions?.[0]).toMatchObject({ from: 'ready', to: 'intro', trigger: 'start' });
    });
  });

  it('renames state machines from the motion list on double click', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: documentModel, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Select state machine deck' }));
    const renameInput = await screen.findByLabelText('Rename state machine deck inline');
    fireEvent.change(renameInput, { target: { value: 'Deck Flow' } });
    fireEvent.blur(renameInput);

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.['deck-flow']?.id).toBe('deck-flow');
      expect(latest.stateMachines?.deck).toBeUndefined();
    });
  });

  it('keeps event inputs aligned with renamed and deleted transitions', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: documentModel, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.click(screen.getByLabelText('Select graph state idle'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Event: start transition from idle' }));
    fireEvent.change(screen.getByLabelText('Rename transition trigger start'), { target: { value: 'begin' } });
    fireEvent.blur(screen.getByLabelText('Rename transition trigger start'));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.deck.transitions?.[0].trigger).toBe('begin');
      expect(latest.stateMachines?.deck.inputs?.begin).toEqual({ type: 'trigger' });
      expect(latest.stateMachines?.deck.inputs?.start).toBeUndefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove transition Event: begin' }));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.deck.transitions).toEqual([{ id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' }]);
      expect(latest.stateMachines?.deck.inputs).toBeUndefined();
    });
  });

  it('shows source target type and event-specific metadata for selected transitions', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, { initialDocument: documentModel, onDocumentChange }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.click(screen.getByLabelText('Select graph state idle'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Event: start transition from idle' }));

    expect(screen.getByLabelText('Transition idle-start source').textContent).toBe('idle');
    expect(screen.getByLabelText('Transition idle-start type')).toBeTruthy();
    expect(screen.getByLabelText('Transition idle-start target state')).toBeTruthy();
    expect(screen.getByLabelText('Transition idle-start event preset')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Transition idle-start event preset'), { target: { value: 'onKey' } });
    fireEvent.change(await screen.findByLabelText('Transition idle-start key'), { target: { value: 'A' } });
    fireEvent.blur(screen.getByLabelText('Transition idle-start key'));
    fireEvent.change(screen.getByLabelText('Transition idle-start target state'), { target: { value: 'entry' } });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.deck.transitions?.[0]).toMatchObject({ from: 'idle', to: 'entry', trigger: 'onKey', key: 'A' });
    });

    fireEvent.change(screen.getByLabelText('Transition idle-start type'), { target: { value: 'next' } });

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.deck.transitions?.[0]).toMatchObject({ from: 'idle', to: 'entry', exitTime: 1 });
      expect(latest.stateMachines?.deck.transitions?.[0].trigger).toBeUndefined();
      expect(latest.stateMachines?.deck.transitions?.[0].key).toBeUndefined();
    });
  });

  it('clears transitions and onComplete references when deleting a state', async () => {
    const onDocumentChange = vi.fn();
    render(React.createElement(ElucimEditor, {
      initialDocument: {
        ...documentModel,
        stateMachines: {
          deck: {
            ...documentModel.stateMachines!.deck,
            states: {
              idle: { timeline: 'idle' },
              intro: { timeline: 'intro' },
            },
            transitions: [
              { id: 'idle-start', from: 'idle', to: 'intro', trigger: 'start' },
              { id: 'idle-complete', from: 'idle', to: 'intro', exitTime: 1 },
              { id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' },
            ],
          },
        },
      },
      onDocumentChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State machines motion tab' }));
    fireEvent.click(screen.getByLabelText('Select graph state intro'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove selected state intro' }));

    await waitFor(() => {
      const latest = onDocumentChange.mock.calls.at(-1)?.[0] as ElucimDocument;
      expect(latest.stateMachines?.deck.states.intro).toBeUndefined();
      expect(latest.stateMachines?.deck.transitions).toEqual([{ id: 'entry-start', from: 'entry', to: 'idle', trigger: 'onStart' }]);
    });
  });
});
