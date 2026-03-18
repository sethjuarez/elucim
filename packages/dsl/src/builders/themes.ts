/**
 * Builder-specific theme with additional presentation fields.
 * Extends the core ElucimTheme with colors used by the fluent builder API.
 */
import type { ElucimTheme } from '@elucim/core';

export interface BuilderTheme extends ElucimTheme {
  /** Box fill colors for diagrams */
  boxFill: string;
  /** Box stroke color */
  boxStroke: string;
  /** Palette of 8 colors for sequential use */
  palette: string[];
}

/**
 * @deprecated Use `BuilderTheme` instead. Kept for backward compatibility.
 */
export type Theme = BuilderTheme;

export const darkTheme: BuilderTheme = {
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
  boxFill:    'rgba(79,195,247,0.12)',
  boxStroke:  '#4fc3f7',
  palette:    ['#4fc3f7', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#6366f1', '#22d3ee'],
};

export const lightTheme: BuilderTheme = {
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
  boxFill:    'rgba(37,99,235,0.08)',
  boxStroke:  '#2563eb',
  palette:    ['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#d97706', '#ea580c', '#4f46e5', '#0891b2'],
};
