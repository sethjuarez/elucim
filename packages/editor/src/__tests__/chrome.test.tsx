/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelToggle } from '../chrome/PanelToggle';
import { PanelResizeHandle } from '../chrome/PanelResizeHandle';
import { WorkspaceTab } from '../chrome/WorkspaceTab';

describe('editor chrome components', () => {
  afterEach(() => cleanup());

  it('exposes workspace tabs with stable tab semantics', () => {
    const onClick = vi.fn();

    render(<WorkspaceTab label="Design" selected={true} onClick={onClick} />);

    const tab = screen.getByRole('tab', { name: 'Design workspace', selected: true });
    fireEvent.click(tab);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('exposes panel toggles with pressed state and show/hide labels', () => {
    const { rerender } = render(<PanelToggle label="Inspector" active={true} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Hide Inspector', pressed: true })).toBeTruthy();

    rerender(<PanelToggle label="Inspector" active={false} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Show Inspector', pressed: false })).toBeTruthy();
  });

  it('exposes panel resize handles as separators and forwards pointer starts', () => {
    const onPointerDown = vi.fn();

    render(<PanelResizeHandle side="top" label="Resize timeline" onPointerDown={onPointerDown} />);

    const handle = screen.getByRole('separator', { name: 'Resize timeline' });
    expect((handle as HTMLElement).style.cursor).toBe('ns-resize');

    fireEvent.pointerDown(handle, { clientY: 120 });

    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
