/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorTopBar } from '../chrome/EditorTopBar';

describe('EditorTopBar', () => {
  afterEach(() => cleanup());

  it('renders branding and ordered panel toggles', () => {
    render(React.createElement(EditorTopBar, {
      leftVisible: true,
      rightVisible: false,
      timelineVisible: true,
      onLeftVisibleChange: vi.fn(),
      onRightVisibleChange: vi.fn(),
      onTimelineVisibleChange: vi.fn(),
    }));

    expect(screen.getByText('Elucim')).toBeTruthy();
    expect(screen.getByText('Scene editor')).toBeTruthy();
    expect(screen.queryByText('Design')).toBeNull();
    expect(screen.queryByText('Animate')).toBeNull();
    expect(screen.queryByText('State Machine')).toBeNull();
    expect(screen.queryByText('Polish')).toBeNull();
    expect(screen.getByRole('button', { name: 'Hide left panel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Inspector' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide timeline' })).toBeTruthy();
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
      'Hide left panel',
      'Hide timeline',
      'Show Inspector',
    ]);
  });

  it('emits panel toggle requests through typed callbacks', () => {
    const onLeftVisibleChange = vi.fn();
    const onRightVisibleChange = vi.fn();
    const onTimelineVisibleChange = vi.fn();

    render(React.createElement(EditorTopBar, {
      leftVisible: true,
      rightVisible: true,
      timelineVisible: false,
      onLeftVisibleChange,
      onRightVisibleChange,
      onTimelineVisibleChange,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Hide left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide Inspector' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show timeline' }));

    expect(onLeftVisibleChange.mock.calls[0][0](true)).toBe(false);
    expect(onRightVisibleChange.mock.calls[0][0](true)).toBe(false);
    expect(onTimelineVisibleChange.mock.calls[0][0](false)).toBe(true);
  });
});
