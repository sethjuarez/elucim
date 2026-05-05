/**
 * Builder-specific theme with additional presentation fields.
 * Extends the core ElucimTheme with colors used by the fluent builder API.
 */
import { DARK_THEME, LIGHT_THEME, type ElucimTheme } from '@elucim/core';

export interface BuilderTheme extends ElucimTheme {
  /** Box fill colors for diagrams */
  boxFill: string;
  /** Box stroke color */
  boxStroke: string;
  /** Palette of 8 colors for sequential use */
  palette: string[];
  /** Presentation body font family */
  fontFamily?: string;
  /** Presentation display/title font family */
  titleFontFamily?: string;
  /** Card/panel fill color for deck helpers */
  cardFill?: string;
  /** Card/panel border color for deck helpers */
  cardStroke?: string;
  /** Subtle shadow color rendered by deck helpers */
  shadowColor?: string;
  /** Decorative background accent color */
  backgroundAccent?: string;
}

/**
 * @deprecated Use `BuilderTheme` instead. Kept for backward compatibility.
 */
export type Theme = BuilderTheme;

export const darkTheme: BuilderTheme = {
  ...DARK_THEME,
  boxFill:    'rgba(79,195,247,0.12)',
  boxStroke:  '#4fc3f7',
  palette:    ['#4fc3f7', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#6366f1', '#22d3ee'],
};

export const lightTheme: BuilderTheme = {
  ...LIGHT_THEME,
  boxFill:    'rgba(37,99,235,0.08)',
  boxStroke:  '#2563eb',
  palette:    ['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#d97706', '#ea580c', '#4f46e5', '#0891b2'],
};

/** Premium dark deck theme for polished, slide-like generated visuals. */
export const deckDarkTheme: BuilderTheme = {
  ...DARK_THEME,
  background: '#080b18',
  foreground: '#edf3ff',
  title: '#f8fbff',
  subtitle: '#a8b3cf',
  primary: '#7dd3fc',
  accent: '#7dd3fc',
  secondary: '#c084fc',
  tertiary: '#f0abfc',
  muted: '#74819d',
  surface: 'rgba(17, 24, 39, 0.86)',
  border: 'rgba(148, 163, 184, 0.22)',
  boxFill: 'rgba(125, 211, 252, 0.12)',
  boxStroke: 'rgba(125, 211, 252, 0.8)',
  cardFill: 'rgba(15, 23, 42, 0.82)',
  cardStroke: 'rgba(148, 163, 184, 0.22)',
  shadowColor: 'rgba(0, 0, 0, 0.22)',
  backgroundAccent: 'rgba(125, 211, 252, 0.16)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  titleFontFamily: 'Geist, Inter, ui-sans-serif, system-ui, sans-serif',
  palette: ['#7dd3fc', '#c084fc', '#f0abfc', '#34d399', '#fbbf24', '#fb923c', '#818cf8', '#2dd4bf'],
};

/** Premium light deck theme for polished, slide-like generated visuals. */
export const deckLightTheme: BuilderTheme = {
  ...LIGHT_THEME,
  background: '#fbfaf8',
  foreground: '#1f2937',
  title: '#111827',
  subtitle: '#667085',
  primary: '#635bff',
  accent: '#635bff',
  secondary: '#8b5cf6',
  tertiary: '#d946ef',
  muted: '#98a2b3',
  surface: '#ffffff',
  border: 'rgba(17, 24, 39, 0.12)',
  boxFill: 'rgba(99, 91, 255, 0.08)',
  boxStroke: 'rgba(99, 91, 255, 0.7)',
  cardFill: 'rgba(255, 255, 255, 0.92)',
  cardStroke: 'rgba(17, 24, 39, 0.12)',
  shadowColor: 'rgba(17, 24, 39, 0.08)',
  backgroundAccent: 'rgba(99, 91, 255, 0.11)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  titleFontFamily: 'Geist, Inter, ui-sans-serif, system-ui, sans-serif',
  palette: ['#635bff', '#8b5cf6', '#d946ef', '#16a34a', '#d97706', '#ea580c', '#4f46e5', '#0891b2'],
};
