/**
 * @vitest-environment jsdom
 */
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GroupNode, RectNode } from '@elucim/dsl';
import { EditorProvider, useEditorState } from '../state/EditorProvider';
import { ObjectsPanel } from '../objects/ObjectsPanel';
import { CANVAS_ID } from '../state/types';

const rect: RectNode = { type: 'rect', id: 'r1', x: 10, y: 20, width: 100, height: 80 };
const group: GroupNode = { type: 'group', id: 'g1', children: [{ ...rect, id: 'child-rect' }] };

afterEach(() => {
  cleanup();
});

function CaptureSelection({ onSelection }: { onSelection: (ids: string[]) => void }) {
  const { state } = useEditorState();
  useEffect(() => {
    onSelection(state.selectedIds);
  }, [onSelection, state.selectedIds]);
  return null;
}

function CaptureRootChildren({ onChildren }: { onChildren: (ids: string[]) => void }) {
  const { state } = useEditorState();
  useEffect(() => {
    const children = 'children' in state.document.root ? state.document.root.children ?? [] : [];
    onChildren(children.map(child => ('id' in child && child.id) ? child.id : child.type));
  }, [onChildren, state.document]);
  return null;
}

function renderObjectsPanel(
  onSelection: (ids: string[]) => void = () => {},
  children: unknown[] = [group],
  onChildren: (ids: string[]) => void = () => {},
) {
  return render(
    <EditorProvider
      initialDocument={{
        version: 'render-tree',
        root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: children as any },
      }}
    >
      <CaptureSelection onSelection={onSelection} />
      <CaptureRootChildren onChildren={onChildren} />
      <ObjectsPanel />
    </EditorProvider>,
  );
}

describe('objects panel', () => {
  it('selects canvas and nested children from the tree', async () => {
    let selectedIds: string[] = [];
    const { getByText } = renderObjectsPanel(ids => { selectedIds = ids; });

    fireEvent.click(getByText('Canvas'));
    await waitFor(() => expect(selectedIds).toEqual([CANVAS_ID]));

    fireEvent.click(getByText('child-rect'));
    await waitFor(() => expect(selectedIds).toEqual(['child-rect']));
    expect(screen.queryByText(/objects? selected/)).toBeNull();
  });

  it('supports modifier-click multi-selection in Objects', async () => {
    let selectedIds: string[] = [];
    const backRect: RectNode = { ...rect, id: 'back-rect' };
    const frontRect: RectNode = { ...rect, id: 'front-rect' };
    const { getByText } = renderObjectsPanel(ids => { selectedIds = ids; }, [backRect, frontRect]);

    fireEvent.click(getByText('back-rect'));
    await waitFor(() => expect(selectedIds).toEqual(['back-rect']));

    fireEvent.click(getByText('front-rect'), { ctrlKey: true });
    await waitFor(() => expect(selectedIds).toEqual(['back-rect', 'front-rect']));
    expect(screen.queryByText(/objects? selected/)).toBeNull();
  });

  it('opens the same object actions from the Objects context menu', async () => {
    let rootChildren: string[] = [];
    const backRect: RectNode = { ...rect, id: 'back-rect' };
    const frontRect: RectNode = { ...rect, id: 'front-rect' };
    const { getByText } = renderObjectsPanel(() => {}, [backRect, frontRect], ids => { rootChildren = ids; });

    fireEvent.contextMenu(getByText('front-rect'), { clientX: 120, clientY: 80 });
    fireEvent.click(await screen.findByRole('button', { name: /Delete/ }));

    await waitFor(() => expect(rootChildren).toEqual(['back-rect']));
  });

  it('collapses and expands container rows', () => {
    const { getByText, queryByText, getByRole } = renderObjectsPanel();

    expect(getByText('child-rect')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Collapse g1' }));
    expect(queryByText('child-rect')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'Expand g1' }));
    expect(getByText('child-rect')).toBeTruthy();
  });

  it('reorders sibling rows by dragging in Objects', async () => {
    let rootChildren: string[] = [];
    const backRect: RectNode = { ...rect, id: 'back-rect' };
    const frontRect: RectNode = { ...rect, id: 'front-rect' };
    const { getAllByRole, getByText } = renderObjectsPanel(() => {}, [backRect, frontRect], ids => { rootChildren = ids; });
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: () => {},
      getData: () => '',
    };

    expect(getAllByRole('treeitem')[0].textContent).toContain('front-rect');

    const frontRow = getByText('front-rect').closest('[role="treeitem"]')!;
    const backRow = getByText('back-rect').closest('[role="treeitem"]')!;
    backRow.getBoundingClientRect = () => ({ top: 0, bottom: 26, left: 0, right: 200, width: 200, height: 26, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.dragStart(frontRow, { dataTransfer });
    fireEvent.dragOver(backRow, { dataTransfer, clientY: 20 });
    fireEvent.drop(backRow, { dataTransfer, clientY: 20 });

    await waitFor(() => expect(rootChildren).toEqual(['front-rect', 'back-rect']));
  });
});
