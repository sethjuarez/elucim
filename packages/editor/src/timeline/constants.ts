export const TRACK_HEIGHT = 30;
export const RULER_HEIGHT = 24;
export const CLIP_HEADER_HEIGHT = 46;
export const LABEL_WIDTH = 156;
export const MOTION_RAIL_WIDTH = 34;
export const MOTION_LIST_WIDTH = 140;
export const MOTION_DETAILS_WIDTH = 300;
export const PLAYBACK_BUTTON_SIZE = 24;
export const PLAYBACK_PRIMARY_BUTTON_SIZE = 30;

export const EASING_OPTIONS = [
  'linear',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInSine',
  'easeOutSine',
  'easeInOutSine',
  'easeOutElastic',
  'easeOutBounce',
  'easeInBack',
  'easeOutBack',
];

export const ANIMATABLE_PROPERTIES = ['opacity', 'translate', 'scale', 'rotate', 'fill', 'stroke', 'content'] as const;
export const WRAPPER_TYPES = new Set(['fadeIn', 'fadeOut', 'draw', 'write', 'transform', 'morph', 'stagger', 'parallel']);

export const ENTRY_NODE_ID = '__entry__';
export const EXIT_NODE_ID = '__exit__';

export const RESERVED_STATE_EVENT_NAMES = new Set(['complete', 'entry', 'exit', 'next']);
export const EVENT_PRESETS = ['onClick', 'reset', 'onKey'] as const;
export const ENTRY_EVENT_PRESETS = ['onStart', 'onClick', 'onKey'] as const;
export const EVENT_PRESET_SET = new Set<string>([...EVENT_PRESETS, ...ENTRY_EVENT_PRESETS]);
