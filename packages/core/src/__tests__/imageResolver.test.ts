import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageResolverProvider, useImageResolver, type ImageResolverFn } from '../providers/ImageResolverProvider';
import { Image } from '../primitives/Image';
import { ElucimContext } from '../context';

/** Minimal context wrapper so Image can call useCurrentFrame() */
function WithContext({ children }: { children: React.ReactNode }) {
  return React.createElement(
    ElucimContext.Provider,
    { value: { frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 } },
    children,
  );
}

// ─── Provider / hook isolation ──────────────────────────────────────────────

describe('ImageResolverProvider', () => {
  it('provides the resolver to children', () => {
    let captured: ReturnType<typeof useImageResolver> | undefined;

    function Probe() {
      captured = useImageResolver();
      return null;
    }

    const resolver: ImageResolverFn = (ref) => `https://cdn.example.com/${ref}`;

    renderToStaticMarkup(
      React.createElement(ImageResolverProvider, { resolver },
        React.createElement(Probe)),
    );

    expect(captured).toBe(resolver);
  });

  it('returns undefined when no provider is present', () => {
    let captured: ReturnType<typeof useImageResolver> | undefined = 'not-set' as any;

    function Probe() {
      captured = useImageResolver();
      return null;
    }

    renderToStaticMarkup(React.createElement(Probe));
    expect(captured).toBeUndefined();
  });
});

// ─── Image component resolution ─────────────────────────────────────────────

describe('Image with resolver', () => {
  it('renders src directly when no resolver is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithContext, null,
        React.createElement(Image, {
          src: 'https://example.com/photo.png',
          x: 0, y: 0, width: 100, height: 100,
        })),
    );
    expect(html).toContain('href="https://example.com/photo.png"');
  });

  it('renders src directly when imageRef is not set', () => {
    const resolver: ImageResolverFn = (ref) => `https://cdn.example.com/${ref}`;
    const html = renderToStaticMarkup(
      React.createElement(WithContext, null,
        React.createElement(ImageResolverProvider, { resolver },
          React.createElement(Image, {
            src: 'https://example.com/photo.png',
            x: 0, y: 0, width: 100, height: 100,
          }))),
    );
    expect(html).toContain('href="https://example.com/photo.png"');
  });

  it('resolves imageRef via sync resolver', () => {
    const resolver: ImageResolverFn = (ref) => `https://cdn.example.com/${ref}`;
    const html = renderToStaticMarkup(
      React.createElement(WithContext, null,
        React.createElement(ImageResolverProvider, { resolver },
          React.createElement(Image, {
            imageRef: 'asset-123',
            src: 'https://example.com/fallback.png',
            x: 0, y: 0, width: 100, height: 100,
          }))),
    );
    expect(html).toContain('href="https://cdn.example.com/asset-123"');
  });

  it('falls back to src when imageRef is set but no resolver provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithContext, null,
        React.createElement(Image, {
          imageRef: 'asset-123',
          src: 'https://example.com/fallback.png',
          x: 0, y: 0, width: 100, height: 100,
        })),
    );
    expect(html).toContain('href="https://example.com/fallback.png"');
  });

  it('renders empty href when imageRef is set, no resolver, no src', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithContext, null,
        React.createElement(Image, {
          imageRef: 'asset-123',
          x: 0, y: 0, width: 100, height: 100,
        })),
    );
    expect(html).toContain('href=""');
  });
});
