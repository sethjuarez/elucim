import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Element,
  Group,
  Reveal,
  Scene,
  State,
  StateMachine,
  Text,
  Timeline,
  Track,
  Transition,
  createDocumentFromReact,
} from '../react';
import {
  advanceStateMachineRunFrame,
  evaluateTimelineCameraFrames,
  resolveTimelineReveals,
  startStateMachineRun,
  validateDocument,
} from '../index';

function createReactDocument() {
  return createDocumentFromReact({
    type: 'player',
    width: 800,
    height: 600,
    defaultStateMachine: 'main',
    children: (
      <>
        <Group id="content">
          <Text id="headline" x={120} y={120} fill="#ffffff">Ship faster</Text>
          <Element id="badge" type="rect" x={100} y={150} width={80} height={32} fill="#4a9eff" />
        </Group>
        <Timeline
          id="intro"
          duration={12}
          camera={{
            keyframes: [
              { frame: 0, viewport: { x: 0, y: 0, width: 800, height: 600 } },
              { frame: 12, viewport: { x: 100, y: 75, width: 400, height: 300 } },
            ],
          }}
        >
          <Reveal id="reveal-content" target="content" from={2} duration={4} staggerInFrames={2} />
          <Reveal id="repeat-headline" target="headline" from={9} duration={3} strategy="type" />
          <Track
            target="headline"
            property="opacity"
            keyframes={[{ frame: 0, value: 0 }, { frame: 8, value: 1 }]}
          />
        </Timeline>
        <StateMachine id="main" entry="intro">
          <State id="intro" timeline="intro" />
          <Transition id="entry-intro" from="entry" to="intro" trigger="onStart" />
        </StateMachine>
      </>
    ),
  });
}

describe('canonical React authoring', () => {
  it('serializes JSX into the same normalized document model used by JSON and YAML', () => {
    const document = createReactDocument();

    expect(document).toMatchObject({
      version: '2.0',
      scene: { type: 'player', width: 800, height: 600, children: ['content'] },
      elements: {
        content: { id: 'content', type: 'group', children: ['headline', 'badge'] },
        headline: {
          id: 'headline',
          parentId: 'content',
          type: 'text',
          props: { type: 'text', content: 'Ship faster', x: 120, y: 120 },
        },
        badge: { id: 'badge', parentId: 'content', type: 'rect' },
      },
      timelines: {
        intro: {
          id: 'intro',
          duration: 12,
          camera: {
            keyframes: [
              { frame: 0, viewport: { x: 0, y: 0, width: 800, height: 600 } },
              { frame: 12, viewport: { x: 100, y: 75, width: 400, height: 300 } },
            ],
          },
          tracks: [{
            target: 'headline',
            property: 'opacity',
            keyframes: [{ frame: 0, value: 0 }, { frame: 8, value: 1 }],
          }],
        },
      },
      stateMachines: {
        main: {
          id: 'main',
          entry: 'intro',
          states: { intro: { timeline: 'intro' } },
          transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
        },
      },
      defaultStateMachine: 'main',
    });
    expect(validateDocument(document).valid).toBe(true);
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
    expect(evaluateTimelineCameraFrames(document, [{ timelineId: 'intro', frame: 6 }])?.viewport)
      .toEqual({ x: 50, y: 37.5, width: 600, height: 450 });
  });

  it('uses canonical group expansion, repeated reveal composition, and text-only typing', () => {
    const document = createReactDocument();

    expect(resolveTimelineReveals(document, [{ timelineId: 'intro', frame: 4 }])).toEqual({
      headline: { progress: 0.5, strategy: 'type' },
      badge: { progress: 0, strategy: 'fade' },
    });
    expect(resolveTimelineReveals(document, [{ timelineId: 'intro', frame: 9 }]).headline).toEqual({
      progress: 0,
      strategy: 'type',
    });
  });

  it('runs the declared state machine through the canonical playback evaluator', () => {
    const document = createReactDocument();
    const started = startStateMachineRun(document, 'main');
    const progressed = advanceStateMachineRunFrame(document, started, 5);

    expect(started).toMatchObject({ stateId: 'intro', timelineId: 'intro', currentFrame: 0, playing: true });
    expect(progressed).toMatchObject({ stateId: 'intro', currentFrame: 5, stateFrames: [5] });
  });

  it('renders the JSX projection through the canonical DSL renderer', () => {
    const markup = renderToStaticMarkup(
      <Scene type="player" width={800} height={600} poster={4}>
        <Text id="headline" x={120} y={120}>Ship faster</Text>
        <Timeline id="intro" duration={8}>
          <Reveal id="headline-reveal" target="headline" from={0} duration={8} />
        </Timeline>
        <StateMachine id="main" entry="intro">
          <State id="intro" timeline="intro" />
          <Transition id="entry-intro" from="entry" to="intro" trigger="onStart" />
        </StateMachine>
      </Scene>,
    );

    expect(markup).toContain('>Ship </text>');
    expect(markup).toContain('data-testid="elucim-text-cursor"');
  });

  it('rejects noncanonical children instead of silently treating them as timeline content', () => {
    expect(() => createDocumentFromReact({
      children: <div>dynamic content</div>,
    })).toThrow('not valid directly inside canonical <Scene>');
  });
});
