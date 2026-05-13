/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorTopBar } from '../chrome/EditorTopBar';

describe('EditorTopBar', () => {
  afterEach(() => cleanup());

  it('renders branding, workspace tabs, and ordered panel toggles', () => {
    render(React.createElement(EditorTopBar, {
      workspace: 'animate',
      leftVisible: true,
      rightVisible: false,
      timelineVisible: true,
      onWorkspaceSelect: vi.fn(),
      onLeftVisibleChange: vi.fn(),
      onRightVisibleChange: vi.fn(),
      onTimelineVisibleChange: vi.fn(),
    }));

    expect(screen.getByText('Elucim')).toBeTruthy();
    expect(screen.getByText('Scene editor')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Animate workspace' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Design workspace' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'State Machine workspace' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Polish workspace' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide left panel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Inspector' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide timeline' })).toBeTruthy();
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.getAllByRole('button').slice(-3).map(button => button.getAttribute('aria-label'))).toEqual([
      'Hide left panel',
      'Hide timeline',
      'Show Inspector',
    ]);
  });

  it('emits workspace and panel toggle requests through typed callbacks', () => {
    const onWorkspaceSelect = vi.fn();
    const onLeftVisibleChange = vi.fn();
    const onRightVisibleChange = vi.fn();
    const onTimelineVisibleChange = vi.fn();

    render(React.createElement(EditorTopBar, {
      workspace: 'design',
      leftVisible: true,
      rightVisible: true,
      timelineVisible: false,
      onWorkspaceSelect,
      onLeftVisibleChange,
      onRightVisibleChange,
      onTimelineVisibleChange,
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'State Machine workspace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide Inspector' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));

    expect(onWorkspaceSelect).toHaveBeenCalledWith('states');
    expect(onLeftVisibleChange.mock.calls[0][0](true)).toBe(false);
    expect(onRightVisibleChange.mock.calls[0][0](true)).toBe(false);
    expect(onTimelineVisibleChange.mock.calls[0][0](false)).toBe(true);
  });
});
