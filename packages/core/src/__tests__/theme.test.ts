import { describe, it, expect } from 'vitest';
import {
  SEMANTIC_TOKENS,
  TOKEN_NAMES,
  resolveColor,
  themeToVars,
  DARK_THEME,
  LIGHT_THEME,
  DARK_THEME_VARS,
  LIGHT_THEME_VARS,
} from '../theme';
import type { ElucimTheme } from '../theme';

describe('theme', () => {
  describe('ElucimTheme type', () => {
    it('DARK_THEME has all semantic token fields', () => {
      for (const name of TOKEN_NAMES) {
        expect(DARK_THEME).toHaveProperty(name);
        expect(typeof (DARK_THEME as any)[name]).toBe('string');
      }
    });

    it('LIGHT_THEME has all semantic token fields', () => {
      for (const name of TOKEN_NAMES) {
        expect(LIGHT_THEME).toHaveProperty(name);
        expect(typeof (LIGHT_THEME as any)[name]).toBe('string');
      }
    });

    it('dark and light themes have different backgrounds', () => {
      expect(DARK_THEME.background).not.toBe(LIGHT_THEME.background);
    });
  });

  describe('SEMANTIC_TOKENS', () => {
    it('has 14 standard tokens', () => {
      expect(Object.keys(SEMANTIC_TOKENS)).toHaveLength(14);
    });

    it('every token has cssVar and fallback', () => {
      for (const [name, token] of Object.entries(SEMANTIC_TOKENS)) {
        expect(token.cssVar).toMatch(/^--elucim-/);
        expect(token.fallback).toMatch(/^#|^rgba/);
      }
    });

    it('TOKEN_NAMES matches SEMANTIC_TOKENS keys', () => {
      expect([...TOKEN_NAMES]).toEqual(Object.keys(SEMANTIC_TOKENS));
    });
  });

  describe('resolveColor', () => {
    it('resolves known $token to CSS var()', () => {
      expect(resolveColor('$foreground')).toBe('var(--elucim-foreground, #c8d6e5)');
      expect(resolveColor('$primary')).toBe('var(--elucim-primary, #4fc3f7)');
    });

    it('resolves unknown $token to CSS var() without fallback', () => {
      expect(resolveColor('$custom')).toBe('var(--elucim-custom)');
    });

    it('passes through non-token values unchanged', () => {
      expect(resolveColor('#ff0000')).toBe('#ff0000');
      expect(resolveColor('red')).toBe('red');
    });

    it('returns undefined for undefined', () => {
      expect(resolveColor(undefined)).toBeUndefined();
    });
  });

  describe('themeToVars', () => {
    it('converts theme to --elucim-* CSS custom properties', () => {
      const theme: ElucimTheme = { foreground: '#fff', primary: '#00f' };
      const vars = themeToVars(theme);
      expect(vars['--elucim-foreground']).toBe('#fff');
      expect(vars['--elucim-primary']).toBe('#00f');
    });

    it('skips undefined values', () => {
      const theme: ElucimTheme = { foreground: '#fff', background: undefined };
      const vars = themeToVars(theme);
      expect(vars).toHaveProperty('--elucim-foreground');
      expect(vars).not.toHaveProperty('--elucim-background');
    });

    it('returns empty object for undefined input', () => {
      expect(themeToVars(undefined)).toEqual({});
    });

    it('supports CSS var() references as values', () => {
      const vars = themeToVars({ accent: 'var(--my-accent)' });
      expect(vars['--elucim-accent']).toBe('var(--my-accent)');
    });
  });

  describe('pre-computed theme vars', () => {
    it('DARK_THEME_VARS maps all dark theme fields', () => {
      expect(DARK_THEME_VARS['--elucim-foreground']).toBe(DARK_THEME.foreground);
      expect(DARK_THEME_VARS['--elucim-background']).toBe(DARK_THEME.background);
      expect(DARK_THEME_VARS['--elucim-primary']).toBe(DARK_THEME.primary);
    });

    it('LIGHT_THEME_VARS maps all light theme fields', () => {
      expect(LIGHT_THEME_VARS['--elucim-foreground']).toBe(LIGHT_THEME.foreground);
      expect(LIGHT_THEME_VARS['--elucim-background']).toBe(LIGHT_THEME.background);
      expect(LIGHT_THEME_VARS['--elucim-primary']).toBe(LIGHT_THEME.primary);
    });
  });
});
