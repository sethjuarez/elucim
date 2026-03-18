import { useEffect, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { EditorAction } from '../state/types';
import { CANVAS_ID, MIN_ZOOM, MAX_ZOOM } from '../state/types';
import { collectAllIds } from '../state/reducer';
import type { ElucimDocument } from '@elucim/dsl';

interface UseKeyboardOptions {
  dispatch: Dispatch<EditorAction>;
  selectedIds: string[];
  /** Current document (for select-all and copy) */
  document: ElucimDocument;
  /** Current viewport zoom level */
  zoom: number;
  /** Callback to get the current document as JSON string */
  getDocumentJson: () => string;
  /** Callback to import a document from JSON string */
  importDocument: (json: string) => void;
}

// Internal clipboard for element copy/paste (module-scoped so it persists across re-renders)
let elementClipboard: string | null = null;

/**
 * Keyboard shortcuts for the editor.
 *
 * - Delete/Backspace: Delete selected elements
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Arrow keys: Nudge selected elements by 1px (Shift = 10px)
 * - Escape: Deselect all
 * - Space (hold): Pan mode
 * - Ctrl+0: Fit to view
 * - Ctrl+1: Zoom to 100%
 * - Ctrl+= / Ctrl+-: Zoom in/out
 * - Ctrl+A: Select all
 * - Ctrl+D: Duplicate selected
 * - Ctrl+C / Ctrl+V: Copy/paste elements
 * - Ctrl+] / Ctrl+[: Bring forward / send backward
 * - Ctrl+Shift+] / Ctrl+Shift+[: Bring to front / send to back
 */
export function useKeyboardShortcuts({ dispatch, selectedIds, document, zoom, getDocumentJson, importDocument }: UseKeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't intercept if user is typing in an input
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;
    const hasSelection = selectedIds.length > 0 && !(selectedIds.length === 1 && selectedIds[0] === CANVAS_ID);

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (hasSelection) {
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

      case '0':
        if (ctrl) {
          e.preventDefault();
          dispatch({ type: 'ZOOM_TO_FIT' });
        }
        break;

      case '1':
        if (ctrl) {
          e.preventDefault();
          dispatch({ type: 'SET_VIEWPORT', viewport: { zoom: 1 } });
        }
        break;

      case '=':
      case '+':
        if (ctrl) {
          e.preventDefault();
          dispatch({ type: 'SET_VIEWPORT', viewport: { zoom: Math.min(MAX_ZOOM, zoom * 1.25) } });
        }
        break;

      case '-':
        if (ctrl) {
          e.preventDefault();
          dispatch({ type: 'SET_VIEWPORT', viewport: { zoom: Math.max(MIN_ZOOM, zoom / 1.25) } });
        }
        break;

      case 'Escape':
        dispatch({ type: 'DESELECT_ALL' });
        dispatch({ type: 'SET_TOOL', tool: 'select' });
        break;

      case ' ':
        e.preventDefault();
        dispatch({ type: 'SET_PANNING', panning: true });
        break;

      case 'a':
        if (ctrl) {
          e.preventDefault();
          const allIds = collectAllIds(document.root);
          if (allIds.length > 0) dispatch({ type: 'SELECT', ids: allIds });
        }
        break;

      case 'd':
        if (ctrl && hasSelection) {
          e.preventDefault();
          dispatch({ type: 'DUPLICATE_ELEMENTS', ids: [...selectedIds] });
        }
        break;

      case 'c':
        if (ctrl && hasSelection) {
          e.preventDefault();
          elementClipboard = JSON.stringify(selectedIds);
        }
        break;

      case 'v':
        if (ctrl && elementClipboard) {
          e.preventDefault();
          try {
            const ids = JSON.parse(elementClipboard) as string[];
            dispatch({ type: 'DUPLICATE_ELEMENTS', ids, offset: { dx: 20, dy: 20 } });
          } catch { /* invalid clipboard */ }
        }
        break;

      case ']':
        if (ctrl && hasSelection) {
          e.preventDefault();
          if (e.shiftKey) {
            dispatch({ type: 'BRING_TO_FRONT', ids: [...selectedIds] });
          } else {
            dispatch({ type: 'BRING_FORWARD', ids: [...selectedIds] });
          }
        }
        break;

      case '[':
        if (ctrl && hasSelection) {
          e.preventDefault();
          if (e.shiftKey) {
            dispatch({ type: 'SEND_TO_BACK', ids: [...selectedIds] });
          } else {
            dispatch({ type: 'SEND_BACKWARD', ids: [...selectedIds] });
          }
        }
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!hasSelection) break;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        for (const id of selectedIds) {
          dispatch({ type: 'MOVE_ELEMENT', id, dx, dy });
        }
        break;
      }

      case 'g':
        if (ctrl && !e.shiftKey && selectedIds.length >= 2) {
          e.preventDefault();
          dispatch({ type: 'GROUP_ELEMENTS', ids: [...selectedIds] });
        } else if (ctrl && e.shiftKey && selectedIds.length === 1) {
          e.preventDefault();
          dispatch({ type: 'UNGROUP', id: selectedIds[0] });
        }
        break;
    }
  }, [dispatch, selectedIds, document, zoom, getDocumentJson, importDocument]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      dispatch({ type: 'SET_PANNING', panning: false });
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
