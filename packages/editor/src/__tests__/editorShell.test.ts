import { describe, expect, it } from 'vitest';
import {
  applyWorkspaceSelection,
  clampPanelSize,
  createInitialShellSnapshot,
  DEFAULT_LEFT_WIDTH,
  DEFAULT_RIGHT_WIDTH,
  DEFAULT_TIMELINE_HEIGHT,
  resolveEditorThemeVars,
} from '../shell/editorShell';

describe('editor shell state helpers', () => {
  it('initializes shell chrome differently for canonical documents and blank scenes', () => {
    expect(createInitialShellSnapshot(true)).toMatchObject({
      workspace: 'animate',
      leftVisible: true,
      rightVisible: false,
      timelineVisible: true,
      leftWidth: DEFAULT_LEFT_WIDTH,
      rightWidth: DEFAULT_RIGHT_WIDTH,
      timelineHeight: DEFAULT_TIMELINE_HEIGHT,
    });
    expect(createInitialShellSnapshot(false)).toMatchObject({
      workspace: 'design',
      rightVisible: true,
    });
  });

  it('applies workspace transitions without losing unrelated panel dimensions', () => {
    const shell = {
      ...createInitialShellSnapshot(true),
      leftWidth: 320,
      rightWidth: 300,
      timelineHeight: 300,
    };

    expect(applyWorkspaceSelection(shell, 'design')).toMatchObject({
      workspace: 'design',
      leftVisible: true,
      rightVisible: true,
      timelineVisible: false,
      leftWidth: 320,
    });
    expect(applyWorkspaceSelection(shell, 'animate')).toMatchObject({
      workspace: 'animate',
      leftVisible: true,
      rightVisible: false,
      timelineVisible: true,
      timelineHeight: 360,
    });
    expect(applyWorkspaceSelection(shell, 'states')).toMatchObject({
      workspace: 'states',
      leftVisible: false,
      rightVisible: false,
      timelineVisible: true,
      timelineHeight: 420,
    });
    expect(applyWorkspaceSelection(shell, 'polish')).toMatchObject({
      workspace: 'polish',
      leftVisible: true,
      rightVisible: false,
      timelineVisible: false,
      leftWidth: 360,
    });
  });

  it('clamps panel sizes to configured bounds', () => {
    expect(clampPanelSize(100, 180, 560)).toBe(180);
    expect(clampPanelSize(260, 180, 560)).toBe(260);
    expect(clampPanelSize(900, 180, 560)).toBe(560);
  });
});

describe('editor shell theme helpers', () => {
  it('layers runtime theme overrides on top of explicit editor tokens', () => {
    const { colorScheme, themeVars } = resolveEditorThemeVars(
      undefined,
      { 'color-scheme': 'light', accent: '#111111' },
      { accent: '#222222' },
    );

    expect(colorScheme).toBe('light');
    expect(themeVars['--elucim-editor-accent' as keyof typeof themeVars]).toBe('#222222');
    expect(themeVars['--elucim-editor-color-scheme' as keyof typeof themeVars]).toBe('light');
  });
});
