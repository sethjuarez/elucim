import React, { forwardRef, useRef, useImperativeHandle, useSyncExternalStore } from 'react';
import { validate } from '../validator/validate';
import type { ElucimDocument } from '../schema/types';
import { renderRoot } from './renderElements';
import {
  type ElucimTheme,
  type ImageResolverFn,
  ImageResolverProvider,
  DARK_THEME_VARS, LIGHT_THEME_VARS,
  themeToVars,
} from '@elucim/core';

// Re-export ElucimTheme for consumers importing from @elucim/dsl
export type { ElucimTheme } from '@elucim/core';
export type { ImageResolverFn } from '@elucim/core';

// ─── DslRenderer ────────────────────────────────────────────────────────────

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
   * Theme for semantic token resolution.
   * Keys map to `--elucim-{key}` CSS custom properties and `$token` DSL syntax.
   * Values can be hex colors, named colors, or CSS `var()` references.
   */
  theme?: ElucimTheme;
  /**
   * Color scheme for semantic token resolution.
   * - `'dark'` — inject dark theme CSS variables
   * - `'light'` — inject light theme CSS variables
   * - `'auto'` — detect from `prefers-color-scheme` media query
   *
   * Explicit `theme` values take priority over colorScheme defaults.
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
  /**
   * When true, the rendered scene fills its parent container width and
   * scales proportionally.  Default: false.
   */
  fitToContainer?: boolean;
  /** Called whenever playback state changes (play/pause). */
  onPlayStateChange?: (playing: boolean) => void;
  /** Called when a React render error occurs inside the scene tree. */
  onRenderError?: (error: Error) => void;
  /** Custom fallback UI shown when a render error occurs. */
  fallback?: React.ReactNode;
  /** Callback fired when DSL validation fails */
  onError?: (errors: Array<{ path: string; message: string }>) => void;
  /**
   * Image resolver for consumer-managed assets.
   * When provided, `<Image>` elements with a `ref` field call this function
   * to obtain a renderable URL instead of using `src` directly.
   */
  imageResolver?: ImageResolverFn;
}

// ─── Color scheme detection ─────────────────────────────────────────────────

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
  return true;
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribeColorScheme, getColorSchemeSnapshot, getColorSchemeServerSnapshot);
}

// ─── Error boundary ─────────────────────────────────────────────────────────

interface DslErrorBoundaryProps {
  onRenderError?: (error: Error) => void;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface DslErrorBoundaryState {
  error: Error | null;
}

class DslErrorBoundary extends React.Component<DslErrorBoundaryProps, DslErrorBoundaryState> {
  state: DslErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DslErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onRenderError?.(error);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div
          style={{ color: 'var(--elucim-error, #f87171)', fontFamily: 'monospace', padding: 16, fontSize: 13 }}
          data-testid="dsl-render-error"
        >
          <strong>Render Error:</strong> {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── DslRenderer component ──────────────────────────────────────────────────

export const DslRenderer = forwardRef<DslRendererRef, DslRendererProps>(function DslRenderer(
  { dsl, className, style, theme, colorScheme, poster, controls, autoPlay, loop, fitToContainer, onPlayStateChange, onRenderError, fallback, onError, imageResolver },
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
        style={{ color: 'var(--elucim-error, #f87171)', fontFamily: 'monospace', padding: 16, fontSize: 13, ...style }}
        data-testid="dsl-error"
      >
        <strong>Elucim DSL Validation Errors ({filteredErrors.length}):</strong>
        {[...grouped.entries()].map(([parent, errs]) => (
          <details key={parent} open style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>{parent} ({errs.length})</summary>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              {errs.map((err, i) => (
                <li key={i}><code style={{ color: 'var(--elucim-warning, #ffa07a)' }}>{err.path}</code>: {err.message}</li>
              ))}
            </ul>
          </details>
        ))}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.7 }}>Raw JSON</summary>
          <pre style={{ fontSize: 11, maxHeight: 300, overflow: 'auto', marginTop: 4, padding: 8, background: 'var(--elucim-surface, rgba(0,0,0,0.3))', borderRadius: 4 }}>
            {JSON.stringify(dsl, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const themeVarsCss = themeToVars(theme) as React.CSSProperties;

  // Resolve colorScheme → CSS variables for semantic tokens
  let schemeVars: React.CSSProperties = {};
  if (colorScheme) {
    const isDark = colorScheme === 'auto' ? prefersDark : colorScheme === 'dark';
    schemeVars = (isDark ? DARK_THEME_VARS : LIGHT_THEME_VARS) as React.CSSProperties;
  }

  const posterOverrides = poster !== undefined ? resolvePoster(poster, dsl) : undefined;

  const resolvedColorScheme = colorScheme
    ? (colorScheme === 'auto'
      ? (prefersDark ? 'dark' : 'light')
      : colorScheme) as 'light' | 'dark'
    : undefined;

  const content = renderRoot(dsl.root, {
    frame: posterOverrides?.frame,
    playerRef,
    colorScheme: resolvedColorScheme,
    controls,
    autoPlay,
    loop,
    fitToContainer,
    onPlayStateChange,
  });

  const inner = (
    <div className={className} style={{ ...schemeVars, ...themeVarsCss, ...style }} data-testid="dsl-root">
      <DslErrorBoundary onRenderError={onRenderError} fallback={fallback}>
        {content}
      </DslErrorBoundary>
    </div>
  );

  return imageResolver
    ? <ImageResolverProvider resolver={imageResolver}>{inner}</ImageResolverProvider>
    : inner;
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
