import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ElucimDocument } from '@elucim/dsl';
import { ElucimEditor } from '@elucim/editor';
import { createNewDocument } from './sampleDocument';
import { getDisplayName, serializeDocument } from './documentIo';
import { nativeBridge } from './tauriBridge';

interface DocumentSession {
  document: ElucimDocument;
  filePath: string | null;
  savedSerialized: string;
  warnings: string[];
}

const initialDocument = createNewDocument();

export function ElucimApp() {
  const [session, setSession] = useState<DocumentSession>(() => ({
    document: initialDocument,
    filePath: null,
    savedSerialized: serializeDocument(initialDocument),
    warnings: [],
  }));
  const [status, setStatus] = useState('Ready');
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const currentSerialized = useMemo(() => serializeDocument(session.document), [session.document]);
  const dirty = currentSerialized !== session.savedSerialized;
  const displayName = getDisplayName(session.filePath);

  const runWithErrors = useCallback(async (title: string, action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      const message = (error as Error).message;
      setStatus(message);
      await nativeBridge.showError(title, message);
    }
  }, []);

  const guardUnsavedChanges = useCallback(async () => {
    if (serializeDocument(sessionRef.current.document) === sessionRef.current.savedSerialized) return true;
    return nativeBridge.confirmDiscardChanges();
  }, []);

  const loadFile = useCallback(async (path: string) => {
    if (!(await guardUnsavedChanges())) return;
    await runWithErrors('Open failed', async () => {
      const opened = await nativeBridge.openDocumentAtPath(path);
      setSession({
        document: opened.document,
        filePath: opened.path,
        savedSerialized: opened.serialized,
        warnings: opened.warnings,
      });
      setStatus(`Opened ${getDisplayName(opened.path)}`);
    });
  }, [guardUnsavedChanges, runWithErrors]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    nativeBridge.listenForOpenFile(path => {
      void loadFile(path);
    }).then(nextUnlisten => {
      if (disposed) nextUnlisten();
      else unlisten = nextUnlisten;
    }).catch(() => undefined);
    nativeBridge.getInitialOpenFiles()
      .then(paths => {
        if (!disposed && paths[0]) void loadFile(paths[0]);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [loadFile]);

  useEffect(() => {
    nativeBridge.checkForUpdate()
      .then(update => {
        if (update) setUpdateAvailable(update.version);
      })
      .catch(() => undefined);
  }, []);

  const handleNew = useCallback(() => {
    void runWithErrors('New document failed', async () => {
      if (!(await guardUnsavedChanges())) return;
      const document = createNewDocument();
      setSession({
        document,
        filePath: null,
        savedSerialized: serializeDocument(document),
        warnings: [],
      });
      setStatus('Created new document');
    });
  }, [guardUnsavedChanges, runWithErrors]);

  const handleOpen = useCallback(() => {
    void runWithErrors('Open failed', async () => {
      if (!(await guardUnsavedChanges())) return;
      const opened = await nativeBridge.openDocument();
      if (!opened) return;
      setSession({
        document: opened.document,
        filePath: opened.path,
        savedSerialized: opened.serialized,
        warnings: opened.warnings,
      });
      setStatus(`Opened ${getDisplayName(opened.path)}`);
    });
  }, [guardUnsavedChanges, runWithErrors]);

  const handleSave = useCallback(() => {
    void runWithErrors('Save failed', async () => {
      const saved = await nativeBridge.saveDocument(sessionRef.current.filePath, sessionRef.current.document);
      if (!saved) return;
      setSession(current => ({
        ...current,
        filePath: saved.path,
        savedSerialized: saved.serialized,
      }));
      setStatus(`Saved ${getDisplayName(saved.path)}`);
    });
  }, [runWithErrors]);

  const handleSaveAs = useCallback(() => {
    void runWithErrors('Save As failed', async () => {
      const saved = await nativeBridge.saveDocumentAs(sessionRef.current.document);
      if (!saved) return;
      setSession(current => ({
        ...current,
        filePath: saved.path,
        savedSerialized: saved.serialized,
      }));
      setStatus(`Saved ${getDisplayName(saved.path)}`);
    });
  }, [runWithErrors]);

  const handleCopyJson = useCallback(() => {
    void runWithErrors('Copy JSON failed', async () => {
      await navigator.clipboard.writeText(serializeDocument(sessionRef.current.document));
      setStatus('Copied JSON to clipboard');
    });
  }, [runWithErrors]);

  const handleReveal = useCallback(() => {
    const path = sessionRef.current.filePath;
    if (!path) return;
    void runWithErrors('Reveal failed', async () => {
      await nativeBridge.revealFile(path);
    });
  }, [runWithErrors]);

  const handleDocumentChange = useCallback((document: ElucimDocument) => {
    setSession(current => ({ ...current, document }));
  }, []);

  const handleWarnings = useCallback((warnings: string[]) => {
    setSession(current => ({ ...current, warnings }));
  }, []);

  return (
    <div className="app-shell">
      <header className="app-titlebar">
        <div className="app-brand">
          <img src="/logo.svg" alt="" aria-hidden="true" className="app-logo" />
          <div>
            <div className="app-name">Elucim App</div>
            <div className="app-file">{displayName}{dirty ? ' - Unsaved' : ''}</div>
          </div>
        </div>
        <nav className="app-actions" aria-label="Document actions">
          <button type="button" onClick={handleNew}>New</button>
          <button type="button" onClick={handleOpen}>Open</button>
          <button type="button" onClick={handleSave}>Save</button>
          <button type="button" onClick={handleSaveAs}>Save As</button>
          <button type="button" onClick={handleCopyJson}>Copy JSON</button>
          <button type="button" onClick={handleReveal} disabled={!session.filePath}>Reveal</button>
        </nav>
        <div className="app-status" title={status}>
          {updateAvailable ? `Update ${updateAvailable} available` : status}
        </div>
      </header>
      {session.warnings.length > 0 && (
        <div className="app-warnings" role="status">
          {session.warnings.join(' ')}
        </div>
      )}
      <main className="app-editor">
        <ElucimEditor
          initialDocument={session.document}
          onDocumentChange={handleDocumentChange}
          onCompatibilityWarnings={handleWarnings}
          style={{ width: '100%', height: '100%' }}
        />
      </main>
    </div>
  );
}
