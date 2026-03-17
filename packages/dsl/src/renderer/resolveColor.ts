/**
 * Semantic color token resolution for elucim DSL.
 *
 * DSL authors can use `$token` syntax in any color field (fill, stroke, color, etc.)
 * to reference semantic tokens that resolve against the active theme at render time.
 *
 * Token values map to CSS custom properties: `$foreground` → `var(--elucim-foreground)`.
 * This lets a single DSL document adapt to any theme (dark, light, or custom) without
 * modification.
 */

/** Standard semantic color tokens with their CSS variable and default fallback. */
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

/** List of token names for documentation / autocomplete. */
export const TOKEN_NAMES = Object.keys(SEMANTIC_TOKENS) as ReadonlyArray<string>;

/**
 * Resolve a color value. If it starts with `$`, treat it as a semantic token
 * and return a CSS `var()` reference. Otherwise return the value unchanged.
 *
 * @example
 * resolveColor('$foreground')  // → 'var(--elucim-foreground, #e0e0e0)'
 * resolveColor('$accent')      // → 'var(--elucim-accent, #4fc3f7)'
 * resolveColor('#ff0000')      // → '#ff0000'  (unchanged)
 * resolveColor(undefined)      // → undefined   (pass-through)
 */
export function resolveColor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!value.startsWith('$')) return value;

  const token = value.slice(1); // strip the $
  const known = SEMANTIC_TOKENS[token];
  if (known) {
    return `var(${known.cssVar}, ${known.fallback})`;
  }

  // Unknown token — still resolve to a CSS variable (allows custom tokens)
  return `var(--elucim-${token})`;
}
