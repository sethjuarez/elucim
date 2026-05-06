/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { editorReducer, findElementById } from '../state/reducer';
import { createInitialState } from '../state/types';
import { EditorProvider, useEditorState } from '../state/EditorProvider';
import { Inspector } from '../inspector/Inspector';
import type { BarChartNode, CircleNode, FunctionPlotNode, GroupNode, RectNode, TextNode, LaTeXNode } from '@elucim/dsl';

const circle: CircleNode = { type: 'circle', id: 'c1', cx: 100, cy: 200, r: 50, fill: '#ff0000', stroke: '#00ff00', strokeWidth: 2, opacity: 0.8 };
const rect: RectNode = { type: 'rect', id: 'r1', x: 50, y: 50, width: 100, height: 80, fill: '#0000ff' };
const text: TextNode = { type: 'text', id: 't1', x: 200, y: 100, content: 'Hello', fontSize: 24, fill: '#fff' };
const latex: LaTeXNode = { type: 'latex', id: 'lx1', x: 300, y: 300, expression: '\\frac{a}{b}', fontSize: 20 };
const heroGroup: GroupNode = {
  type: 'group',
  id: 'hero1',
  children: [
    { type: 'rect', id: 'hero-bg', x: 100, y: 100, width: 320, height: 160, fill: '$surface', stroke: '$accent' },
    { type: 'text', id: 'hero-title', x: 260, y: 170, content: 'Talk hook', fill: '$title', fontSize: 36 },
    { type: 'text', id: 'hero-subtitle', x: 260, y: 210, content: 'Make it memorable', fill: '$subtitle', fontSize: 18 },
  ],
};
const barChart: BarChartNode = {
  type: 'barChart',
  id: 'b1',
  x: 100,
  y: 100,
  width: 320,
  height: 180,
  bars: [
    { label: 'A', value: 40, color: '$accent' },
    { label: 'B', value: 60, color: '#123456' },
  ],
};
const functionPlot: FunctionPlotNode = {
  type: 'functionPlot',
  id: 'f1',
  fn: 'sin(x)',
  origin: [400, 300],
  scale: 40,
  domain: [-5, 5],
};

function stateWith(...elements: any[]) {
  return createInitialState({
    version: '1.0',
    root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: elements },
  });
}

// ─── Position field updates ────────────────────────────────────────────────

describe('inspector position updates', () => {
  it('updates circle cx/cy/r', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { cx: 150 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.cx).toBe(150);
    expect(el.cy).toBe(200); // unchanged
  });

  it('updates rect x/y/width/height', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { width: 200, height: 150 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as RectNode;
    expect(el.width).toBe(200);
    expect(el.height).toBe(150);
    expect(el.x).toBe(50);
  });
});

describe('inspector function fields', () => {
  it('shows editable range controls for function plot yClamp defaults', async () => {
    let latestFunction: FunctionPlotNode | null = null;

    function SelectAndCapture() {
      const { state, dispatch } = useEditorState();
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['f1'] });
      }, [dispatch]);
      useEffect(() => {
        latestFunction = findElementById(state.document.root, 'f1')?.element as FunctionPlotNode;
      }, [state.document]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [functionPlot] },
          },
        },
        React.createElement(SelectAndCapture),
        React.createElement(Inspector),
      ),
    );

    const rangeMin = await screen.findByLabelText('Range Min') as HTMLInputElement;
    const rangeMax = screen.getByLabelText('Range Max') as HTMLInputElement;

    expect(rangeMin.value).toBe('-10');
    expect(rangeMax.value).toBe('10');

    fireEvent.change(rangeMax, { target: { value: '4' } });
    await waitFor(() => expect(latestFunction?.yClamp).toEqual([-10, 4]));
  });
});

// ─── Style field updates ───────────────────────────────────────────────────

