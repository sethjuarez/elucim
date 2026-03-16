import { describe, it, expect } from 'vitest';
import { exportToJson, importFromJson } from '../utils/io';
import type { ElucimDocument } from '@elucim/dsl';

const validDoc: ElucimDocument = {
  version: '1.0',
  root: {
    type: 'player',
    width: 800,
    height: 600,
    durationInFrames: 120,
    children: [
      { type: 'circle', id: 'c1', cx: 100, cy: 100, r: 50, fill: '#ff0000' },
      { type: 'rect', id: 'r1', x: 200, y: 200, width: 100, height: 80 },
    ],
  },
};

// ─── Export ─────────────────────────────────────────────────────────────────

describe('exportToJson', () => {
  it('exports document as pretty JSON', () => {
    const json = exportToJson(validDoc);
    expect(json).toContain('"version": "1.0"');
    expect(json).toContain('"circle"');
    const parsed = JSON.parse(json);
    expect(parsed.root.children).toHaveLength(2);
  });

  it('exports compact JSON', () => {
    const json = exportToJson(validDoc, { pretty: false });
    expect(json).not.toContain('\n');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
  });
});

// ─── Import ─────────────────────────────────────────────────────────────────

describe('importFromJson', () => {
  it('imports valid document', () => {
    const json = JSON.stringify(validDoc);
    const result = importFromJson(json);
    expect(result.errors).toHaveLength(0);
    expect(result.document).not.toBeNull();
    expect(result.document!.root.type).toBe('player');
  });

  it('returns error for invalid JSON', () => {
    const result = importFromJson('not json');
    expect(result.document).toBeNull();
    expect(result.errors[0]).toContain('Invalid JSON');
  });

  it('returns error for missing version', () => {
    const result = importFromJson('{"root": {"type": "player"}}');
    expect(result.errors[0]).toContain('Unknown version');
  });

  it('returns error for missing root', () => {
    const result = importFromJson('{"version": "1.0"}');
    expect(result.errors[0]).toContain('Missing "root"');
  });

  it('returns error for non-object', () => {
    const result = importFromJson('"hello"');
    expect(result.errors[0]).toContain('must be an object');
  });

  it('round-trips correctly', () => {
    const json = exportToJson(validDoc);
    const result = importFromJson(json);
    expect(result.errors).toHaveLength(0);
    expect(result.document!.root.type).toBe('player');
    expect((result.document!.root as any).children).toHaveLength(2);
  });
});
