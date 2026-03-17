import { describe, it, expect } from 'vitest';
import { resolveColor, SEMANTIC_TOKENS, TOKEN_NAMES } from '../renderer/resolveColor';

describe('resolveColor', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveColor(undefined)).toBeUndefined();
  });

  it('passes through plain hex colors unchanged', () => {
    expect(resolveColor('#ff0000')).toBe('#ff0000');
    expect(resolveColor('#0b1220')).toBe('#0b1220');
  });

  it('passes through rgb/rgba colors unchanged', () => {
    expect(resolveColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    expect(resolveColor('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });

  it('passes through named colors unchanged', () => {
    expect(resolveColor('red')).toBe('red');
    expect(resolveColor('transparent')).toBe('transparent');
    expect(resolveColor('none')).toBe('none');
  });

  it('resolves known $tokens to CSS var() with fallback', () => {
    expect(resolveColor('$foreground')).toBe('var(--elucim-foreground, #c8d6e5)');
    expect(resolveColor('$background')).toBe('var(--elucim-background, #0a0a1e)');
    expect(resolveColor('$title')).toBe('var(--elucim-title, #e0e7ff)');
    expect(resolveColor('$subtitle')).toBe('var(--elucim-subtitle, #94a3b8)');
    expect(resolveColor('$accent')).toBe('var(--elucim-accent, #4fc3f7)');
    expect(resolveColor('$muted')).toBe('var(--elucim-muted, #64748b)');
    expect(resolveColor('$surface')).toBe('var(--elucim-surface, #1e293b)');
    expect(resolveColor('$border')).toBe('var(--elucim-border, #334155)');
    expect(resolveColor('$primary')).toBe('var(--elucim-primary, #4fc3f7)');
    expect(resolveColor('$secondary')).toBe('var(--elucim-secondary, #a78bfa)');
    expect(resolveColor('$tertiary')).toBe('var(--elucim-tertiary, #f472b6)');
    expect(resolveColor('$success')).toBe('var(--elucim-success, #34d399)');
    expect(resolveColor('$warning')).toBe('var(--elucim-warning, #fbbf24)');
    expect(resolveColor('$error')).toBe('var(--elucim-error, #f87171)');
  });

  it('resolves unknown $tokens to CSS var() without fallback', () => {
    expect(resolveColor('$custom-brand')).toBe('var(--elucim-custom-brand)');
    expect(resolveColor('$myColor')).toBe('var(--elucim-myColor)');
  });

  it('does not resolve strings that merely contain $ in the middle', () => {
    expect(resolveColor('no$token')).toBe('no$token');
  });

  it('TOKEN_NAMES includes all standard tokens', () => {
    expect(TOKEN_NAMES).toContain('foreground');
    expect(TOKEN_NAMES).toContain('background');
    expect(TOKEN_NAMES).toContain('title');
    expect(TOKEN_NAMES).toContain('subtitle');
    expect(TOKEN_NAMES).toContain('accent');
    expect(TOKEN_NAMES).toContain('muted');
    expect(TOKEN_NAMES).toContain('surface');
    expect(TOKEN_NAMES).toContain('border');
    expect(TOKEN_NAMES).toContain('primary');
    expect(TOKEN_NAMES).toContain('secondary');
    expect(TOKEN_NAMES).toContain('tertiary');
    expect(TOKEN_NAMES).toContain('success');
    expect(TOKEN_NAMES).toContain('warning');
    expect(TOKEN_NAMES).toContain('error');
    expect(TOKEN_NAMES.length).toBe(14);
  });

  it('SEMANTIC_TOKENS has cssVar and fallback for each token', () => {
    for (const name of TOKEN_NAMES) {
      const t = SEMANTIC_TOKENS[name];
      expect(t).toBeDefined();
      expect(t.cssVar).toMatch(/^--elucim-/);
      expect(t.fallback).toMatch(/^#/);
    }
  });
});
