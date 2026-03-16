import { describe, it, expect, beforeEach } from 'vitest';
import { ELEMENT_TEMPLATES, getTemplatesByCategory, CATEGORY_LABELS, resetIdCounter } from '../toolbar/templates';
import { editorReducer } from '../state/reducer';
import { createInitialState } from '../state/types';

beforeEach(() => {
  resetIdCounter();
});

// ─── Templates ─────────────────────────────────────────────────────────────

describe('ELEMENT_TEMPLATES', () => {
  it('contains templates for all categories', () => {
    const categories = new Set(ELEMENT_TEMPLATES.map(t => t.category));
    expect(categories).toContain('shape');
    expect(categories).toContain('line');
    expect(categories).toContain('text');
    expect(categories).toContain('math');
    expect(categories).toContain('data');
  });

  it('each template creates a valid element with an id', () => {
    for (const template of ELEMENT_TEMPLATES) {
      const el = template.create(400, 300);
      expect(el.type).toBe(template.type);
      if ('id' in el) {
        expect(typeof (el as any).id).toBe('string');
      }
    }
  });

  it('generates unique ids', () => {
    const ids = ELEMENT_TEMPLATES
      .map(t => t.create(400, 300))
      .map(el => ('id' in el ? (el as any).id : undefined))
      .filter(Boolean);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('creates rect at center', () => {
    const rectTemplate = ELEMENT_TEMPLATES.find(t => t.type === 'rect')!;
    const el = rectTemplate.create(400, 300) as any;
    expect(el.x).toBe(340); // 400 - 60
    expect(el.y).toBe(260); // 300 - 40
    expect(el.width).toBe(120);
    expect(el.height).toBe(80);
  });

  it('creates circle at center', () => {
    const template = ELEMENT_TEMPLATES.find(t => t.type === 'circle')!;
    const el = template.create(400, 300) as any;
    expect(el.cx).toBe(400);
    expect(el.cy).toBe(300);
    expect(el.r).toBe(50);
  });

  it('creates axes with origin', () => {
    const template = ELEMENT_TEMPLATES.find(t => t.type === 'axes')!;
    const el = template.create(500, 400) as any;
    expect(el.origin).toEqual([500, 400]);
  });

  it('creates barChart with sample data', () => {
    const template = ELEMENT_TEMPLATES.find(t => t.type === 'barChart')!;
    const el = template.create(400, 300) as any;
    expect(el.bars).toHaveLength(3);
    expect(el.width).toBe(200);
  });
});

describe('getTemplatesByCategory', () => {
  it('groups templates by category', () => {
    const groups = getTemplatesByCategory();
    expect(Object.keys(groups)).toContain('shape');
    expect(groups['shape'].length).toBeGreaterThanOrEqual(2);
    expect(groups['math'].length).toBeGreaterThanOrEqual(3);
  });
});

describe('CATEGORY_LABELS', () => {
  it('has labels for all categories', () => {
    const categories = new Set(ELEMENT_TEMPLATES.map(t => t.category));
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
    }
  });
});

// ─── Add + Undo integration ───────────────────────────────────────────────

describe('add element + undo', () => {
  it('adds element via reducer and undoes it', () => {
    const template = ELEMENT_TEMPLATES.find(t => t.type === 'circle')!;
    let state = createInitialState();
    expect((state.document.root as any).children).toHaveLength(0);

    const el = template.create(400, 300);
    state = editorReducer(state, { type: 'ADD_ELEMENT', element: el });
    expect((state.document.root as any).children).toHaveLength(1);
    expect((state.document.root as any).children[0].type).toBe('circle');

    state = editorReducer(state, { type: 'UNDO' });
    expect((state.document.root as any).children).toHaveLength(0);
  });

  it('adds multiple elements', () => {
    let state = createInitialState();
    for (const template of ELEMENT_TEMPLATES.slice(0, 5)) {
      state = editorReducer(state, { type: 'ADD_ELEMENT', element: template.create(400, 300) });
    }
    expect((state.document.root as any).children).toHaveLength(5);
  });
});

// ─── Preset resize ─────────────────────────────────────────────────────────

describe('preset resize', () => {
  it('changes scene dimensions via SET_DOCUMENT', () => {
    let state = createInitialState();
    const doc = JSON.parse(JSON.stringify(state.document));
    doc.root.width = 1280;
    doc.root.height = 720;
    state = editorReducer(state, { type: 'SET_DOCUMENT', document: doc });
    expect((state.document.root as any).width).toBe(1280);
    expect((state.document.root as any).height).toBe(720);
  });
});
