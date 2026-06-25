/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DslRenderer } from '../renderer/DslRenderer';
import { validate } from '../validator/validate';

describe('textbox DSL nodes', () => {
  it('renders a textbox node with background and wrapped text', () => {
    const { container } = render(
      <DslRenderer
        dsl={{
          version: 'render-tree',
          root: {
            type: 'scene',
            width: 400,
            height: 300,
            durationInFrames: 1,
            children: [{
              type: 'textbox',
              x: 20,
              y: 30,
              width: 140,
              height: 80,
              content: 'alpha beta gamma',
              fontSize: 10,
              background: { fill: '$surface', stroke: '$border', radius: 6 },
            }],
          },
        }}
      />
    );

    expect(container.querySelector('[data-testid="elucim-textbox"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="elucim-textbox-background"]')?.getAttribute('rx')).toBe('6');
    expect(container.querySelectorAll('tspan').length).toBeGreaterThan(0);
  });

  it('validates textbox geometry and options', () => {
    const result = validate({
      version: 'render-tree',
      root: {
        type: 'scene',
        durationInFrames: 1,
        children: [{
          type: 'textbox',
          x: 20,
          y: 30,
          width: 0,
          height: 80,
          content: 'hello',
          padding: { x: -1 },
          autoFit: 'squeeze',
        }],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        'root.children[0].width',
        'root.children[0].padding.x',
        'root.children[0].autoFit',
      ])
    );
  });
});
