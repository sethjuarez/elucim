/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../state/EditorProvider';
import { createDefaultDocument } from '../state/types';
import { ElucimEditorLayout } from '../index';

describe('ElucimEditorLayout module', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.CSS = { escape: (value: string) => value } as any;
  });

  afterEach(() => cleanup());

  it('renders the exported layout inside an editor provider', () => {
    const { container } = render((
      <EditorProvider initialDocument={createDefaultDocument()}>
        <ElucimEditorLayout className="embedded-editor" />
      </EditorProvider>
    ));

    expect(container.firstElementChild?.className).toBe('elucim-editor embedded-editor');
    expect(screen.getByText('Elucim')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide left panel' })).toBeTruthy();
    expect(screen.getAllByText('Canvas').length).toBeGreaterThan(0);
  });
});
