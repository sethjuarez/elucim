/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { editorReducer } from '../state/reducer';
import { createInitialState } from '../state/types';
import type { CircleNode, RectNode } from '@elucim/dsl';
import { EditorProvider, useEditorState } from '../state/EditorProvider';
import { Timeline } from '../timeline/Timeline';

const circle: CircleNode = { type: 'circle', id: 'c1', cx: 100, cy: 100, r: 50, fadeIn: 20, fadeOut: 10, draw: 40 };
const rect: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80 };

function stateWith(...elements: any[]) {
  return createInitialState({
    version: '1.0',
    root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: elements },
  });
}

describe('timeline playback controls', () => {
  it('SET_FRAME sets current frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 42 });
    expect(state.currentFrame).toBe(42);
  });

  it('SET_PLAYING toggles play state', () => {
    let state = stateWith(circle);
    expect(state.isPlaying).toBe(false);
    state = editorReducer(state, { type: 'SET_PLAYING', playing: true });
    expect(state.isPlaying).toBe(true);
    state = editorReducer(state, { type: 'SET_PLAYING', playing: false });
    expect(state.isPlaying).toBe(false);
  });

  it('step forward increments frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 0 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: Math.min(state.currentFrame + 1, 119) });
    expect(state.currentFrame).toBe(1);
  });

  it('step backward decrements frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 50 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: Math.max(state.currentFrame - 1, 0) });
    expect(state.currentFrame).toBe(49);
  });

  it('go to start sets frame 0', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 80 });
    state = editorReducer(state, { type: 'SET_FRAME', frame: 0 });
    expect(state.currentFrame).toBe(0);
  });

  it('go to end sets last frame', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'SET_FRAME', frame: 119 });
    expect(state.currentFrame).toBe(119);
  });
});

describe('timeline track data', () => {
  it('elements with animation props have track data', () => {
    const state = stateWith(circle, rect);
    const root = state.document.root as any;
    const el = root.children[0];
    expect(el.fadeIn).toBe(20);
    expect(el.fadeOut).toBe(10);
    expect(el.draw).toBe(40);
  });

  it('updating fadeIn via inspector syncs with timeline', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { fadeIn: 45 } as any });
    const el = (state.document.root as any).children[0];
    expect(el.fadeIn).toBe(45);
  });

  it('ruler click sets frame proportionally', () => {
    let state = stateWith(circle);
    // Simulate: click at 50% of ruler → frame 59
    const ratio = 0.5;
    const durationInFrames = 120;
    const frame = Math.round(ratio * (durationInFrames - 1));
    state = editorReducer(state, { type: 'SET_FRAME', frame });
    expect(state.currentFrame).toBe(60); // (0.5 * 119) rounded
  });
});

describe('selection via timeline track', () => {
  it('clicking track selects element', () => {
    let state = stateWith(circle, rect);
    state = editorReducer(state, { type: 'SELECT', ids: ['c1'] });
    expect(state.selectedIds).toEqual(['c1']);
    state = editorReducer(state, { type: 'SELECT', ids: ['r1'] });
    expect(state.selectedIds).toEqual(['r1']);
  });

  it('expands animation wrapper tracks and selects child rows', async () => {
    let latestSelectedIds: string[] = [];
    const wrapped = {
      type: 'fadeIn',
      id: 'wrap1',
      duration: 15,
      children: [{ ...rect, id: 'wrapped-rect' }],
    } as any;

    function CaptureSelection() {
      const { state } = useEditorState();
      useEffect(() => {
        latestSelectedIds = state.selectedIds;
      }, [state.selectedIds]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [wrapped] },
          },
        },
        React.createElement(CaptureSelection),
        React.createElement(Timeline),
      ),
    );

    expect(screen.queryByText('wrapped-rect')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expand wrap1' }));
    expect(await screen.findByText('wrapped-rect')).toBeTruthy();

    fireEvent.click(screen.getByText('wrapped-rect'));
    await waitFor(() => expect(latestSelectedIds).toEqual(['wrapped-rect']));
  });
});

