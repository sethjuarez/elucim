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
      leftVisible: true,
      rightVisible: true,
      timelineVisible: true,
      leftWidth: 252,
      rightWidth: 286,
      timelineHeight: 340,
      stateMachineWorkspaceActive: false,
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

    expect(screen.getByText('Elucim')).toBeTruthy();
    expect(screen.getByText('Objects dock')).toBeTruthy();
    expect(screen.getByText('Canvas slot')).toBeTruthy();
    expect(screen.getByText('Inspector slot')).toBeTruthy();
    expect(screen.getByText('Timeline slot')).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'Resize timeline' })).toBeTruthy();
  });

  it('supports top-bar updater toggles without duplicate canvas controls', () => {
    const onLeftVisibleChange = vi.fn((value: boolean | ((current: boolean) => boolean)) => (
      typeof value === 'function' ? value(false) : value
    ));
    const onTimelineVisibleChange = vi.fn((value: boolean | ((current: boolean) => boolean)) => (
      typeof value === 'function' ? value(false) : value
    ));

    render(React.createElement(EditorWorkspaceSurface, {
      leftVisible: false,
      rightVisible: false,
      timelineVisible: false,
      leftWidth: 252,
      rightWidth: 286,
      timelineHeight: 340,
      stateMachineWorkspaceActive: false,
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

    fireEvent.click(screen.getByRole('button', { name: 'Show left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));

    expect(onLeftVisibleChange.mock.results[0].value).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Show left panel' })).toHaveLength(1);
    expect(onTimelineVisibleChange.mock.results[0].value).toBe(true);
    expect(screen.queryByText('Timeline slot')).toBeNull();
  });
});