describe('inspector style updates', () => {
  it('updates fill color', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { fill: '#123456' } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.fill).toBe('#123456');
  });

  it('updates stroke and strokeWidth', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { stroke: '#aabbcc', strokeWidth: 5 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.stroke).toBe('#aabbcc');
    expect(el.strokeWidth).toBe(5);
  });

  it('updates opacity', () => {
    let state = stateWith(circle);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'c1', changes: { opacity: 0.5 } as any });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.opacity).toBe(0.5);
  });

  it('updates fontSize', () => {
    let state = stateWith(text);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 't1', changes: { fontSize: 36 } as any });
    const el = findElementById(state.document.root, 't1')!.element as TextNode;
    expect(el.fontSize).toBe(36);
  });

  it('preserves semantic tokens when previewing color fields', async () => {
    const tokenizedText: TextNode = { ...text, fill: '$title' };

    function SelectElement() {
      const { dispatch } = useEditorState();
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['t1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [tokenizedText] },
          },
        },
        React.createElement(SelectElement),
        React.createElement(Inspector),
      ),
    );

    const fillValue = await screen.findByLabelText('Fill value') as HTMLInputElement;
    const fillPicker = screen.getByLabelText('Fill color picker') as HTMLInputElement;

    expect(fillValue.value).toBe('$title');
    expect(fillPicker.value).toBe('#e0e7ff');
    expect(fillPicker.disabled).toBe(true);

    fireEvent.change(fillPicker, { target: { value: '#ff0000' } });
    expect(fillValue.value).toBe('$title');

    fireEvent.change(fillValue, { target: { value: '#123456' } });
    expect(fillValue.value).toBe('#123456');
    expect(fillPicker.disabled).toBe(false);

    fireEvent.change(fillPicker, { target: { value: '#654321' } });
    expect(fillValue.value).toBe('#654321');

    fireEvent.change(fillValue, { target: { value: 'rgb(255, 0, 0)' } });
    expect(fillPicker.disabled).toBe(true);
    fireEvent.change(fillPicker, { target: { value: '#abcdef' } });
    expect(fillValue.value).toBe('rgb(255, 0, 0)');
  });

  it('preserves semantic tokens in array color cells', async () => {
    function SelectElement() {
      const { dispatch } = useEditorState();
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['b1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [barChart] },
          },
        },
        React.createElement(SelectElement),
        React.createElement(Inspector),
      ),
    );

    const tokenValue = await screen.findByLabelText('Color 0 value') as HTMLInputElement;
    const tokenPicker = screen.getByLabelText('Color 0 color picker') as HTMLInputElement;

    expect(tokenValue.value).toBe('$accent');
    expect(tokenPicker.value).toBe('#4fc3f7');
    expect(tokenPicker.disabled).toBe(true);

    fireEvent.change(tokenPicker, { target: { value: '#ff0000' } });
    expect(tokenValue.value).toBe('$accent');

    const hexValue = screen.getByLabelText('Color 1 value') as HTMLInputElement;
    const hexPicker = screen.getByLabelText('Color 1 color picker') as HTMLInputElement;

    expect(hexValue.value).toBe('#123456');
    expect(hexPicker.disabled).toBe(false);

    fireEvent.change(hexPicker, { target: { value: '#654321' } });
    expect(hexValue.value).toBe('#654321');
  });
});

describe('inspector group editing', () => {
  it('selects group children and shows a parent breadcrumb', async () => {
    let latestSelectedIds: string[] = [];
    let latestTitle: TextNode | null = null;

    function SelectAndCapture() {
      const { state, dispatch } = useEditorState();
      latestSelectedIds = state.selectedIds;
      latestTitle = findElementById(state.document.root, 'hero-title')?.element as TextNode | null;
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['hero1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [heroGroup] },
          },
        },
        React.createElement(SelectAndCapture),
        React.createElement(Inspector),
      ),
    );

    await screen.findByLabelText(/Select Text "Talk hook"/);
    const positionButtons = screen.getAllByRole('button', { name: /Position/ });
    fireEvent.click(positionButtons[positionButtons.length - 1]);

    const titleButton = await screen.findByLabelText(/Select Text "Talk hook"/);
    fireEvent.click(titleButton);

    await waitFor(() => expect(latestSelectedIds).toEqual(['hero-title']));
    const selectionPath = screen.getByLabelText('Selection path').textContent ?? '';
    expect(selectionPath).toContain('Group');
    expect(selectionPath).toContain('hero1');
    expect(selectionPath).toContain('hero-title');
    const textField = screen.getAllByLabelText('Text')
      .find((input): input is HTMLInputElement => (input as HTMLInputElement).value === 'Talk hook');
    expect(textField).toBeDefined();
    if (!textField) throw new Error('Expected selected child text field');
    expect(textField.value).toBe('Talk hook');
    const contentButtons = screen.getAllByRole('button', { name: /Content/ });
    expect(contentButtons[contentButtons.length - 1].getAttribute('aria-expanded')).toBe('true');

    fireEvent.change(textField, { target: { value: 'Updated hook' } });
    await waitFor(() => expect(latestTitle?.content).toBe('Updated hook'));

    fireEvent.click(screen.getByTitle(/Select parent Group/));
    await waitFor(() => expect(latestSelectedIds).toEqual(['hero1']));
  });

  it('selects anonymous children by generated path id', async () => {
    let latestSelectedIds: string[] = [];
    const anonymousGroup: GroupNode = {
      type: 'group',
      id: 'anonGroup',
      children: [
        { type: 'rect', x: 100, y: 100, width: 80, height: 40, fill: '$surface' },
        { type: 'text', x: 140, y: 124, content: 'No id', fill: '$title' },
      ],
    };

    function SelectAndCapture() {
      const { state, dispatch } = useEditorState();
      latestSelectedIds = state.selectedIds;
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['anonGroup'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [anonymousGroup] },
          },
        },
        React.createElement(SelectAndCapture),
        React.createElement(Inspector),
      ),
    );

    fireEvent.click(await screen.findByLabelText('Select Rect'));
    await waitFor(() => expect(latestSelectedIds).toEqual(['anonGroup.rect[0]']));
  });

  it('shows child selection for animation wrappers', async () => {
    let latestSelectedIds: string[] = [];
    const wrappedGroup: GroupNode = { ...heroGroup, id: 'wrappedGroup' };
    const wrapper = {
      type: 'fadeIn',
      id: 'wrap1',
      duration: 12,
      children: [wrappedGroup],
    } as any;

    function SelectAndCapture() {
      const { state, dispatch } = useEditorState();
      latestSelectedIds = state.selectedIds;
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['wrap1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [wrapper] },
          },
        },
        React.createElement(SelectAndCapture),
        React.createElement(Inspector),
      ),
    );

    expect(await screen.findByRole('list', { name: 'FadeIn — wrap1 children' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Select Group — wrappedGroup'));
    await waitFor(() => expect(latestSelectedIds).toEqual(['wrappedGroup']));
  });
});

