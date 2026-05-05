import { describe, expect, it } from 'vitest';
import { deckDarkTheme, presentation } from '../builders';

describe('builder deck polish helpers', () => {
  it('exports premium deck themes', () => {
    expect(deckDarkTheme.cardFill).toBeDefined();
    expect(deckDarkTheme.backgroundAccent).toBeDefined();
    expect(deckDarkTheme.palette.length).toBeGreaterThanOrEqual(8);
  });

  it('builds hero and callout helpers into regular DSL nodes', () => {
    const doc = presentation('Deck', deckDarkTheme, { width: 960, height: 540 })
      .slide('Intro', s => {
        s.hero('CutReady', 'Animated technical storytelling');
        s.callout('Every visual should feel like a complete slide.');
      })
      .build();

    const slide = doc.root.slides[0];
    const player = slide.children[0] as any;
    expect(player.children).toHaveLength(2);
    expect(player.children[0].type).toBe('sequence');
    expect(player.children[0].children[0].type).toBe('fadeIn');
  });

  it('builds process, compare, metric, and card helpers', () => {
    const doc = presentation('Deck', deckDarkTheme)
      .slide('Polish', s => {
        s.process(['Draft', 'Refine', 'Present']);
        s.compare({ title: 'Before', body: 'Raw diagram' }, { title: 'After', body: 'Deck visual' });
        s.metric('3x', 'Faster understanding');
        s.card('Reusable polished panel', { title: 'Card' });
      })
      .build();

    const player = doc.root.slides[0].children[0] as any;
    expect(player.children).toHaveLength(4);
    expect(player.children.map((node: any) => node.type)).toEqual(['sequence', 'sequence', 'sequence', 'sequence']);
  });
});
