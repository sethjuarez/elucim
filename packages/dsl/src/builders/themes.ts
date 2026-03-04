/**
 * Theme configuration for presentation builders.
 * Provides consistent colors across slides.
 */
export interface Theme {
  background: string;
  /** Title text color */
  title: string;
  /** Subtitle / secondary text */
  subtitle: string;
  /** Primary accent (arrows, highlights) */
  primary: string;
  /** Secondary accent */
  secondary: string;
  /** Tertiary accent */
  tertiary: string;
  /** Muted text / annotations */
  muted: string;
  /** Default text color */
  text: string;
  /** Box fill colors for diagrams */
  boxFill: string;
  /** Box stroke color */
  boxStroke: string;
  /** Success / positive color */
  success: string;
  /** Warning / highlight color */
  warning: string;
  /** Error / negative color */
  error: string;
  /** Palette of 8 colors for sequential use */
  palette: string[];
}

export const darkTheme: Theme = {
  background: '#0a0a1e',
  title: '#e0e7ff',
  subtitle: '#94a3b8',
  primary: '#4fc3f7',
  secondary: '#a78bfa',
  tertiary: '#f472b6',
  muted: '#64748b',
  text: '#c8d6e5',
  boxFill: 'rgba(79,195,247,0.12)',
  boxStroke: '#4fc3f7',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  palette: ['#4fc3f7', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#6366f1', '#22d3ee'],
};

export const lightTheme: Theme = {
  background: '#f8fafc',
  title: '#1e293b',
  subtitle: '#64748b',
  primary: '#2563eb',
  secondary: '#7c3aed',
  tertiary: '#db2777',
  muted: '#94a3b8',
  text: '#334155',
  boxFill: 'rgba(37,99,235,0.08)',
  boxStroke: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  palette: ['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#d97706', '#ea580c', '#4f46e5', '#0891b2'],
};