// ─── Animation field updates ───────────────────────────────────────────────

describe('inspector animation updates', () => {
  it('sets fadeIn', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { fadeIn: 30 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.fadeIn).toBe(30);
  });

  it('sets fadeOut', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { fadeOut: 15 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.fadeOut).toBe(15);
  });

  it('adds animation property fields from the dropdown menu', async () => {
    function SelectElement() {
      const { dispatch } = useEditorState();
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['r1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [rect] },
          },
        },
        React.createElement(SelectElement),
        React.createElement(Inspector),
      ),
    );

    const addButtons = await screen.findAllByRole('button', { name: /\+ Add property/ });
    fireEvent.click(addButtons[0]);
    fireEvent.pointerDown(await screen.findByRole('menuitem', { name: 'Fade In' }));

    expect(await screen.findByLabelText('Fade In')).toBeTruthy();
  });
});

// ─── Transform field updates ───────────────────────────────────────────────

describe('inspector transform updates', () => {
  it('sets rotation', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { rotation: 45 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.rotation).toBe(45);
  });

  it('sets zIndex', () => {
    let state = stateWith(rect);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'r1', changes: { zIndex: 5 } as any });
    const el = findElementById(state.document.root, 'r1')!.element as any;
    expect(el.zIndex).toBe(5);
  });

  it('adds transform property fields from the dropdown menu', async () => {
    function SelectElement() {
      const { dispatch } = useEditorState();
      useEffect(() => {
        dispatch({ type: 'SELECT', ids: ['r1'] });
      }, [dispatch]);
      return null;
    }

    render(
      React.createElement(
        EditorProvider,
        {
          initialDocument: {
            version: '1.0',
            root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: [rect] },
          },
        },
        React.createElement(SelectElement),
        React.createElement(Inspector),
      ),
    );

    const addButtons = await screen.findAllByRole('button', { name: /\+ Add property/ });
    fireEvent.click(addButtons[1]);
    fireEvent.pointerDown(await screen.findByRole('menuitem', { name: 'Rotation' }));

    expect(await screen.findByLabelText('Rotation')).toBeTruthy();
  });
});

// ─── Element-specific field updates ────────────────────────────────────────

describe('inspector element-specific updates', () => {
  it('updates text content', () => {
    let state = stateWith(text);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 't1', changes: { content: 'World' } as any });
    const el = findElementById(state.document.root, 't1')!.element as TextNode;
    expect(el.content).toBe('World');
  });

  it('updates latex expression', () => {
    let state = stateWith(latex);
    state = editorReducer(state, { type: 'UPDATE_ELEMENT', id: 'lx1', changes: { expression: 'E=mc^2' } as any });
    const el = findElementById(state.document.root, 'lx1')!.element as LaTeXNode;
    expect(el.expression).toBe('E=mc^2');
  });

  it('multiple field changes in one update', () => {
    let state = stateWith(circle);
    state = editorReducer(state, {
      type: 'UPDATE_ELEMENT',
      id: 'c1',
      changes: { cx: 300, cy: 400, r: 75, fill: '#abcdef' } as any,
    });
    const el = findElementById(state.document.root, 'c1')!.element as CircleNode;
    expect(el.cx).toBe(300);
    expect(el.cy).toBe(400);
    expect(el.r).toBe(75);
    expect(el.fill).toBe('#abcdef');
  });
});
