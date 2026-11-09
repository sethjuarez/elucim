import { describe, expect, it } from 'vitest';
import {
  anchorPoint,
  bindAnchors,
  ElucimAnchorError,
  ElucimStandaloneSvgError,
  renderToStandaloneSvg,
  validateDocument,
  type ElucimDocument,
} from '../index';

function overlayDoc(): ElucimDocument {
  return {
    version: '2.0',
    scene: { type: 'player', width: 1280, height: 720, fps: 25, background: 'transparent', children: ['ring', 'arrow', 'callout'] },
    anchors: { submitBtn: { x: 100, y: 100, width: 80, height: 40, description: 'Submit button' } },
    elements: {
      ring: { id: 'ring', type: 'rect', layout: { anchor: { id: 'submitBtn', point: 'top-left' } }, props: { type: 'rect', x: 96, y: 96, width: 88, height: 48, stroke: '#ff0' } },
      arrow: { id: 'arrow', type: 'arrow', layout: { anchor: { id: 'submitBtn', point: 'left', endpoint: 'end' } }, props: { type: 'arrow', x1: 10, y1: 10, x2: 100, y2: 120, stroke: '#ff0' } },
      callout: { id: 'callout', type: 'group', children: ['bubble', 'label'], layout: { anchor: { id: 'submitBtn', point: 'bottom' } }, props: { type: 'group' } },
      bubble: { id: 'bubble', type: 'circle', parentId: 'callout', props: { type: 'circle', cx: 140, cy: 170, r: 20 } },
      label: { id: 'label', type: 'text', parentId: 'callout', props: { type: 'text', x: 140, y: 210, content: 'Click' } },
    },
  };
}

describe('anchors', () => {
  it('validates declared anchors and element references', () => {
    expect(validateDocument(overlayDoc()).valid).toBe(true);
    const doc = overlayDoc();
    doc.elements.ring.layout = { anchor: { id: 'nope', point: 'middle' as never } };
    doc.anchors!.bad = { x: Number.NaN, y: 0, width: -1 };
    const paths = validateDocument(doc).errors.map(error => error.path);
    expect(paths).toEqual(expect.arrayContaining([
      'elements.ring.layout.anchor.id',
      'elements.ring.layout.anchor.point',
      'anchors.bad.x',
      'anchors.bad.width',
    ]));
  });

  it('resolves points on a box and on a point anchor', () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    expect(anchorPoint(box)).toEqual([60, 45]);
    expect(anchorPoint(box, 'top-left')).toEqual([10, 20]);
    expect(anchorPoint(box, 'bottom-right')).toEqual([110, 70]);
    expect(anchorPoint(box, 'right')).toEqual([110, 45]);
    expect(anchorPoint({ x: 5, y: 6 }, 'bottom')).toEqual([5, 6]);
  });

  it('moves anchored elements by the bound offset, pins endpoints, and shifts group children', () => {
    const doc = overlayDoc();
    const bound = bindAnchors(doc, { anchors: { submitBtn: { x: 600, y: 400, w: 120, h: 60 } } });
    expect(bound.anchors?.submitBtn).toMatchObject({ x: 600, y: 400, width: 120, height: 60, description: 'Submit button' });
    // top-left moved (100,100) -> (600,400): authored 4px inset is kept.
    expect(bound.elements.ring.props).toMatchObject({ x: 596, y: 396, width: 88, height: 48 });
    // Only the arrow tip follows the left-middle of the button.
    expect(bound.elements.arrow.props).toMatchObject({ x1: 10, y1: 10, x2: 600, y2: 430 });
    // Group has no geometry, so its children move by bottom-center delta (140,140)->(660,460).
    expect(bound.elements.bubble.props).toMatchObject({ cx: 660, cy: 490 });
    expect(bound.elements.label.props).toMatchObject({ x: 660, y: 530 });
    expect(bound.elements.callout).toBe(doc.elements.callout);
    expect(doc.elements.ring.props.x).toBe(96);
    expect(validateDocument(bound).valid).toBe(true);
  });

  it('scales boxes from a source coordinate space', () => {
    const bound = bindAnchors(overlayDoc(), { source: { width: 640, height: 360 }, anchors: { submitBtn: { x: 300, y: 200, width: 40, height: 20 } } });
    expect(bound.anchors?.submitBtn).toMatchObject({ x: 600, y: 400, width: 80, height: 40 });
    expect(bound.elements.ring.props).toMatchObject({ x: 596, y: 396 });
  });

  it('leaves unbound anchors and their elements unchanged', () => {
    const doc = overlayDoc();
    const bound = bindAnchors(doc, { anchors: {} });
    expect(bound.elements.ring).toBe(doc.elements.ring);
    expect(bound.elements.bubble).toBe(doc.elements.bubble);
  });

  it('rejects unknown anchors, bad boxes, bad sources, and unsupported elements', () => {
    const expectCode = (fn: () => unknown, code: string) => {
      try {
        fn();
        throw new Error('expected throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ElucimAnchorError);
        expect((error as ElucimAnchorError).code).toBe(code);
      }
    };
    expectCode(() => bindAnchors(overlayDoc(), { anchors: { other: { x: 1, y: 1 } } }), 'unknown-anchor');
    expectCode(() => bindAnchors(overlayDoc(), { anchors: { submitBtn: { x: 1, y: Number.NaN } } }), 'invalid-box');
    expectCode(() => bindAnchors(overlayDoc(), { anchors: { submitBtn: { x: 1, y: 1, w: -3 } } }), 'invalid-box');
    expectCode(() => bindAnchors(overlayDoc(), { source: { width: 0, height: 10 }, anchors: {} }), 'invalid-source');

    const endpointDoc = overlayDoc();
    endpointDoc.elements.ring.layout = { anchor: { id: 'submitBtn', endpoint: 'end' } };
    expectCode(() => bindAnchors(endpointDoc, { anchors: { submitBtn: { x: 1, y: 1 } } }), 'unsupported-endpoint');

    const emptyGroup = overlayDoc();
    emptyGroup.elements.callout.children = [];
    expectCode(() => bindAnchors(emptyGroup, { anchors: { submitBtn: { x: 1, y: 1 } } }), 'unsupported-element');
  });
});

