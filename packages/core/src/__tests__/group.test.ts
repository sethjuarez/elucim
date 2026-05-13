import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Group } from '../primitives/Group';
import { ElucimContext } from '../context';

function renderGroup(props: React.ComponentProps<typeof Group>): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    React.createElement(
      ElucimContext.Provider,
      { value: { frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 } },
      React.createElement('svg', null, React.createElement(Group, props)),
    ),
  );
  return container;
}

describe('Group', () => {
  it('is exported as a function', () => {
    expect(typeof Group).toBe('function');
  });

  it('has the expected function name', () => {
    expect(Group.name).toBe('Group');
  });

  it('applies base opacity to grouped children', () => {
    const container = renderGroup({
      opacity: 0.25,
      children: React.createElement('circle', { cx: 10, cy: 10, r: 5 }),
    });

    expect(container.querySelector('[data-testid="elucim-group"]')?.getAttribute('opacity')).toBe('0.25');
  });
});
