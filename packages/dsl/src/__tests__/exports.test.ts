import { describe, expect, it } from 'vitest';
import {
  deckDarkTheme as rootDeckDarkTheme,
  deckLightTheme as rootDeckLightTheme,
  presentation as rootPresentation,
} from '../index';
import {
  deckDarkTheme as buildersDeckDarkTheme,
  deckLightTheme as buildersDeckLightTheme,
  presentation as buildersPresentation,
} from '../builders';

describe('public builder exports', () => {
  it('exposes deck themes from root and builders entrypoints', () => {
    expect(rootDeckDarkTheme).toBe(buildersDeckDarkTheme);
    expect(rootDeckLightTheme).toBe(buildersDeckLightTheme);
  });

  it('exposes presentation builder from root and builders entrypoints', () => {
    expect(rootPresentation).toBe(buildersPresentation);
  });
});
