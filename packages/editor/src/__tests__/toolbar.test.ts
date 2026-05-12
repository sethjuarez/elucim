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
    expect(categories).toContain('presentation');
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

  it('has stable unique template ids', () => {
    const ids = ELEMENT_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
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
    expect(el.fill).toBe('$surface');
    expect(el.stroke).toBe('$accent');
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
    expect(el.barColor).toBe('$accent');
    expect(el.labelColor).toBe('$foreground');
  });

  it('creates presentation templates with semantic tokens', () => {
    const title = ELEMENT_TEMPLATES.find(t => t.id === 'slideTitle')!.create(480, 80) as any;
    expect(title.type).toBe('text');
    expect(title.fill).toBe('$title');
    expect(title.fontSize).toBeGreaterThanOrEqual(36);

    const hero = ELEMENT_TEMPLATES.find(t => t.id === 'heroCard')!.create(480, 270) as any;
    expect(hero.type).toBe('group');
    expect(hero.children).toHaveLength(3);
    expect(hero.children[0].fill).toBe('$surface');
    expect(hero.children[0].stroke).toBe('$accent');
    expect(hero.children[1].fill).toBe('$title');
  });

  it('creates presentation groups with descriptive child ids', () => {
    const groupTemplates = ELEMENT_TEMPLATES.filter(t => t.category === 'presentation' && t.type === 'group');
    expect(groupTemplates.length).toBeGreaterThan(0);

    for (const template of groupTemplates) {
      const group = template.create(480, 270) as any;
      expect(group.type).toBe('group');
      for (const child of group.children) {
        expect(child.id, `${template.id} child id`).toMatch(/^(hero|metric|callout)-/);
      }
    }
  });

  it('uses semantic token colors in default templates', () => {
    const colorFields = ['fill', 'stroke', 'color', 'axisColor', 'gridColor', 'labelColor', 'barColor', 'nodeColor', 'edgeColor'];
    for (const template of ELEMENT_TEMPLATES) {
      const el = template.create(400, 300) as any;
      const stack = [el];
      while (stack.length > 0) {
        const node = stack.pop();
        for (const field of colorFields) {
          const value = node[field];
          if (typeof value === 'string' && value !== 'none') {
            expect(value, `${template.type}.${field}`).toMatch(/^\$/);
          }
        }
        if (Array.isArray(node.children)) stack.push(...node.children);
      }
    }
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
  it('changes scene dimensions via compatibility document import', () => {
    let state = createInitialState();
    const doc = JSON.parse(JSON.stringify(state.document));
    doc.root.width = 1280;
    doc.root.height = 720;
    state = editorReducer(state, { type: 'IMPORT_RENDERABLE_DOCUMENT', document: doc });
    expect((state.document.root as any).width).toBe(1280);
    expect((state.document.root as any).height).toBe(720);
    expect(state.canonicalDocument?.scene.width).toBe(1280);
    expect(state.canonicalDocument?.scene.height).toBe(720);
  });
});
