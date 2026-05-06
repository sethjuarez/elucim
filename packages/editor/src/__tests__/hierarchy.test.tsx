/**
 * @vitest-environment jsdom
 */
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { GroupNode, RectNode } from '@elucim/dsl';
import { EditorProvider, useEditorState } from '../state/EditorProvider';
import { HierarchyPanel } from '../hierarchy/HierarchyPanel';
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

function renderHierarchy(onSelection: (ids: string[]) => void = () => {}) {
  return render(
    <EditorProvider
      initialDocument={{
        version: '1.0',
        root: { type: 'player', width: 800, height: 600, durationInFrames: 120, fps: 60, children: [group] },
      }}
    >
      <CaptureSelection onSelection={onSelection} />
      <HierarchyPanel />
    </EditorProvider>,
  );
}

describe('hierarchy panel', () => {
  it('selects canvas and nested children from the tree', async () => {
    let selectedIds: string[] = [];
    const { getByText } = renderHierarchy(ids => { selectedIds = ids; });

    fireEvent.click(getByText('Canvas'));
    await waitFor(() => expect(selectedIds).toEqual([CANVAS_ID]));

    fireEvent.click(getByText('child-rect'));
    await waitFor(() => expect(selectedIds).toEqual(['child-rect']));
  });

  it('collapses and expands container rows', () => {
    const { getByText, queryByText, getByRole } = renderHierarchy();

    expect(getByText('child-rect')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'Collapse g1' }));
    expect(queryByText('child-rect')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'Expand g1' }));
    expect(getByText('child-rect')).toBeTruthy();
  });
});