describe('renderToStandaloneSvg', () => {
  const doc: ElucimDocument = {
    version: '2.0',
    scene: { type: 'player', width: 400, height: 200, background: '#123456', children: ['dot'] },
    elements: { dot: { id: 'dot', type: 'circle', props: { type: 'circle', cx: 200, cy: 100, r: 20, fill: '$accent' } } },
  };

  it('emits a root svg with pixel size, kept viewBox, scene background, and no CSS functions', () => {
    const svg = renderToStandaloneSvg(doc, 0, { width: 800 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="400"');
    expect(svg).toContain('viewBox="0 0 400 200"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toMatch(/var\(|light-dark\(/);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('omits the background for transparent output and accepts a custom color', () => {
    expect(renderToStandaloneSvg(doc, 0, { background: 'transparent' })).not.toContain('#123456');
    expect(renderToStandaloneSvg(doc, 0, { background: '#00ff00' })).toContain('fill="#00ff00"');
  });

  it('rejects mismatched aspect ratios and non-integer sizes', () => {
    expect(() => renderToStandaloneSvg(doc, 0, { width: 800, height: 800 })).toThrow(ElucimStandaloneSvgError);
    expect(() => renderToStandaloneSvg(doc, 0, { width: 10.5 })).toThrow(/positive integer/);
    expect(renderToStandaloneSvg(doc, 0, { width: 800, height: 400 })).toContain('height="400"');
  });

  it('rejects LaTeX foreignObject content', () => {
    const latex: ElucimDocument = {
      ...doc,
      scene: { ...doc.scene, children: ['eq'] },
      elements: { eq: { id: 'eq', type: 'latex', props: { type: 'latex', expression: 'x^2', x: 10, y: 10 } } },
    };
    let svg = '';
    try {
      svg = renderToStandaloneSvg(latex, 0);
    } catch (error) {
      expect((error as ElucimStandaloneSvgError).code).toBe('unsupported-foreign-object');
      return;
    }
    expect(svg).not.toContain('foreignObject');
  });
});
