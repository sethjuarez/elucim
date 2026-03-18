/**
 * Editor semantic design tokens.
 *
 * Every color in the editor UI is driven by CSS custom properties so that
 * consumers can theme the entire editor chrome by overriding these variables
 * on a parent element or passing a `theme` prop to `<ElucimEditor>`.
 *
 * Token names deliberately mirror the DSL's `--elucim-*` namespace, extended
 * with `editor-` for chrome-specific values that don't apply to rendered content.
 */

/** Default values for every editor CSS custom property (dark mode). */
export const EDITOR_TOKENS: Record<string, string> = {
  // ── Core ──────────────────────────────────────────────────────────────
  '--elucim-editor-accent':          '#4a9eff',
  '--elucim-editor-bg':              '#1a1a2e',
  '--elucim-editor-surface':         '#12122a',
  '--elucim-editor-panel':           'rgba(22, 22, 42, 0.93)',
  '--elucim-editor-chrome':          'rgba(15, 23, 42, 0.8)',

  // ── Text ──────────────────────────────────────────────────────────────
  '--elucim-editor-fg':              '#e0e0e0',
  '--elucim-editor-text-secondary':  '#94a3b8',
  '--elucim-editor-text-muted':      '#64748b',
  '--elucim-editor-text-disabled':   '#475569',

  // ── Borders & inputs ─────────────────────────────────────────────────
  '--elucim-editor-border':          '#334155',
  '--elucim-editor-border-subtle':   '#1e293b',
  '--elucim-editor-input-bg':        '#0f172a',

  // ── Animation timeline bars (reuse DSL semantic tokens where possible) ─
  '--elucim-editor-success':         '#34d399',
  '--elucim-editor-info':            '#4fc3f7',
  '--elucim-editor-error':           '#f87171',
};

/** Light-mode defaults — used when `color-scheme: "light"` is passed. */
export const EDITOR_TOKENS_LIGHT: Record<string, string> = {
  '--elucim-editor-accent':          '#2563eb',
  '--elucim-editor-bg':              '#f1f5f9',
  '--elucim-editor-surface':         '#ffffff',
  '--elucim-editor-panel':           'rgba(255, 255, 255, 0.95)',
  '--elucim-editor-chrome':          'rgba(241, 245, 249, 0.9)',
  '--elucim-editor-fg':              '#1e293b',
  '--elucim-editor-text-secondary':  '#334155',
  '--elucim-editor-text-muted':      '#64748b',
  '--elucim-editor-text-disabled':   '#94a3b8',
  '--elucim-editor-border':          '#e2e8f0',
  '--elucim-editor-border-subtle':   '#f1f5f9',
  '--elucim-editor-input-bg':        '#ffffff',
  '--elucim-editor-success':         '#34d399',
  '--elucim-editor-info':            '#4fc3f7',
  '--elucim-editor-error':           '#f87171',
};

/** Helper: returns `var(--token, fallback)` string for use in inline styles. */
export function v(token: string): string {
  const fallback = EDITOR_TOKENS[token];
  return fallback ? `var(${token}, ${fallback})` : `var(${token})`;
}

/**
 * Build a CSS custom-property style object from a theme override map.
 * Merges user overrides on top of the default token set, then returns
 * a React-compatible `CSSProperties` record.
 *
 * When the overrides contain `color-scheme: "light"` (or the full
 * `--elucim-editor-color-scheme: "light"`), light-mode defaults are
 * used as the base so host apps only need to override a few tokens.
 */
export function buildThemeVars(
  overrides?: Record<string, string>,
): React.CSSProperties {
  const isLight = overrides && (
    overrides['color-scheme'] === 'light' ||
    overrides['--elucim-editor-color-scheme'] === 'light'
  );
  const defaults = isLight ? EDITOR_TOKENS_LIGHT : EDITOR_TOKENS;
  const vars: Record<string, string> = { ...defaults };
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      // Accept bare names (e.g. "accent") or full CSS var names
      const cssKey = key.startsWith('--') ? key : `--elucim-editor-${key}`;
      vars[cssKey] = val;
    }
  }
  return vars as unknown as React.CSSProperties;
}

/**
 * Generate a rotation cursor data-URL with a given stroke color.
 * CSS custom properties cannot be used inside `url("data:…")` strings,
 * so the resolved hex color must be passed in.
 */
export function makeRotateCursor(color = '#4a9eff'): string {
  const encoded = encodeURIComponent(color);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encoded}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12a9 9 0 1 1-3-6.7'/><polyline points='21 3 21 9 15 9'/></svg>`;
  return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
}

/** Pre-built default rotation cursor. */
export const ROTATE_CURSOR = makeRotateCursor();
