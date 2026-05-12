import { describe, expect, it } from 'vitest';
import {
  createAutoStaggerTimeline,
  createReducedMotionDocument,
  createSemanticMotionTimeline,
  createStateSnapshotMotion,
  holdFinalFrame,
  lintMotion,
  planMotionBeats,
  previewBeatDiffs,
  validateDocument,
  type ElucimDocument,
} from '../index';

const doc: ElucimDocument = {
  version: '2.0',
  scene: { type: 'player', width: 800, height: 480, children: ['start', 'decision', 'end', 'start-to-decision'] },
  elements: {
    start: {
      id: 'start',
      type: 'rect',
      role: 'step',
      intent: { flowTo: ['decision'], group: 'flow' },
      layout: { x: 80, y: 180, width: 160, height: 90, rank: 1 },
      props: { type: 'rect', x: 80, y: 180, width: 160, height: 90, fill: '$surface', opacity: 0 },
    },
    decision: {
      id: 'decision',
      type: 'rect',
      role: 'decision',
      intent: { flowFrom: ['start'], flowTo: ['end'], group: 'flow' },
      layout: { x: 320, y: 180, width: 160, height: 90, rank: 2 },
      props: { type: 'rect', x: 320, y: 180, width: 160, height: 90, fill: '$surface', opacity: 0 },
    },
    end: {
      id: 'end',
      type: 'rect',
      role: 'step',
      intent: { flowFrom: ['decision'], group: 'flow' },
      layout: { x: 560, y: 180, width: 160, height: 90, rank: 3 },
      props: { type: 'rect', x: 560, y: 180, width: 160, height: 90, fill: '$surface', opacity: 0 },
    },
    'start-to-decision': {
      id: 'start-to-decision',
      type: 'bezierCurve',
      role: 'connector',
      intent: { role: 'connector', flowFrom: ['start'], flowTo: ['decision'] },
      props: { type: 'bezierCurve', x1: 240, y1: 225, cx1: 270, cy1: 225, cx2: 290, cy2: 225, x2: 320, y2: 225, stroke: '$primary', opacity: 0 },
    },
  },
};

describe('semantic motion helpers', () => {
  it('plans named beats from narration budgets', () => {
    const beats = planMotionBeats({ seconds: 12, fps: 30, beatCount: 4 });

    expect(beats.map(beat => beat.id)).toEqual(['intro', 'context', 'decision', 'takeaway']);
    expect(beats[0]).toMatchObject({ start: 0, duration: 90 });
    expect(beats[3].start + beats[3].duration).toBe(360);
  });

  it('compiles semantic reveal flow and connector path presets to document timelines', () => {
    const reveal = createSemanticMotionTimeline(doc, {
      id: 'intro-flow',
      preset: 'revealFlow',
      group: 'flow',
      duration: 60,
    });
    const trace = createSemanticMotionTimeline(doc, {
      id: 'trace-edge',
      preset: 'tracePath',
      connectorId: 'start-to-decision',
      duration: 36,
    });

    expect(reveal.tracks.filter(track => track.property === 'opacity').map(track => track.target)).toEqual(['start', 'decision', 'end']);
    expect(reveal.tracks.some(track => track.property === 'translate')).toBe(true);
    expect(trace.tracks).toContainEqual(expect.objectContaining({ target: 'start-to-decision', property: 'opacity' }));
    expect(validateDocument({ ...doc, timelines: { [reveal.id]: reveal, [trace.id]: trace } }).valid).toBe(true);
  });

  it('auto-staggers by rank without hand-computing offsets', () => {
    const timeline = createAutoStaggerTimeline(doc, {
      id: 'ranked-reveal',
      group: 'flow',
      duration: 54,
      stagger: 9,
      orderBy: 'rank',
    });

    const opacityTracks = timeline.tracks.filter(track => track.property === 'opacity');
    expect(opacityTracks.map(track => track.target)).toEqual(['start', 'decision', 'end']);
    expect(opacityTracks.map(track => track.keyframes[0].frame)).toEqual([0, 9, 18]);
  });

  it('builds visual state snapshots and validates the generated machine', () => {
    const motion = createStateSnapshotMotion({
      id: 'agent-status',
      snapshots: [
        { id: 'idle', values: { start: { props: { opacity: 0.5 } } } },
        { id: 'thinking', values: { start: { props: { opacity: 1 }, layout: { scale: 1.06 } } } },
        { id: 'done', values: { end: { props: { opacity: 1 } } } },
      ],
      transitionDuration: 18,
    });
    const document: ElucimDocument = {
      ...doc,
      timelines: motion.timelines,
      stateMachines: { [motion.stateMachine.id]: motion.stateMachine },
      defaultStateMachine: motion.stateMachine.id,
    };

    expect(Object.keys(motion.timelines)).toEqual(['agent-status-idle', 'agent-status-thinking', 'agent-status-done']);
    expect(motion.stateMachine.transitions?.[1]).toMatchObject({ from: 'idle', to: 'thinking', exitTime: 1 });
    expect(validateDocument(document).valid).toBe(true);
  });

  it('lints motion and returns beat-level preview diffs', () => {
    const timeline = createSemanticMotionTimeline(doc, { id: 'intro', preset: 'revealFlow', group: 'flow', duration: 48 });
    const document: ElucimDocument = { ...doc, timelines: { intro: timeline } };
    const lint = lintMotion(document, { maxSimultaneousChanges: 1, requireReducedMotion: true });
    const preview = previewBeatDiffs(document, {
      timelineId: 'intro',
      beats: planMotionBeats({ totalFrames: 48, beatCount: 3 }),
    });

    expect(lint.issues.map(issue => issue.code)).toContain('blank-first-frame');
    expect(lint.issues.map(issue => issue.code)).toContain('missing-reduced-motion');
    expect(preview.some(beat => beat.appears.length > 0)).toBe(true);
    expect(preview[0].summary).toContain('intro');
  });

  it('creates reduced-motion and final-frame static documents', () => {
    const timeline = createSemanticMotionTimeline(doc, { id: 'intro', preset: 'revealFlow', group: 'flow', duration: 48 });
    const document: ElucimDocument = { ...doc, timelines: { intro: timeline } };
    const reduced = createReducedMotionDocument(document, { mode: 'minimal', maxDuration: 12 });
    const staticDoc = createReducedMotionDocument(document, { mode: 'static' });
    const final = holdFinalFrame(document, 'intro');

    expect(reduced.timelines?.intro.duration).toBe(12);
    expect(reduced.timelines?.intro.tracks.every(track => track.property === 'opacity' || track.property === 'fill' || track.property === 'stroke')).toBe(true);
    expect(staticDoc.timelines).toBeUndefined();
    expect(final.elements.start.props.opacity).toBe(1);
  });
});
