import { describe, it, expect } from 'vitest';
import { deriveEditorTheme, buildThemeVars } from '../theme/tokens';
import type { ElucimTheme } from '@elucim/core';

describe('deriveEditorTheme', () => {
  const contentTheme: ElucimTheme = {
    foreground: '#e0e0e0',
    background: '#1a1a2e',
    primary: '#4fc3f7',
    accent: '#4fc3f7',
    muted: '#64748b',
    subtitle: '#94a3b8',
    surface: '#1e293b',
    border: '#334155',
    success: '#34d399',
    error: '#f87171',
  };

  it('maps content foreground to editor fg', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['fg']).toBe('#e0e0e0');
  });

  it('maps content primary/accent to editor accent', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['accent']).toBe('#4fc3f7');
  });

  it('maps content background to editor bg', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['bg']).toBe('#1a1a2e');
  });

  it('maps content muted to editor text-muted', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['text-muted']).toBe('#64748b');
  });

  it('maps content subtitle to editor text-secondary', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['text-secondary']).toBe('#94a3b8');
  });

  it('sets color-scheme in result', () => {
    expect(deriveEditorTheme(contentTheme, 'dark')['color-scheme']).toBe('dark');
    expect(deriveEditorTheme(contentTheme, 'light')['color-scheme']).toBe('light');
  });

  it('derives light panel/chrome for light scheme', () => {
    const result = deriveEditorTheme(contentTheme, 'light');
    expect(result['panel']).toContain('255');  // white-ish
    expect(result['chrome']).toContain('241'); // light gray-ish
  });

  it('derives dark panel/chrome for dark scheme', () => {
    const result = deriveEditorTheme(contentTheme, 'dark');
    expect(result['panel']).toContain('22');   // dark-ish
    expect(result['chrome']).toContain('15');   // darker
  });

  it('prefers accent over primary when both set', () => {
    const theme: ElucimTheme = { primary: '#ff0000', accent: '#00ff00' };
    const result = deriveEditorTheme(theme, 'dark');
    expect(result['accent']).toBe('#00ff00');
  });

  it('falls back to primary when accent not set', () => {
    const theme: ElucimTheme = { primary: '#ff0000' };
    const result = deriveEditorTheme(theme, 'dark');
    expect(result['accent']).toBe('#ff0000');
  });
});

describe('buildThemeVars with derived theme', () => {
  it('integrates derived theme into editor CSS vars', () => {
    const contentTheme: ElucimTheme = { primary: '#2563eb', foreground: '#1e293b' };
    const derived = deriveEditorTheme(contentTheme, 'light');
    const vars = buildThemeVars(derived);
    expect((vars as any)['--elucim-editor-accent']).toBe('#2563eb');
    expect((vars as any)['--elucim-editor-fg']).toBe('#1e293b');
  });

  it('explicit overrides win over derived values', () => {
    const contentTheme: ElucimTheme = { primary: '#2563eb' };
    const derived = deriveEditorTheme(contentTheme, 'light');
    const overrides = { ...derived, accent: '#ff0000' };
    const vars = buildThemeVars(overrides);
    expect((vars as any)['--elucim-editor-accent']).toBe('#ff0000');
  });
});
