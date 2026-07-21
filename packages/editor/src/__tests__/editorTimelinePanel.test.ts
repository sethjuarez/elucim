import { describe, expect, it } from 'vitest';
import type { ElucimDocument, ElucimStateMachine, ElucimTimeline } from '@elucim/editor-projection';
import {
  applyMotionDocumentChange,
  applyStateMachineDocumentChange,
  applyTimelineDocumentChange,
  getPreferredMotionType,
} from '../timeline/EditorTimelinePanel';
import { clampTimelineKeyframesToDuration, previewFramesEqual } from '../timeline/Timeline';

const timeline: ElucimTimeline = {
  id: 'intro',
  duration: 30,
  tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] }],
};

const stateMachine: ElucimStateMachine = {
  id: 'deck',
  entry: 'intro',
  states: { intro: { timeline: 'intro' } },
  transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
};

const document: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', children: ['title'] },
  elements: {
    title: { id: 'title', type: 'text', props: { type: 'text', content: 'Hello' } },
  },
  timelines: { intro: timeline },
  stateMachines: { deck: stateMachine },
  metadata: { title: 'Motion document' },
};

describe('editor timeline panel helpers', () => {
  it('patches timelines while preserving document extras', () => {
    const nextTimeline: ElucimTimeline = { ...timeline, duration: 45 };
    const next = applyTimelineDocumentChange(document, { intro: nextTimeline });

    expect(next.timelines?.intro.duration).toBe(45);
    expect(next.stateMachines).toBe(document.stateMachines);
    expect(next.metadata).toBe(document.metadata);
  });

  it('can explicitly clear timelines or state machines', () => {
    expect(applyTimelineDocumentChange(document, undefined)).toMatchObject({ timelines: undefined });
    expect(applyStateMachineDocumentChange(document, undefined)).toMatchObject({ stateMachines: undefined });
  });

  it('patches timelines and state machines together for motion edits', () => {
    const nextTimeline: ElucimTimeline = { ...timeline, duration: 60 };
    const nextMachine: ElucimStateMachine = {
      ...stateMachine,
      states: { intro: { timeline: 'intro' }, complete: {} },
    };
    const next = applyMotionDocumentChange(document, { intro: nextTimeline }, { deck: nextMachine });

    expect(next.timelines?.intro.duration).toBe(60);
    expect(next.stateMachines?.deck.states.complete).toEqual({});
    expect(next.elements).toBe(document.elements);
  });

  it('preserves camera-only timelines', () => {
    const cameraTimeline: ElucimTimeline = {
      id: 'camera',
      duration: 30,
      tracks: [],
      camera: {
        keyframes: [{ frame: 0, viewport: { x: 0, y: 0, width: 800, height: 600 } }],
      },
    };

    const next = applyTimelineDocumentChange(document, { camera: cameraTimeline });

    expect(next.timelines?.camera.camera?.keyframes).toHaveLength(1);
  });

  it('coalesces camera keyframes when a timeline duration is reduced', () => {
    const next = clampTimelineKeyframesToDuration({
      id: 'camera',
      duration: 30,
      tracks: [],
      camera: {
        keyframes: [
          { frame: 0, viewport: { x: 0, y: 0, width: 800, height: 600 } },
          { frame: 20, viewport: { x: 100, y: 75, width: 400, height: 300 } },
          { frame: 30, viewport: { x: 200, y: 150, width: 200, height: 150 } },
        ],
      },
    }, 10);

    expect(next.camera?.keyframes).toEqual([
      { frame: 0, viewport: { x: 0, y: 0, width: 800, height: 600 } },
      { frame: 10, viewport: { x: 200, y: 150, width: 200, height: 150 } },
    ]);
  });

  it('refreshes state-machine preview frames when camera application changes', () => {
    expect(previewFramesEqual(
      [{ timelineId: 'inactive', frame: 0 }],
      [{ timelineId: 'inactive', frame: 0, applyCamera: false }],
    )).toBe(false);
    expect(previewFramesEqual(
      [{ timelineId: 'inactive', frame: 0 }],
      [{ timelineId: 'inactive', frame: 0, applyCamera: true }],
    )).toBe(true);
  });

  it('selects the state-machine motion tab only for the state-machine workspace', () => {
    expect(getPreferredMotionType('states')).toBe('stateMachine');
    expect(getPreferredMotionType('animate')).toBe('animation');
    expect(getPreferredMotionType('design')).toBe('animation');
    expect(getPreferredMotionType('polish')).toBe('animation');
  });
});
