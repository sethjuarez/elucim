import React, { createContext, useContext, useReducer, useMemo, type Dispatch, type ReactNode } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import type { EditorState, EditorAction } from './types';
import { createInitialState } from './types';
import { editorReducer } from './reducer';

// ─── Context ───────────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export interface EditorProviderProps {
  /** Initial document to edit. If not provided, creates an empty player scene. */
  initialDocument?: ElucimDocument;
  /** Initial animation frame (e.g. durationInFrames - 1 to show all fadeIn elements). */
  initialFrame?: number;
  children: ReactNode;
}

export function EditorProvider({ initialDocument, initialFrame, children }: EditorProviderProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    { doc: initialDocument, frame: initialFrame },
    ({ doc, frame }) => createInitialState(doc, frame),
  );

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useEditorState(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditorState must be used within an <EditorProvider>');
  }
  return ctx;
}

/** Read-only access to the editor state (no dispatch) */
export function useEditorDocument(): ElucimDocument {
  const { state } = useEditorState();
  return state.document;
}

export function useEditorSelection(): string[] {
  const { state } = useEditorState();
  return state.selectedIds;
}
