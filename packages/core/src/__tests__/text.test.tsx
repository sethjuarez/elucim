import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Scene } from '../components/Scene';
import { Text } from '../primitives/Text';
import { measureTextWidth } from '../text/measureText';
import { RevealStateProvider, type RevealState } from '../motion/RevealState';

describe('Text', () => {
  function renderText(text: React.ReactElement) {
    return renderToStaticMarkup(
      <Scene durationInFrames={1} frame={0}>
        {text}
      </Scene>
    );
  }

  function renderRevealedText(state: RevealState, text = 'Hello') {
    return renderToStaticMarkup(
      <Scene durationInFrames={20} frame={0}>
        <RevealStateProvider state={state}>
          <Text x={10} y={20}>{text}</Text>
        </RevealStateProvider>
      </Scene>,
    );
  }

  it('preserves single-line text rendering by default', () => {
    const html = renderText(<Text x={10} y={20}>Hello</Text>);

    expect(html).toContain('>Hello</text>');
    expect(html).not.toContain('<tspan');
  });

  it('preserves newline content by default', () => {
    const html = renderText(<Text x={10} y={20}>{'Hello\nworld'}</Text>);

    expect(html).toContain('Hello\nworld</text>');
    expect(html).not.toContain('<tspan');
  });

  it('renders wrapped lines with tspans when maxWidth is provided', () => {
    const html = renderText(
      <Text x={10} y={20} fontSize={10} maxWidth={60}>
        alpha beta gamma
      </Text>
    );

    expect(html).toContain('<tspan x="10" dy="0">alpha beta</tspan>');
    expect(html).toContain('<tspan x="10" dy="12">gamma</tspan>');
  });

  it('uses ratio lineHeight values for wrapped lines', () => {
    const html = renderText(
      <Text x={10} y={20} fontSize={10} maxWidth={16} wrap="char" lineHeight={1.5}>
        abcd
      </Text>
    );

    expect(html).toContain('<tspan x="10" dy="15">cd</tspan>');
  });

  it('renders resolved canonical text reveal state and hides its cursor when complete', () => {
    const initial = renderRevealedText({ progress: 0, strategy: 'type' });
    const midway = renderRevealedText({ progress: 0.5, strategy: 'type', cursor: true });
    const complete = renderRevealedText({ progress: 1, strategy: 'type' });

    expect(initial).toContain('data-testid="elucim-text-cursor"');
    expect(midway).toContain('>He</text>');
    expect(midway).toContain('data-testid="elucim-text-cursor">|</text>');
    expect(complete).toContain('>Hello</text>');
    expect(complete).not.toContain('elucim-text-cursor');
  });

  it('supports a resolved persistent custom cursor', () => {
    const html = renderRevealedText({
      progress: 1 / 3,
      strategy: 'type',
      cursor: { character: '_', hideWhenComplete: false },
    });

    expect(html).toContain('>H</text>');
    expect(html).toContain('data-testid="elucim-text-cursor">_</text>');
  });

  it('renders a cursor only when the resolved canonical state requests one', () => {
    const hidden = renderRevealedText({ progress: 0.5, strategy: 'type', cursor: false });
    const visible = renderRevealedText({ progress: 0.5, strategy: 'type', cursor: true });

    expect(hidden).not.toContain('elucim-text-cursor');
    expect(visible).toContain('data-testid="elucim-text-cursor">|</text>');
  });

  it('positions a cursor after centered text and at the end anchor without shifting the text', () => {
    const centered = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={0}>
        <RevealStateProvider state={{ progress: 0.5, strategy: 'type', cursor: true }}>
          <Text x={100} y={20} textAnchor="middle">Hello</Text>
        </RevealStateProvider>
      </Scene>,
    );
    const endAligned = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={0}>
        <RevealStateProvider state={{ progress: 0.5, strategy: 'type', cursor: true }}>
          <Text x={100} y={20} textAnchor="end">Hello</Text>
        </RevealStateProvider>
      </Scene>,
    );

    const centeredCursorX = 100 + measureTextWidth('He', {
      fontSize: 24,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
    }) / 2;

    expect(centered).toContain('text-anchor="middle"');
    expect(centered).toMatch(
      new RegExp(`<text x="${centeredCursorX}"[^>]*data-testid="elucim-text-cursor"`),
    );
    expect(endAligned).toContain('text-anchor="end"');
    expect(endAligned).toMatch(/<text x="100"[^>]*data-testid="elucim-text-cursor"/);
  });
});
