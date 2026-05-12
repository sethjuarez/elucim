/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildEditorGridColumns, EditorMainGrid } from '../chrome/EditorMainGrid';
import { buildTimelineDockStyle, EditorTimelineDock } from '../chrome/EditorTimelineDock';

describe('EditorMainGrid', () => {
  afterEach(() => cleanup());

  it('builds stable grid columns from panel visibility and widths', () => {
    expect(buildEditorGridColumns(true, 252, true, 286)).toBe('252px minmax(260px, 1fr) 286px');
    expect(buildEditorGridColumns(false, 252, true, 286)).toBe('0px minmax(260px, 1fr) 286px');
    expect(buildEditorGridColumns(true, 300, false, 286)).toBe('300px minmax(260px, 1fr) 0px');
  });

  it('renders visible slots, resize handles, and collapsed rail controls', () => {
    const onLeftVisibleChange = vi.fn();
    const onRightVisibleChange = vi.fn();
    const onTimelineVisibleChange = vi.fn();

    const { container } = render(React.createElement(EditorMainGrid, {
      leftVisible: false,
      rightVisible: true,
      timelineVisible: false,
      leftWidth: 252,
      rightWidth: 286,
      stateMachineWorkspaceActive: false,
      onLeftVisibleChange,
      onRightVisibleChange,
      onTimelineVisibleChange,
      onLeftResizeStart: vi.fn(),
      onRightResizeStart: vi.fn(),
      leftDock: React.createElement('div', {}, 'Objects dock'),
      canvas: React.createElement('div', {}, 'Canvas slot'),
      inspector: React.createElement('div', {}, 'Inspector slot'),
    }));

    expect((container.firstChild as HTMLElement).style.gridTemplateColumns).toBe('0px minmax(260px, 1fr) 286px');
    expect(screen.queryByText('Objects dock')).toBeNull();
    expect(screen.getByText('Canvas slot')).toBeTruthy();
    expect(screen.getByText('Inspector slot')).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'Resize inspector' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Show left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));

    expect(onLeftVisibleChange).toHaveBeenCalledWith(true);
    expect(onTimelineVisibleChange).toHaveBeenCalledWith(true);
    expect(onRightVisibleChange).not.toHaveBeenCalled();
  });
});

describe('EditorTimelineDock', () => {
  afterEach(() => cleanup());

  it('builds standard and state-machine timeline dock styles', () => {
    expect(buildTimelineDockStyle(false, 340)).toMatchObject({
      height: 340,
      flex: '0 0 auto',
      minHeight: undefined,
      position: 'relative',
    });
    expect(buildTimelineDockStyle(true, 340)).toMatchObject({
      height: undefined,
      flex: '1 1 0',
      minHeight: 360,
      position: 'relative',
    });
  });

  it('renders nothing when hidden and children plus resize handle when visible', () => {
    const { rerender } = render(React.createElement(EditorTimelineDock, {
      visible: false,
      stateMachineWorkspaceActive: false,
      timelineHeight: 340,
      onResizeStart: vi.fn(),
    }, React.createElement('div', {}, 'Timeline slot')));

    expect(screen.queryByText('Timeline slot')).toBeNull();

    rerender(React.createElement(EditorTimelineDock, {
      visible: true,
      stateMachineWorkspaceActive: true,
      timelineHeight: 340,
      onResizeStart: vi.fn(),
    }, React.createElement('div', {}, 'Timeline slot')));

    expect(screen.getByText('Timeline slot')).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'Resize timeline' })).toBeTruthy();
  });
});
