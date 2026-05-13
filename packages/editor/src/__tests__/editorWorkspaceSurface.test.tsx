/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorWorkspaceSurface } from '../chrome/EditorWorkspaceSurface';

describe('EditorWorkspaceSurface', () => {
  afterEach(() => cleanup());

  it('composes top bar, main grid slots, and timeline dock', () => {
    render(React.createElement(EditorWorkspaceSurface, {
      workspace: 'animate',
      leftVisible: true,
      rightVisible: true,
      timelineVisible: true,
      leftWidth: 252,
      rightWidth: 286,
      timelineHeight: 340,
      selectedCount: 2,
      stateMachineWorkspaceActive: false,
      onWorkspaceSelect: vi.fn(),
      onLeftVisibleChange: vi.fn(),
      onRightVisibleChange: vi.fn(),
      onTimelineVisibleChange: vi.fn(),
      onLeftResizeStart: vi.fn(),
      onRightResizeStart: vi.fn(),
      onTimelineResizeStart: vi.fn(),
      leftDock: React.createElement('div', {}, 'Objects dock'),
      canvas: React.createElement('div', {}, 'Canvas slot'),
      inspector: React.createElement('div', {}, 'Inspector slot'),
      timeline: React.createElement('div', {}, 'Timeline slot'),
    }));

    expect(screen.getByRole('tab', { name: 'Animate workspace' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('2 selected')).toBeTruthy();
    expect(screen.getByText('Objects dock')).toBeTruthy();
    expect(screen.getByText('Canvas slot')).toBeTruthy();
    expect(screen.getByText('Inspector slot')).toBeTruthy();
    expect(screen.getByText('Timeline slot')).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'Resize timeline' })).toBeTruthy();
  });

  it('supports top-bar updater toggles and collapsed rail visibility changes', () => {
    const onWorkspaceSelect = vi.fn();
    const onLeftVisibleChange = vi.fn((value: boolean | ((current: boolean) => boolean)) => (
      typeof value === 'function' ? value(false) : value
    ));
    const onTimelineVisibleChange = vi.fn((value: boolean | ((current: boolean) => boolean)) => value);

    render(React.createElement(EditorWorkspaceSurface, {
      workspace: 'design',
      leftVisible: false,
      rightVisible: false,
      timelineVisible: false,
      leftWidth: 252,
      rightWidth: 286,
      timelineHeight: 340,
      selectedCount: 0,
      stateMachineWorkspaceActive: false,
      onWorkspaceSelect,
      onLeftVisibleChange,
      onRightVisibleChange: vi.fn(),
      onTimelineVisibleChange,
      onLeftResizeStart: vi.fn(),
      onRightResizeStart: vi.fn(),
      onTimelineResizeStart: vi.fn(),
      leftDock: React.createElement('div', {}, 'Objects dock'),
      canvas: React.createElement('div', {}, 'Canvas slot'),
      inspector: React.createElement('div', {}, 'Inspector slot'),
      timeline: React.createElement('div', {}, 'Timeline slot'),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Show Left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Polish workspace' }));

    expect(onLeftVisibleChange.mock.results[0].value).toBe(true);
    expect(onLeftVisibleChange).toHaveBeenCalledWith(true);
    expect(onTimelineVisibleChange).toHaveBeenCalledWith(true);
    expect(onWorkspaceSelect).toHaveBeenCalledWith('polish');
    expect(screen.queryByText('Timeline slot')).toBeNull();
  });
});
