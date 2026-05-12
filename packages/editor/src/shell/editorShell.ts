import { useState, type PointerEvent } from 'react';
import type { ElucimTheme } from '@elucim/core';
import { buildThemeVars, deriveEditorTheme } from '../theme/tokens';
import { startRafDrag } from '../interactions/rafDrag';

export type EditorWorkspace = 'design' | 'animate' | 'states' | 'polish';

export const DEFAULT_LEFT_WIDTH = 252;
export const DEFAULT_RIGHT_WIDTH = 286;
export const DEFAULT_TIMELINE_HEIGHT = 340;
export const MIN_SIDE_WIDTH = 180;
export const MAX_SIDE_WIDTH = 560;
export const MIN_TIMELINE_HEIGHT = 220;
export const MAX_TIMELINE_HEIGHT = 640;

export interface EditorShellSnapshot {
  workspace: EditorWorkspace;
  leftVisible: boolean;
  rightVisible: boolean;
  timelineVisible: boolean;
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
}

export function clampPanelSize(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialShellSnapshot(hasActiveDocument: boolean): EditorShellSnapshot {
  return {
    workspace: hasActiveDocument ? 'animate' : 'design',
    leftVisible: true,
    rightVisible: !hasActiveDocument,
    timelineVisible: true,
    leftWidth: DEFAULT_LEFT_WIDTH,
    rightWidth: DEFAULT_RIGHT_WIDTH,
    timelineHeight: DEFAULT_TIMELINE_HEIGHT,
  };
}

export function applyWorkspaceSelection(
  shell: EditorShellSnapshot,
  workspace: EditorWorkspace,
): EditorShellSnapshot {
  if (workspace === 'design') {
    return { ...shell, workspace, leftVisible: true, rightVisible: true, timelineVisible: false };
  }
  if (workspace === 'animate') {
    return {
      ...shell,
      workspace,
      leftVisible: true,
      rightVisible: false,
      timelineVisible: true,
      timelineHeight: Math.max(shell.timelineHeight, 360),
    };
  }
  if (workspace === 'states') {
    return {
      ...shell,
      workspace,
      leftVisible: false,
      rightVisible: false,
      timelineVisible: true,
      timelineHeight: Math.max(shell.timelineHeight, 420),
    };
  }
  return {
    ...shell,
    workspace,
    leftVisible: true,
    rightVisible: false,
    timelineVisible: false,
    leftWidth: Math.max(shell.leftWidth, 360),
  };
}

export function resolveEditorThemeVars(
  theme: ElucimTheme | undefined,
  editorTheme: Record<string, string> | undefined,
  themeOverrides: Record<string, string>,
) {
  const colorSchemeHint = editorTheme?.['color-scheme'] ?? editorTheme?.['--elucim-editor-color-scheme'] ?? 'dark';
  const derived = theme
    ? deriveEditorTheme(theme, colorSchemeHint as 'light' | 'dark')
    : {};
  const merged = { ...derived, ...editorTheme };
  for (const [key, value] of Object.entries(themeOverrides)) {
    merged[key] = value;
  }
  return {
    themeVars: buildThemeVars(merged),
    colorScheme: merged['--elucim-editor-color-scheme'] || merged['color-scheme'] || colorSchemeHint,
  };
}

export function useEditorShellState({
  hasActiveDocument,
  isPlaying,
  stopPlayback,
}: {
  hasActiveDocument: boolean;
  isPlaying: boolean;
  stopPlayback: () => void;
}) {
  const [shell, setShell] = useState(() => createInitialShellSnapshot(hasActiveDocument));

  const selectWorkspace = (workspace: EditorWorkspace) => {
    if (workspace !== 'animate' && isPlaying) stopPlayback();
    setShell(current => applyWorkspaceSelection(current, workspace));
  };
  const startSideResize = (side: 'left' | 'right') => (event: PointerEvent<HTMLDivElement>) => {
    const startWidth = side === 'left' ? shell.leftWidth : shell.rightWidth;
    startRafDrag({
      event,
      onFrame: point => {
        const nextWidth = side === 'left' ? startWidth + point.deltaX : startWidth - point.deltaX;
        setShell(current => side === 'left'
          ? { ...current, leftWidth: clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH) }
          : { ...current, rightWidth: clampPanelSize(nextWidth, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH) });
      },
    });
  };
  const startTimelineResize = (event: PointerEvent<HTMLDivElement>) => {
    const startHeight = shell.timelineHeight;
    startRafDrag({
      event,
      onFrame: point => setShell(current => ({
        ...current,
        timelineHeight: clampPanelSize(startHeight - point.deltaY, MIN_TIMELINE_HEIGHT, MAX_TIMELINE_HEIGHT),
      })),
    });
  };
  const preferredLeftTab: 'objects' | 'polish' | undefined = shell.workspace === 'polish'
    ? 'polish'
    : shell.workspace === 'design' ? 'objects' : undefined;

  return {
    ...shell,
    setLeftVisible: (updater: boolean | ((value: boolean) => boolean)) => setShell(current => ({
      ...current,
      leftVisible: typeof updater === 'function' ? updater(current.leftVisible) : updater,
    })),
    setRightVisible: (updater: boolean | ((value: boolean) => boolean)) => setShell(current => ({
      ...current,
      rightVisible: typeof updater === 'function' ? updater(current.rightVisible) : updater,
    })),
    setTimelineVisible: (updater: boolean | ((value: boolean) => boolean)) => setShell(current => ({
      ...current,
      timelineVisible: typeof updater === 'function' ? updater(current.timelineVisible) : updater,
    })),
    preferredLeftTab,
    stateMachineWorkspaceActive: shell.workspace === 'states' && shell.timelineVisible,
    selectWorkspace,
    startSideResize,
    startTimelineResize,
  };
}
