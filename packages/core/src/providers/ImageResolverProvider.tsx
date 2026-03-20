import React, { createContext, useContext } from 'react';

/**
 * A function that resolves an opaque image reference to a renderable URL.
 *
 * - Return a `string` for synchronous resolution (CDN rewrites, path prefixing).
 * - Return a `Promise<string>` for async resolution (auth tokens, signed URLs).
 *
 * @example
 * ```ts
 * // Sync: prefix a CDN base URL
 * const resolver: ImageResolverFn = (ref) => `https://cdn.example.com/${ref}`;
 *
 * // Async: fetch a signed URL from an API
 * const resolver: ImageResolverFn = async (ref) => {
 *   const res = await fetch(`/api/assets/${ref}/url`);
 *   return res.text();
 * };
 * ```
 */
export type ImageResolverFn = (ref: string) => string | Promise<string>;

// ─── Context ───────────────────────────────────────────────────────────────

const ImageResolverContext = createContext<ImageResolverFn | undefined>(undefined);

/**
 * Provides an image resolver to all Elucim components below.
 *
 * When present, `<Image>` elements with a `ref` prop will call this resolver
 * to obtain a renderable URL instead of using `src` directly.
 *
 * Works with `DslRenderer`, `ElucimEditor`, or any custom composition.
 *
 * @example
 * ```tsx
 * <ImageResolverProvider resolver={(ref) => `https://cdn.acme.com/${ref}`}>
 *   <DslRenderer dsl={doc} />
 * </ImageResolverProvider>
 * ```
 */
export function ImageResolverProvider({
  resolver,
  children,
}: React.PropsWithChildren<{
  resolver: ImageResolverFn;
}>) {
  return (
    <ImageResolverContext.Provider value={resolver}>
      {children}
    </ImageResolverContext.Provider>
  );
}

/**
 * Returns the image resolver if an `ImageResolverProvider` is present,
 * or `undefined` otherwise.
 */
export function useImageResolver(): ImageResolverFn | undefined {
  return useContext(ImageResolverContext);
}
