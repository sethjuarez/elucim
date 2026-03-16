import { useEffect, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction } from '../state/types';

interface UseKeyboardOptions {
  dispatch: Dispatch<EditorAction>;
  selectedIds: string[];
  /** Callback to get the current document as JSON string */
  getDocumentJson: () => string;
  /** Callback to import a document from JSON string */
  importDocument: (json: string) => void;
}

/**
 * Keyboard shortcuts for the editor.
 *
 * - Delete/Backspace: Delete selected elements
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Arrow keys: Nudge selected elements by 1px (Shift = 10px)
 * - Escape: Deselect all
 * - Space: Toggle play/pause
 * - Ctrl+A: Select all (TODO)
 */
export function useKeyboardShortcuts({ dispatch, selectedIds, getDocumentJson, importDocument }: UseKeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't intercept if user is typing in an input
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (selectedIds.length > 0) {
          e.preventDefault();
          dispatch({ type: 'DELETE_ELEMENTS', ids: [...selectedIds] });
        }
        break;

      case 'z':
        if (ctrl && !e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'UNDO' });
        } else if (ctrl && e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
        break;

      case 'y':
        if (ctrl) {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
        break;

      case 'Escape':
        dispatch({ type: 'DESELECT_ALL' });
        dispatch({ type: 'SET_TOOL', tool: 'select' });
        break;

      case ' ':
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', playing: true }); // toggled in timeline
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (selectedIds.length === 0) break;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        for (const id of selectedIds) {
          dispatch({ type: 'MOVE_ELEMENT', id, dx, dy });
        }
        break;
      }
    }
  }, [dispatch, selectedIds, getDocumentJson, importDocument]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
