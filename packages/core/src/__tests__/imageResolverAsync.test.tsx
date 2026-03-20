/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ImageResolverProvider, type ImageResolverFn } from '../providers/ImageResolverProvider';
import { Image } from '../primitives/Image';
import { ElucimContext } from '../context';

function WithContext({ children }: { children: React.ReactNode }) {
  return (
    <ElucimContext.Provider value={{ frame: 0, fps: 30, durationInFrames: 60, width: 800, height: 600 }}>
      {children}
    </ElucimContext.Provider>
  );
}

describe('Image async resolver', () => {
  it('resolves imageRef via async resolver', async () => {
    let resolveUrl!: (url: string) => void;
    const resolver: ImageResolverFn = () =>
      new Promise<string>((resolve) => { resolveUrl = resolve; });

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof ReactDOM.createRoot>;

    // Initial render — async resolver hasn't resolved yet, falls back to src
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(
        <WithContext>
          <ImageResolverProvider resolver={resolver}>
            <Image
              imageRef="asset-456"
              src="https://example.com/fallback.png"
              x={0} y={0} width={100} height={100}
            />
          </ImageResolverProvider>
        </WithContext>,
      );
    });

    const imgBefore = container.querySelector('image')!;
    expect(imgBefore.getAttribute('href')).toBe('https://example.com/fallback.png');

    // Resolve the async promise
    await act(async () => {
      resolveUrl('https://cdn.example.com/resolved-asset-456.png');
    });

    const imgAfter = container.querySelector('image')!;
    expect(imgAfter.getAttribute('href')).toBe('https://cdn.example.com/resolved-asset-456.png');

    // Cleanup
    await act(async () => { root.unmount(); });
    container.remove();
  });

  it('cancels stale async resolution when imageRef changes', async () => {
    const calls: string[] = [];
    let resolvers: Array<(url: string) => void> = [];

    const resolver: ImageResolverFn = (ref) => {
      calls.push(ref);
      return new Promise<string>((resolve) => { resolvers.push(resolve); });
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof ReactDOM.createRoot>;

    // Render with first ref
    await act(async () => {
      root = ReactDOM.createRoot(container);
      root.render(
        <WithContext>
          <ImageResolverProvider resolver={resolver}>
            <Image imageRef="first" src="" x={0} y={0} width={100} height={100} />
          </ImageResolverProvider>
        </WithContext>,
      );
    });

    expect(calls).toContain('first');

    // Re-render with second ref before first resolves
    await act(async () => {
      root.render(
        <WithContext>
          <ImageResolverProvider resolver={resolver}>
            <Image imageRef="second" src="" x={0} y={0} width={100} height={100} />
          </ImageResolverProvider>
        </WithContext>,
      );
    });

    expect(calls).toContain('second');

    // Resolve the first effect's (stale) promise — should be ignored
    // Note: resolvers[0] is from useState initializer (never consumed),
    // resolvers[1] is from the first useEffect, resolvers[2] is from the re-render effect
    const staleIdx = resolvers.length - 2;
    const currentIdx = resolvers.length - 1;

    await act(async () => {
      resolvers[staleIdx]('https://cdn.example.com/first.png');
    });

    // Resolve the second (current) promise
    await act(async () => {
      resolvers[currentIdx]('https://cdn.example.com/second.png');
    });

    const img = container.querySelector('image')!;
    expect(img.getAttribute('href')).toBe('https://cdn.example.com/second.png');

    // Cleanup
    await act(async () => { root.unmount(); });
    container.remove();
  });
});
