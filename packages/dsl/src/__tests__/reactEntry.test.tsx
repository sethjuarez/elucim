import { describe, expect, it } from 'vitest';
import {
  DslRenderer,
  type ElucimDocument,
  type ElucimElement,
  type ElucimStateMachine,
  type ElucimTimeline,
} from '../react';

describe('React entry point', () => {
  it('exports canonical Elucim Document types for renderer consumers', () => {
    const element: ElucimElement = {
      id: 'title',
      type: 'text',
      props: { type: 'text', content: 'React entry' },
    };
    const timeline: ElucimTimeline = {
      id: 'intro',
      duration: 12,
      tracks: [{ target: 'title', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 12, value: 1 }] }],
    };
    const stateMachine: ElucimStateMachine = {
      id: 'presentation',
      entry: 'intro',
      states: { intro: { timeline: 'intro' } },
      transitions: [{ id: 'entry-intro', from: 'entry', to: 'intro', trigger: 'onStart' }],
    };
    const document: ElucimDocument = {
      version: '2.0',
      scene: { type: 'player', width: 640, height: 360, children: ['title'] },
      elements: { title: element },
      timelines: { intro: timeline },
      stateMachines: { presentation: stateMachine },
      defaultStateMachine: 'presentation',
    };

    expect(document.elements.title.props.type).toBe('text');
    expect(DslRenderer).toBeTruthy();
  });
});
