import { describe, expect, it } from 'vitest';
import { createNewDocument } from './sampleDocument';
import { ensureElucimExtension, getDisplayName, parseDocument, serializeDocument } from './documentIo';

describe('document IO', () => {
  it('round-trips native Elucim Documents', () => {
    const document = createNewDocument();
    const serialized = serializeDocument(document);
    const parsed = parseDocument(serialized);

    expect(parsed.document.version).toBe('2.0');
    expect(parsed.document.scene.children).toContain('title');
    expect(parsed.warnings).toEqual([]);
  });

  it('adds the .elc extension for native documents', () => {
    expect(ensureElucimExtension('diagram')).toBe('diagram.elc');
    expect(ensureElucimExtension('diagram.elc')).toBe('diagram.elc');
    expect(ensureElucimExtension('diagram.json')).toBe('diagram.json');
  });

  it('extracts display names from Windows and POSIX paths', () => {
    expect(getDisplayName('C:\\work\\scene.elc')).toBe('scene.elc');
    expect(getDisplayName('/work/scene.json')).toBe('scene.json');
    expect(getDisplayName(null)).toBe('Untitled.elc');
  });
});
