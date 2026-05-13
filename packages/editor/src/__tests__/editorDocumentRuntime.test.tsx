/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ElucimDocument, RenderableDocument } from '@elucim/dsl';
import { EditorDocumentRuntime } from '../document/EditorDocumentRuntime';
import { useEditorState } from '../state/EditorProvider';

const renderableDocument: RenderableDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    durationInFrames: 45,
    children: [],
  },
};

const canonicalDocument: ElucimDocument = {
  version: '2.0',
  metadata: { title: 'Runtime document' },
  scene: { type: 'player', width: 800, height: 600, children: ['title'] },
  elements: {
    title: {
      id: 'title',
      type: 'text',
      props: { type: 'text', content: 'Hello' },
    },
  },
};

function RuntimeProbe({ emitChange }: { emitChange: (document: ElucimDocument) => void }) {
  const { state } = useEditorState();
  return (
    <button type="button" onClick={() => emitChange(canonicalDocument)}>
      Frame {state.currentFrame}
    </button>
  );
}

describe('EditorDocumentRuntime', () => {
  afterEach(() => cleanup());

  it('sets up the editor provider with the resolved initial frame', () => {
    render((
      <EditorDocumentRuntime initialDocument={renderableDocument} initialFrame="last">
        {emitChange => <RuntimeProbe emitChange={emitChange} />}
      </EditorDocumentRuntime>
    ));

    expect(screen.getByRole('button', { name: 'Frame 44' })).toBeTruthy();
  });

  it('emits direct layout document changes with stable editor details', () => {
    const onDocumentChange = vi.fn();

    render((
      <EditorDocumentRuntime initialDocument={renderableDocument} onDocumentChange={onDocumentChange}>
        {emitChange => <RuntimeProbe emitChange={emitChange} />}
      </EditorDocumentRuntime>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onDocumentChange).toHaveBeenCalledWith(canonicalDocument, {
      changedFormat: false,
      warnings: [],
    });
  });
});
