import React, { forwardRef, useRef, useImperativeHandle, useSyncExternalStore } from 'react';
import { validate } from '../validator/validate';
import type { ElucimDocument } from '../schema/types';
import { renderRoot } from './renderElements';
import { SEMANTIC_TOKENS } from './resolveColor';
import { darkTheme, lightTheme } from '../builders/themes';

// ─── DslRenderer ────────────────────────────────────────────────────────────

export interface ElucimTheme {
  foreground?: string;
  background?: string;
  accent?: string;
  [key: string]: string | undefined;
}

export interface DslRendererRef {
  /** Get the underlying SVG element */
  getSvgElement(): SVGSVGElement | null;
  /** Seek to a specific frame */
  seekToFrame(frame: number): void;
  /** Get total frames count */
  getTotalFrames(): number;
  /** Start playback */
  play(): void;
  /** Pause playback */
  pause(): void;
  /** Whether currently playing */
  isPlaying(): boolean;
}

export interface DslRendererProps {
  dsl: ElucimDocument;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Inject theme colors as CSS custom properties (e.g. --elucim-foreground).
   * Values can be hex colors, named colors, or CSS var() references
   * (e.g. `{ accent: "var(--my-app-accent)" }`).
   */
  theme?: ElucimTheme;
  /**
   * Color scheme for semantic token resolution.
   * - `'dark'` — inject dark theme CSS variables
   * - `'light'` — inject light theme CSS variables
   * - `'auto'` — detect from `prefers-color-scheme` media query
   *
   * DSL documents using `$token` syntax (e.g. `$background`, `$foreground`)
   * will automatically adapt. Explicit `theme` values take priority over
   * colorScheme defaults.
   */
  colorScheme?: 'light' | 'dark' | 'auto';
  /** Render a static frame instead of interactive player. 'first' | 'last' | frame number */
  poster?: 'first' | 'last' | number;
  /** Override the document's controls setting (Player root only). */
  controls?: boolean;
  /** Override the document's autoPlay setting (Player root only). */
  autoPlay?: boolean;
  /** Override the document's loop setting (Player root only). */
  loop?: boolean;
  /** Called whenever playback state changes (play/pause). */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback fired when DSL validation fails */
  onError?: (errors: Array<{ path: string; message: string }>) => void;
}

/** Convert theme object to CSS custom properties. */
function themeToVars(theme?: ElucimTheme): React.CSSProperties {
  if (!theme) return {};
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (value !== undefined) {
      vars[`--elucim-${key}`] = value;
    }
  }
  return vars as React.CSSProperties;
}

/** Map a builder Theme to semantic token CSS variables. */
function builderThemeToVars(t: typeof darkTheme): Record<string, string> {
  return {
    '--elucim-foreground': t.text,
    '--elucim-background': t.background,
    '--elucim-title': t.title,
    '--elucim-subtitle': t.subtitle,
    '--elucim-accent': t.primary,
    '--elucim-muted': t.muted,
    '--elucim-surface': t.background,
    '--elucim-primary': t.primary,
    '--elucim-secondary': t.secondary,
    '--elucim-tertiary': t.tertiary,
    '--elucim-success': t.success,
    '--elucim-warning': t.warning,
    '--elucim-error': t.error,
  };
}

const DARK_VARS = builderThemeToVars(darkTheme);
const LIGHT_VARS = builderThemeToVars(lightTheme);

/** Subscribe to prefers-color-scheme changes. */
function subscribeColorScheme(cb: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getColorSchemeSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getColorSchemeServerSnapshot(): boolean {
  return true; // default to dark on server
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribeColorScheme, getColorSchemeSnapshot, getColorSchemeServerSnapshot);
}

export const DslRenderer = forwardRef<DslRendererRef, DslRendererProps>(function DslRenderer(
  { dsl, className, style, theme, colorScheme, poster, controls, autoPlay, loop, onPlayStateChange, onError },
  ref
) {
  const playerRef = useRef<import('@elucim/core').PlayerRef>(null);
  const prefersDark = usePrefersDark();

  useImperativeHandle(ref, () => ({
    getSvgElement: () => playerRef.current?.getSvgElement() ?? null,
    seekToFrame: (f: number) => playerRef.current?.seekToFrame(f),
    getTotalFrames: () => playerRef.current?.getTotalFrames() ?? 0,
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    isPlaying: () => playerRef.current?.isPlaying() ?? false,
  }));

  const result = validate(dsl);
  if (!result.valid) {
    const filteredErrors = result.errors
      .filter(e => e.severity === 'error')
      .map(e => ({ path: e.path, message: e.message }));
    onError?.(filteredErrors);

    // Group errors by parent node path for readability
    const grouped = new Map<string, typeof filteredErrors>();
    for (const err of filteredErrors) {
      const parts = err.path.split('.');
      const parent = parts.length > 1 ? parts.slice(0, -1).join('.') : err.path;
      const group = grouped.get(parent) ?? [];
      group.push(err);
      grouped.set(parent, group);
    }

    return (
      <div
        className={className}
        style={{ color: '#ff6b6b', fontFamily: 'monospace', padding: 16, fontSize: 13, ...style }}
        data-testid="dsl-error"
      >
        <strong>Elucim DSL Validation Errors ({filteredErrors.length}):</strong>
        {[...grouped.entries()].map(([parent, errs]) => (
          <details key={parent} open style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{parent} ({errs.length})</summary>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              {errs.map((err, i) => (
                <li key={i}><code style={{ color: '#ffa07a' }}>{err.path}</code>: {err.message}</li>
              ))}
            </ul>
          </details>
        ))}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.7 }}>Raw JSON</summary>
          <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto', marginTop: 4, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
            {JSON.stringify(dsl, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const themeVars = themeToVars(theme);

  // Resolve colorScheme → CSS variables for semantic tokens
  let schemeVars: React.CSSProperties = {};
  if (colorScheme) {
    const isDark = colorScheme === 'auto' ? prefersDark : colorScheme === 'dark';
    schemeVars = (isDark ? DARK_VARS : LIGHT_VARS) as React.CSSProperties;
  }

  // Resolve poster to a frame override
  const posterOverrides = poster !== undefined ? resolvePoster(poster, dsl) : undefined;

  // Resolve the CSS colorScheme value to pass to Scene/Player
  const resolvedColorScheme = colorScheme
    ? (colorScheme === 'auto'
      ? (prefersDark ? 'dark' : 'light')
      : colorScheme) as 'light' | 'dark'
    : undefined;

  return (
    <div className={className} style={{ ...schemeVars, ...themeVars, ...style }} data-testid="dsl-root">
      {renderRoot(dsl.root, {
        frame: posterOverrides?.frame,
        playerRef,
        colorScheme: resolvedColorScheme,
        controls,
        autoPlay,
        loop,
        onPlayStateChange,
      })}
    </div>
  );
});

function resolvePoster(poster: 'first' | 'last' | number, dsl: ElucimDocument): { frame: number } {
  if (poster === 'first') return { frame: 0 };
  if (poster === 'last') {
    const root = dsl.root as unknown as Record<string, unknown>;
    const dur = (root.durationInFrames as number) ?? 1;
    return { frame: Math.max(0, dur - 1) };
  }
  return { frame: poster };
}
