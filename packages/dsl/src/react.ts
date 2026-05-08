export type {
  ElucimV2Document as ElucimDocument,
  ElucimV2Scene,
  ElucimV2Element,
  ElucimV2Metadata,
  ElucimV2Intent,
  ElucimV2Layout,
  ElucimV2Timeline,
  ElucimV2TimelineTrack,
  ElucimV2Keyframe,
  ElucimV2StateMachine,
  ElucimV2StateMachineInput,
  ElucimV2State,
  ElucimV2Transition,
} from './v2/types';

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
