/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EditorTopBar } from '../chrome/EditorTopBar';

describe('EditorTopBar', () => {
  afterEach(() => cleanup());

  it('renders standalone branding without panel controls', () => {
    render(React.createElement(EditorTopBar));

    expect(screen.getByText('Elucim')).toBeTruthy();
    expect(screen.getByText('Scene editor')).toBeTruthy();
    expect(screen.queryByText('Design')).toBeNull();
    expect(screen.queryByText('Animate')).toBeNull();
    expect(screen.queryByText('State Machine')).toBeNull();
    expect(screen.queryByText('Polish')).toBeNull();
    expect(screen.queryByRole('button', { name: /panel|timeline|Inspector/i })).toBeNull();
    expect(screen.queryByText(/selected/)).toBeNull();
  });
});