describe('v2 timeline clip rows', () => {
  it('renders v2 clip tracks and lets keyframes scrub the playhead', async () => {
    let latestFrame = 0;

    function CaptureFrame() {
      const { state } = useEditorState();
      useEffect(() => {
        latestFrame = state.currentFrame;
      }, [state.currentFrame]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
          },
        },
        React.createElement(CaptureFrame),
        React.createElement(Timeline, {
          v2Timelines: {
            intro: {
              id: 'intro',
              duration: 30,
              tracks: [
                { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
              ],
            },
          },
        }),
      ),
    );

    expect(screen.getByText(/intro - 30f - 1 track/)).toBeTruthy();
    expect(screen.getByText('r1.opacity')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to intro r1.opacity keyframe 30' }).at(-1)!);
    await waitFor(() => expect(latestFrame).toBe(30));
  });

  it('adds and edits simple v2 timeline clips', async () => {
    let latestTimelines: any;

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
          },
        },
        React.createElement(Timeline, {
          v2Timelines: {},
          onV2TimelinesChange: timelines => {
            latestTimelines = timelines;
          },
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add intro animation' }));
    await waitFor(() => expect(latestTimelines?.['auto-intro']).toBeTruthy());

    latestTimelines = {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        ],
      },
    };
    const renderEditableTimeline = () => React.createElement(
      EditorProvider,
      {
        initialDocument: {
          version: '1.0',
          root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
        },
      },
      React.createElement(Timeline, {
        v2Timelines: latestTimelines,
        onV2TimelinesChange: timelines => {
          latestTimelines = timelines;
        },
      }),
    );
    const { rerender } = render(renderEditableTimeline());

    fireEvent.change(screen.getByLabelText('Animation intro duration'), { target: { value: '40' } });
    await waitFor(() => expect(latestTimelines.intro.duration).toBe(40));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to intro r1.opacity keyframe 30' }).at(-1)!);
    fireEvent.change(screen.getByLabelText('intro r1.opacity keyframe 2 value'), { target: { value: '0.75' } });
    fireEvent.blur(screen.getByLabelText('intro r1.opacity keyframe 2 value'));
    await waitFor(() => expect(latestTimelines.intro.tracks[0].keyframes[1].value).toBe(0.75));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add track to animation intro' }));
    await waitFor(() => expect(latestTimelines.intro.tracks).toHaveLength(2));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getAllByRole('button', { name: 'Select intro r1.opacity track' }).at(-1)!);
    fireEvent.change(screen.getByLabelText('intro track 2 property'), { target: { value: 'scale' } });
    await waitFor(() => expect(latestTimelines.intro.tracks[1].property).toBe('scale'));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add keyframe to intro r1.scale' }));
    await waitFor(() => expect(latestTimelines.intro.tracks[1].keyframes).toHaveLength(3));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to intro r1.scale keyframe 20' }).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Remove intro r1.scale keyframe 2' }));
    await waitFor(() => expect(latestTimelines.intro.tracks[1].keyframes).toHaveLength(2));
    rerender(renderEditableTimeline());
    fireEvent.click(screen.getByRole('button', { name: 'Remove intro r1.scale track' }));
    await waitFor(() => expect(latestTimelines.intro.tracks).toHaveLength(1));
  });

  it('renames v2 timelines and updates state machine timeline references', async () => {
    let latestTimelines: any = {
      focus: {
        id: 'focus',
        duration: 20,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0.35 }, { frame: 20, value: 1 }] },
        ],
      },
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        ],
      },
    };
    let latestMachines: any = {
      walkthrough: {
        id: 'walkthrough',
        initial: 'idle',
        states: {
          idle: { timeline: 'intro', on: { start: { target: 'focused', timeline: 'focus' } } },
          focused: { timeline: 'focus', onComplete: { target: 'idle', timeline: 'intro' } },
        },
      },
    };

    const renderTimeline = () => React.createElement(
      EditorProvider,
      {
        initialDocument: {
          version: '1.0',
          root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
        },
      },
      React.createElement(Timeline, {
        v2Timelines: latestTimelines,
        v2StateMachines: latestMachines,
        onV2TimelinesChange: timelines => {
          latestTimelines = timelines;
        },
        onV2StateMachinesChange: stateMachines => {
          latestMachines = stateMachines;
        },
        onV2MotionChange: (timelines, stateMachines) => {
          latestTimelines = timelines;
          latestMachines = stateMachines;
        },
      }),
    );
    const { rerender } = render(renderTimeline());

    const renameInput = await screen.findByLabelText('Rename animation focus');
    fireEvent.change(renameInput, { target: { value: 'Focus Text' } });
    fireEvent.blur(renameInput);

    await waitFor(() => expect(latestTimelines['focus-text']).toBeTruthy());
    expect(latestTimelines.focus).toBeUndefined();
    expect(latestMachines.walkthrough.states.idle.on.start.timeline).toBe('focus-text');
    expect(latestMachines.walkthrough.states.focused.timeline).toBe('focus-text');

    rerender(renderTimeline());
    expect(screen.getByRole('button', { name: 'Select animation focus-text' })).toBeTruthy();
  });

  it('drags v2 keyframes to a new frame without crossing neighbors', async () => {
    let latestFrame = 0;
    let latestTimelines: any = {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        ],
      },
    };

    function CaptureFrame() {
      const { state } = useEditorState();
      useEffect(() => {
        latestFrame = state.currentFrame;
      }, [state.currentFrame]);
      return null;
    }

    const renderTimeline = () => React.createElement(
      EditorProvider,
      {
        initialDocument: {
          version: '1.0',
          root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
        },
      },
      React.createElement(CaptureFrame),
      React.createElement(Timeline, {
        v2Timelines: latestTimelines,
        onV2TimelinesChange: timelines => {
          latestTimelines = timelines;
        },
      }),
    );
    const { rerender } = render(renderTimeline());

    const keyframe = screen.getAllByRole('button', { name: 'Go to intro r1.opacity keyframe 30' }).at(-1)!;
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
    fireEvent.pointerMove(window, { clientX: 140 });
    expect(latestTimelines.intro.tracks[0].keyframes[1].frame).toBe(30);
    expect((screen.getByLabelText('intro r1.opacity keyframe 2 frame') as HTMLInputElement).value).toBe('30');
    fireEvent.pointerUp(window, { clientX: 140 });

    await waitFor(() => expect(latestTimelines.intro.tracks[0].keyframes[1].frame).toBe(14));
    rerender(renderTimeline());
    await waitFor(() => expect((screen.getByLabelText('intro r1.opacity keyframe 2 frame') as HTMLInputElement).value).toBe('14'));
    expect(latestFrame).toBe(0);
  });

  it('clears state-machine references when deleting a v2 timeline', async () => {
    let latestTimelines: any = {
      focus: {
        id: 'focus',
        duration: 20,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0.35 }, { frame: 20, value: 1 }] },
        ],
      },
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        ],
      },
    };
    let latestMachines: any = {
      walkthrough: {
        id: 'walkthrough',
        initial: 'idle',
        states: {
          idle: { timeline: 'intro', on: { start: { target: 'focused', timeline: 'focus' } } },
          focused: { timeline: 'focus', onComplete: { target: 'idle', timeline: 'intro' } },
        },
      },
    };

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
          },
        },
        React.createElement(Timeline, {
          v2Timelines: latestTimelines,
          v2StateMachines: latestMachines,
          onV2TimelinesChange: timelines => {
            latestTimelines = timelines;
          },
          onV2StateMachinesChange: stateMachines => {
            latestMachines = stateMachines;
          },
          onV2MotionChange: (timelines, stateMachines) => {
            latestTimelines = timelines;
            latestMachines = stateMachines;
          },
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove animation focus' }));

    await waitFor(() => expect(latestTimelines.focus).toBeUndefined());
    expect(latestMachines.walkthrough.states.idle.on.start).toEqual({ target: 'focused', timeline: undefined });
    expect(latestMachines.walkthrough.states.focused.timeline).toBeUndefined();
    expect(latestMachines.walkthrough.states.focused.onComplete).toEqual({ target: 'idle', timeline: 'intro' });
  });

  it('renames v2 timelines from the motion list on double click', async () => {
    let latestTimelines: any = {
      intro: {
        id: 'intro',
        duration: 30,
        tracks: [
          { target: 'r1', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] },
        ],
      },
    };

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
          },
        },
        React.createElement(Timeline, {
          v2Timelines: latestTimelines,
          onV2TimelinesChange: timelines => {
            latestTimelines = timelines;
          },
        }),
      ),
    );

    fireEvent.doubleClick(screen.getAllByRole('button', { name: 'Select animation intro' }).at(-1)!);
    const renameInput = await screen.findByLabelText('Rename animation intro inline');
    fireEvent.change(renameInput, { target: { value: 'Intro Main' } });
    fireEvent.blur(renameInput);

    await waitFor(() => expect(latestTimelines['intro-main']).toBeTruthy());
    expect(latestTimelines.intro).toBeUndefined();
  });

  it('adds a blank v2 timeline for the selected or first element', async () => {
    let latestTimelines: any;

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [rect] },
          },
        },
        React.createElement(Timeline, {
          v2Timelines: {},
          onV2TimelinesChange: timelines => {
            latestTimelines = timelines;
          },
        }),
      ),
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Add animation' }).at(-1)!);
    await waitFor(() => {
      expect(latestTimelines?.timeline).toBeTruthy();
      expect(latestTimelines.timeline.tracks[0].target).toBe('r1');
      expect(latestTimelines.timeline.tracks[0].property).toBe('opacity');
    });
  });
});
