export type {
  ElucimDocument,
  ElucimElement,
  ElucimIntent,
  ElucimKeyframe,
  ElucimLayout,
  ElucimMetadata,
  ElucimScene,
  ElucimState,
  ElucimStateMachine,
  ElucimStateMachineInput,
  ElucimTimeline,
  ElucimTimelineTrack,
  ElucimTransition,
} from './document';

export { DslRenderer, type DslRendererProps, type DslRendererRef } from './renderer/DslRenderer';
export type { ElucimTheme, ImageResolverFn } from '@elucim/core';
export {
  DARK_THEME,
  LIGHT_THEME,
  DARK_THEME_VARS,
  LIGHT_THEME_VARS,
  ImageResolverProvider,
  getThemeDefaults,
  normalizeTheme,
  themeToVars,
  useImageResolver,
} from '@elucim/core';
