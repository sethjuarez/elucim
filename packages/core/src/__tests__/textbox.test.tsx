import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Scene } from '../components/Scene';
import { TextBox } from '../primitives/TextBox';

function renderTextBox(textbox: React.ReactElement) {
  return renderToStaticMarkup(
    <Scene durationInFrames={1} frame={0}>
      {textbox}
    </Scene>
  );
}

describe('TextBox', () => {
  it('renders a bounded background and wrapped text', () => {
    const html = renderTextBox(
      <TextBox x={10} y={20} width={120} height={80} fontSize={10}>
        alpha beta gamma
      </TextBox>
    );

    expect(html).toContain('data-testid="elucim-textbox"');
    expect(html).toContain('width="120"');
    expect(html).toContain('<tspan');
  });

  it('shrinks text to fit the box height', () => {
    const html = renderTextBox(
      <TextBox x={10} y={20} width={90} height={44} fontSize={24} minFontSize={12} autoFit="shrink">
        alpha beta gamma delta
      </TextBox>
    );

    expect(html).toContain('font-size="12"');
  });

  it('truncates overflowing lines when requested', () => {
    const html = renderTextBox(
      <TextBox x={10} y={20} width={80} height={36} fontSize={10} autoFit="truncate">
        alpha beta gamma delta epsilon
      </TextBox>
    );

    expect(html).toContain('...');
  });

  it('truncates overlong visible lines in truncate mode', () => {
    const html = renderTextBox(
      <TextBox x={10} y={20} width={80} height={44} fontSize={10} autoFit="truncate">
        supercalifragilisticexpialidocious short words that overflow
      </TextBox>
    );

    expect(html).toContain('supercali...');
  });

  it('falls back to character wrapping when shrink cannot fit a long word', () => {
    const html = renderTextBox(
      <TextBox x={10} y={20} width={80} height={80} fontSize={12} minFontSize={12} autoFit="shrink">
        supercalifragilisticexpialidocious
      </TextBox>
    );

    expect(html).toContain('supercali');
    expect(html).not.toContain('supercalifragilisticexpialidocious');
  });
});
