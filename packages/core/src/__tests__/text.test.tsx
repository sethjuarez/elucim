import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Scene } from '../components/Scene';
import { Text } from '../primitives/Text';

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
});
