import React, { createContext, useContext } from 'react';

/**
 * Result returned by the consumer's image picker callback.
 * At minimum, `src` must be provided.  Optional `width` / `height` allow
 * the picker to communicate the image's natural dimensions so the editor
 * can auto-size the element.
 */
export interface BrowseImageResult {
  /** Image URL or data URI. Used for preview and as fallback when ref is set. */
  src?: string;
  /** Opaque consumer reference stored in the document (e.g. asset ID). */
  ref?: string;
  /** Human-readable label shown in the inspector (e.g. asset name). */
  displayName?: string;
  /** Natural width in pixels — auto-sizes the element when provided. */
  width?: number;
  /** Natural height in pixels — auto-sizes the element when provided. */
  height?: number;
  /** Alt text for accessibility (stored on the node for future use). */
  alt?: string;
}

/**
 * A callback that opens an image picker and resolves with the chosen image,
 * or `null` if the user cancelled.
 */
export type BrowseImageFn = () => Promise<BrowseImageResult | null>;

// ─── Context ───────────────────────────────────────────────────────────────

const ImagePickerContext = createContext<BrowseImageFn | undefined>(undefined);

/**
 * Provides an image picker callback to all editor components below.
 *
 * When set, the Inspector will show a "…" browse button next to the image
 * `src` field, invoking this callback on click.
 *
 * @example
 * ```tsx
 * <ImagePickerProvider onBrowse={async () => {
 *   const file = await myAssetLibrary.pick();
 *   return file ? { src: file.url, width: file.w, height: file.h } : null;
 * }}>
 *   <ElucimEditor />
 * </ImagePickerProvider>
 * ```
 */
export function ImagePickerProvider({
  onBrowse,
  children,
}: {
  onBrowse: BrowseImageFn;
  children: React.ReactNode;
}) {
  return (
    <ImagePickerContext.Provider value={onBrowse}>
      {children}
    </ImagePickerContext.Provider>
  );
}

/**
 * Returns the image picker callback if an `ImagePickerProvider` is present,
 * or `undefined` otherwise.
 */
export function useImagePicker(): BrowseImageFn | undefined {
  return useContext(ImagePickerContext);
}
