/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DslRenderer } from '../renderer/DslRenderer';
import { validate } from '../validator/validate';

describe('wrapped text DSL nodes', () => {
  it('renders wrapped text nodes as tspans', () => {
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
              type: 'text',
              x: 10,
              y: 20,
              content: 'alpha beta gamma',
              fontSize: 10,
              maxWidth: 60,
            }],
          },
        }}
      />
    );

    const tspans = Array.from(container.querySelectorAll('tspan')).map((node) => node.textContent);
    expect(tspans).toEqual(['alpha beta', 'gamma']);
  });

  it('validates text wrapping options', () => {
    const result = validate({
      version: 'render-tree',
      root: {
        type: 'scene',
        durationInFrames: 1,
        children: [{
          type: 'text',
          x: 10,
          y: 20,
          content: 'Hello',
          maxWidth: -1,
          wrap: 'words',
        }],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain('root.children[0].maxWidth');
    expect(result.errors.map((error) => error.path)).toContain('root.children[0].wrap');
  });
});
