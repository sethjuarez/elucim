/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildEditorRootClassName,
  buildEditorRootStyle,
  EDITOR_ROOT_SCOPED_STYLES,
  EditorRoot,
} from '../chrome/EditorRoot';

describe('EditorRoot', () => {
  afterEach(() => cleanup());

  it('composes the root class name with consumer classes', () => {
    expect(buildEditorRootClassName()).toBe('elucim-editor ');
    expect(buildEditorRootClassName('embedded')).toBe('elucim-editor embedded');
  });

  it('builds token-based root style while allowing consumer overrides', () => {
    const style = buildEditorRootStyle({ '--elucim-editor-accent': '#7c3aed' } as React.CSSProperties, 'light', {
      height: 480,
    });

    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.background).toBe('var(--elucim-editor-bg, #1a1a2e)');
    expect(style.color).toBe('var(--elucim-editor-fg, #e0e0e0)');
    expect(style.colorScheme).toBe('light');
    expect(style.height).toBe(480);
    expect(style['--elucim-editor-accent' as keyof React.CSSProperties]).toBe('#7c3aed');
  });

  it('injects scoped chrome styles and renders children', () => {
    const { container } = render((
      <EditorRoot themeVars={{}} colorScheme="dark">
        <div>Editor content</div>
      </EditorRoot>
    ));

    expect(container.firstElementChild?.className).toBe('elucim-editor ');
    expect(screen.getByText('Editor content')).toBeTruthy();
    expect(container.querySelector('style')?.textContent).toContain('.elucim-editor input:focus');
    expect(EDITOR_ROOT_SCOPED_STYLES).toContain('var(--elucim-editor-border, #334155)');
    expect(EDITOR_ROOT_SCOPED_STYLES).toContain('var(--elucim-editor-accent, #4a9eff)');
  });
});
