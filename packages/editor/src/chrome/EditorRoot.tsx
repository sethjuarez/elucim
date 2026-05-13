import type { CSSProperties, ReactNode } from 'react';
import { v } from '../theme/tokens';

export interface EditorRootProps {
  className?: string;
  style?: CSSProperties;
  themeVars: CSSProperties;
  colorScheme: string;
  children: ReactNode;
}

export const EDITOR_ROOT_SCOPED_STYLES = `
        .elucim-editor ::-webkit-scrollbar { width: 6px; height: 6px; }
        .elucim-editor ::-webkit-scrollbar-track { background: transparent; }
        .elucim-editor ::-webkit-scrollbar-thumb {
          background: ${v('--elucim-editor-border')};
          border-radius: 3px;
        }
        .elucim-editor ::-webkit-scrollbar-thumb:hover {
          background: ${v('--elucim-editor-text-muted')};
        }
        .elucim-editor input[type="number"] {
          -moz-appearance: textfield;
        }
        .elucim-editor input[type="number"]::-webkit-inner-spin-button,
        .elucim-editor input[type="number"]::-webkit-outer-spin-button {
          opacity: 0;
          width: 0;
          margin: 0;
        }
        .elucim-editor input[type="number"]:hover::-webkit-inner-spin-button {
          opacity: 1;
          width: 10px;
          height: 14px;
          cursor: pointer;
        }
        .elucim-editor input:focus, .elucim-editor textarea:focus {
          outline: 1px solid ${v('--elucim-editor-accent')};
          outline-offset: -1px;
        }
        .elucim-editor .react-flow:focus,
        .elucim-editor .react-flow__pane:focus,
        .elucim-editor .react-flow__renderer:focus,
        .elucim-editor .react-flow__viewport:focus,
        .elucim-editor .react-flow__node:focus,
        .elucim-editor .react-flow__edge:focus {
          outline: none;
        }
        .elucim-editor .react-flow__node.selected,
        .elucim-editor .react-flow__node:focus-visible,
        .elucim-editor .react-flow__edge.selected,
        .elucim-editor .react-flow__edge:focus-visible {
          box-shadow: none;
        }
      `;

export function buildEditorRootClassName(className?: string): string {
  return `elucim-editor ${className ?? ''}`;
}

export function buildEditorRootStyle(
  themeVars: CSSProperties,
  colorScheme: string,
  style?: CSSProperties,
): CSSProperties {
  return {
    ...themeVars,
    display: 'flex',
    flexDirection: 'column',
    background: v('--elucim-editor-bg'),
    color: v('--elucim-editor-fg'),
    fontFamily: 'system-ui, -apple-system, sans-serif',
    height: '100%',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    colorScheme,
    ...style,
  };
}

export function EditorRoot({ className, style, themeVars, colorScheme, children }: EditorRootProps) {
  return (
    <div
      className={buildEditorRootClassName(className)}
      style={buildEditorRootStyle(themeVars, colorScheme, style)}
    >
      <style>{EDITOR_ROOT_SCOPED_STYLES}</style>
      {children}
    </div>
  );
}
