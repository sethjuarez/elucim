import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ElucimDocument } from '@elucim/dsl';
import { confirm, message, open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { ELUCIM_FILE_FILTERS, ensureElucimExtension, parseDocument, serializeDocument } from './documentIo';

export interface NativeOpenResult {
  path: string;
  document: ElucimDocument;
  warnings: string[];
  serialized: string;
}

export interface NativeBridge {
  openDocument: () => Promise<NativeOpenResult | null>;
  openDocumentAtPath: (path: string) => Promise<NativeOpenResult>;
  saveDocument: (path: string | null, document: ElucimDocument) => Promise<{ path: string; serialized: string } | null>;
  saveDocumentAs: (document: ElucimDocument) => Promise<{ path: string; serialized: string } | null>;
  confirmDiscardChanges: () => Promise<boolean>;
  showError: (title: string, body: string) => Promise<void>;
  revealFile: (path: string) => Promise<void>;
  getInitialOpenFiles: () => Promise<string[]>;
  listenForOpenFile: (handler: (path: string) => void) => Promise<UnlistenFn>;
  checkForUpdate: () => Promise<Update | null>;
}

export const nativeBridge: NativeBridge = {
  async openDocument() {
    const selected = await open({
      multiple: false,
      filters: ELUCIM_FILE_FILTERS,
    });
    if (typeof selected !== 'string') return null;
    return nativeBridge.openDocumentAtPath(selected);
  },

  async openDocumentAtPath(path) {
    const serialized = await readTextFile(path);
    const parsed = parseDocument(serialized);
    return {
      path,
      document: parsed.document,
      warnings: parsed.warnings,
      serialized: serializeDocument(parsed.document),
    };
  },

  async saveDocument(path, document) {
    if (!path) return nativeBridge.saveDocumentAs(document);
    const serialized = serializeDocument(document);
    await writeTextFile(path, serialized);
    return { path, serialized };
  },

  async saveDocumentAs(document) {
    const selected = await save({
      filters: ELUCIM_FILE_FILTERS,
      defaultPath: 'Untitled.elc',
    });
    if (!selected) return null;
    const path = ensureElucimExtension(selected);
    const serialized = serializeDocument(document);
    await writeTextFile(path, serialized);
    return { path, serialized };
  },

  async confirmDiscardChanges() {
    return confirm('Discard unsaved changes?', {
      title: 'Elucim App',
      kind: 'warning',
      okLabel: 'Discard',
      cancelLabel: 'Cancel',
    });
  },

  async showError(title, body) {
    await message(body, { title, kind: 'error' });
  },

  async revealFile(path) {
    await revealItemInDir(path);
  },

  async getInitialOpenFiles() {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string[]>('initial_open_files');
  },

  async listenForOpenFile(handler) {
    const { listen } = await import('@tauri-apps/api/event');
    return listen<string>('elucim://open-file', event => handler(event.payload));
  },

  async checkForUpdate() {
    try {
      const update = await check();
      return update?.available ? update : null;
    } catch {
      return null;
    }
  },
};
