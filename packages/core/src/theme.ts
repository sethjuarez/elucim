/**
 * Unified Elucim theme system.
 *
 * `ElucimTheme` is the single theme type used across the entire Elucim ecosystem:
 * DslRenderer, ElucimEditor, and $token resolution all share this contract.
 *
 * Token names map 1:1 to the `$token` DSL syntax and `--elucim-*` CSS custom
 * properties.  For example, `{ primary: '#2563eb' }` sets `--elucim-primary`
 * and is referenced in DSL documents as `$primary`.
 *
 * Values can be hex colors, named CSS colors, or CSS `var()` references
 * (e.g. `{ accent: "var(--my-app-accent)" }`).
 */

// ─── Theme type ─────────────────────────────────────────────────────────────

/**
 * Canonical theme interface for Elucim content rendering and editor chrome.
 * All fields are optional — unset fields fall back to the active colorScheme defaults.
 */
export interface ElucimTheme {
  /** Default text color. Maps to `$foreground` / `--elucim-foreground`. */
  foreground?: string;
  /** Scene background. Maps to `$background` / `--elucim-background`. */
  background?: string;
  /** Title text color. Maps to `$title` / `--elucim-title`. */
  title?: string;
  /** Subtitle / secondary text. Maps to `$subtitle` / `--elucim-subtitle`. */
  subtitle?: string;
  /** Primary accent color. Maps to `$primary` / `--elucim-primary`. */
  primary?: string;
  /** Secondary accent. Maps to `$secondary` / `--elucim-secondary`. */
  secondary?: string;
  /** Tertiary accent. Maps to `$tertiary` / `--elucim-tertiary`. */
  tertiary?: string;
  /** Muted text / annotations. Maps to `$muted` / `--elucim-muted`. */
  muted?: string;
  /** Elevated surface color. Maps to `$surface` / `--elucim-surface`. */
  surface?: string;
  /** Border color. Maps to `$border` / `--elucim-border`. */
  border?: string;
  /** Alias for primary — `$accent` / `--elucim-accent`. */
  accent?: string;
  /** Success / positive. Maps to `$success` / `--elucim-success`. */
  success?: string;
  /** Warning / highlight. Maps to `$warning` / `--elucim-warning`. */
  warning?: string;
  /** Error / negative. Maps to `$error` / `--elucim-error`. */
  error?: string;
}

// ─── Semantic token registry ────────────────────────────────────────────────

/** Standard semantic color tokens with their CSS variable and dark-mode fallback. */
export const SEMANTIC_TOKENS: Record<string, { cssVar: string; fallback: string }> = {
  foreground:  { cssVar: '--elucim-foreground',  fallback: '#c8d6e5' },
  background:  { cssVar: '--elucim-background',  fallback: '#0a0a1e' },
  title:       { cssVar: '--elucim-title',       fallback: '#e0e7ff' },
  subtitle:    { cssVar: '--elucim-subtitle',    fallback: '#94a3b8' },
  accent:      { cssVar: '--elucim-accent',      fallback: '#4fc3f7' },
  muted:       { cssVar: '--elucim-muted',       fallback: '#64748b' },
  surface:     { cssVar: '--elucim-surface',     fallback: '#1e293b' },
  border:      { cssVar: '--elucim-border',      fallback: '#334155' },
  primary:     { cssVar: '--elucim-primary',     fallback: '#4fc3f7' },
  secondary:   { cssVar: '--elucim-secondary',   fallback: '#a78bfa' },
  tertiary:    { cssVar: '--elucim-tertiary',    fallback: '#f472b6' },
  success:     { cssVar: '--elucim-success',     fallback: '#34d399' },
  warning:     { cssVar: '--elucim-warning',     fallback: '#fbbf24' },
  error:       { cssVar: '--elucim-error',       fallback: '#f87171' },
};

/** List of standard token names. */
export const TOKEN_NAMES = Object.keys(SEMANTIC_TOKENS) as ReadonlyArray<string>;

// ─── Color resolution ───────────────────────────────────────────────────────

/**
 * Resolve a color value.  If it starts with `$`, treat it as a semantic token
 * and return a CSS `var()` reference.  Otherwise return the value unchanged.
 *
 * @example
 * resolveColor('$foreground')  // → 'var(--elucim-foreground, #c8d6e5)'
 * resolveColor('#ff0000')      // → '#ff0000'
 * resolveColor(undefined)      // → undefined
 */
export function resolveColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!value.startsWith('$')) return value;

  const token = value.slice(1);
  const known = SEMANTIC_TOKENS[token];
  if (known) {
    return `var(${known.cssVar}, ${known.fallback})`;
  }
  // Unknown token — still resolve to a CSS variable (allows custom tokens)
  return `var(--elucim-${token})`;
}

// ─── Theme → CSS custom properties ─────────────────────────────────────────

/** Convert an ElucimTheme (or arbitrary token record) to CSS custom properties (`--elucim-*`). */
export function themeToVars(theme?: ElucimTheme | Record<string, string | undefined>): Record<string, string> {
  if (!theme) return {};
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (value !== undefined) {
      vars[`--elucim-${key}`] = value;
    }
  }
  return vars;
}

// ─── Built-in theme presets ─────────────────────────────────────────────────

/** Dark theme preset — the default Elucim content theme. */
export const DARK_THEME: Required<Pick<ElucimTheme,
  'foreground' | 'background' | 'title' | 'subtitle' | 'primary' | 'secondary' |
  'tertiary' | 'muted' | 'surface' | 'border' | 'accent' | 'success' | 'warning' | 'error'
>> = {
  foreground: '#c8d6e5',
  background: '#0a0a1e',
  title:      '#e0e7ff',
  subtitle:   '#94a3b8',
  primary:    '#4fc3f7',
  secondary:  '#a78bfa',
  tertiary:   '#f472b6',
  muted:      '#64748b',
  surface:    '#1e293b',
  border:     '#334155',
  accent:     '#4fc3f7',
  success:    '#34d399',
  warning:    '#fbbf24',
  error:      '#f87171',
};

/** Light theme preset. */
export const LIGHT_THEME: Required<Pick<ElucimTheme,
  'foreground' | 'background' | 'title' | 'subtitle' | 'primary' | 'secondary' |
  'tertiary' | 'muted' | 'surface' | 'border' | 'accent' | 'success' | 'warning' | 'error'
>> = {
  foreground: '#334155',
  background: '#f8fafc',
  title:      '#1e293b',
  subtitle:   '#64748b',
  primary:    '#2563eb',
  secondary:  '#7c3aed',
  tertiary:   '#db2777',
  muted:      '#94a3b8',
  surface:    '#ffffff',
  border:     '#e2e8f0',
  accent:     '#2563eb',
  success:    '#16a34a',
  warning:    '#d97706',
  error:      '#dc2626',
};

/** Pre-computed CSS variable maps for colorScheme resolution. */
export const DARK_THEME_VARS = themeToVars(DARK_THEME);
export const LIGHT_THEME_VARS = themeToVars(LIGHT_THEME);
