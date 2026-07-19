import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Scene } from '../components/Scene';
import { Text } from '../primitives/Text';
import { measureTextWidth } from '../text/measureText';
import { Reveal } from '../animations/Reveal';

describe('Text', () => {
  function renderText(text: React.ReactElement) {
    return renderToStaticMarkup(
      <Scene durationInFrames={1} frame={0}>
        {text}
      </Scene>
    );
  }

  it('preserves single-line text rendering by default', () => {
    const html = renderText(<Text x={10} y={20}>Hello</Text>);

    expect(html).toContain('>Hello</text>');
    expect(html).not.toContain('<tspan');
  });

  it('preserves newline content by default for compatibility', () => {
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

  it('reveals text deterministically and hides its cursor when complete', () => {
    const initial = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={0}>
        <Reveal strategy="type" durationInFrames={4}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );
    const midway = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={2}>
        <Reveal strategy="type" durationInFrames={4}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );
    const complete = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={4}>
        <Reveal strategy="type" durationInFrames={4}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );

    expect(initial).toContain('data-testid="elucim-text-cursor"');
    expect(midway).toContain('>He</text>');
    expect(midway).toContain('data-testid="elucim-text-cursor">|</text>');
    expect(complete).toContain('>Hello</text>');
    expect(complete).not.toContain('elucim-text-cursor');
  });

  it('supports a delayed reveal and persistent custom cursor', () => {
    const html = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={3}>
        <Reveal strategy="type" from={2} durationInFrames={3} cursor={{ character: '_', hideWhenComplete: false }}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );

    expect(html).toContain('>H</text>');
    expect(html).toContain('data-testid="elucim-text-cursor">_</text>');
  });

  it('blinks a reveal cursor from the current frame', () => {
    const hidden = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={1}>
        <Reveal strategy="type" durationInFrames={4} cursor={{ blinkEveryFrames: 1 }}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );
    const visible = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={2}>
        <Reveal strategy="type" durationInFrames={4} cursor={{ blinkEveryFrames: 1 }}>
          <Text x={10} y={20}>Hello</Text>
        </Reveal>
      </Scene>,
    );

    expect(hidden).not.toContain('elucim-text-cursor');
    expect(visible).toContain('data-testid="elucim-text-cursor">|</text>');
  });

  it('positions a cursor after centered text and at the end anchor without shifting the text', () => {
    const centered = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={2}>
        <Reveal strategy="type" durationInFrames={4}>
          <Text x={100} y={20} textAnchor="middle">Hello</Text>
        </Reveal>
      </Scene>,
    );
    const endAligned = renderToStaticMarkup(
      <Scene durationInFrames={20} frame={2}>
        <Reveal strategy="type" durationInFrames={4}>
          <Text x={100} y={20} textAnchor="end">Hello</Text>
        </Reveal>
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
