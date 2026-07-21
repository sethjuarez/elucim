import { describe, expect, it } from 'vitest';
import {
  fromYaml,
  renderToSvgString,
  validate,
  type ElucimDocument,
} from '../index';

const document: ElucimDocument = {
  version: '2.0',
  scene: { type: 'scene', width: 320, height: 180, children: ['label'] },
  elements: {
    label: {
      id: 'label',
      type: 'text',
      layout: { x: 160, y: 90 },
      props: { type: 'text', content: 'Canonical', fill: '#ffffff', textAnchor: 'middle' },
    },
  },
  timelines: {
    intro: {
      id: 'intro',
      duration: 12,
      tracks: [{ target: 'label', property: 'opacity', keyframes: [{ frame: 0, value: 0 }, { frame: 12, value: 1 }] }],
      effects: [{ id: 'label-reveal', kind: 'reveal', targets: ['label'], from: 0, duration: 12, strategy: 'type' }],
    },
  },
};

describe('canonical document-only APIs', () => {
  it('validates, parses, and renders normalized documents', () => {
    expect(validate(document)).toMatchObject({ valid: true });
    expect(fromYaml(`
version: "2.0"
scene:
  type: scene
  width: 320
  height: 180
  children: [label]
elements:
  label:
    id: label
    type: text
    props:
      type: text
      content: Canonical
`).version).toBe('2.0');
    expect(renderToSvgString(document, 6, { timelineId: 'intro' })).toContain('<svg');
  });

  it('rejects render-tree documents through canonical validation', () => {
    const renderTree = { version: 'render-tree', root: { type: 'scene', children: [] } };
    const validation = validate(renderTree);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual(expect.objectContaining({
      path: 'version',
      severity: 'error',
    }));
  });

  it.each(['fadeIn', 'fadeOut', 'draw', 'write', 'easing'])(
    'rejects the removed %s primitive animation prop',
    prop => {
      const removedMotion = {
        ...document,
        elements: {
          label: {
            ...document.elements.label,
            props: { ...document.elements.label.props, [prop]: 'removed' },
          },
        },
      };

      expect(validate(removedMotion)).toMatchObject({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: `elements.label.props.${prop}`,
            message: expect.stringContaining('Removed animation prop'),
          }),
        ]),
      });
    },
  );

  it('rejects removed wrapper element nodes', () => {
    const removedWrapper = {
      ...document,
      elements: {
        label: { ...document.elements.label, type: 'fadeIn' },
      },
    };

    expect(validate(removedWrapper)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          path: 'elements.label.type',
          message: expect.stringContaining('Removed wrapper element'),
        }),
      ]),
    });
  });
});
