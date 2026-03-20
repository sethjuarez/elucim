import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { editorReducer, findElementById } from '../state/reducer';
import { createInitialState } from '../state/types';
import { ImagePickerProvider, useImagePicker, type BrowseImageResult } from '../image/ImagePickerProvider';
import type { ImageNode } from '@elucim/dsl';

const image: ImageNode = {
  type: 'image',
  id: 'img1',
  src: 'https://example.com/old.png',
  x: 100,
  y: 100,
  width: 160,
  height: 120,
};

function stateWith(...elements: any[]) {
  return createInitialState({
    version: '1.0',
    root: { type: 'player', width: 800, height: 600, durationInFrames: 120, children: elements },
  });
}

// ─── Reducer-level: image src update ───────────────────────────────────────

describe('image source update via reducer', () => {
  it('updates src only', () => {
    let state = stateWith(image);
    state = editorReducer(state, {
      type: 'UPDATE_ELEMENT',
      id: 'img1',
      changes: { src: 'https://example.com/new.png' } as any,
    });
    const el = findElementById(state.document.root, 'img1')!.element as ImageNode;
    expect(el.src).toBe('https://example.com/new.png');
    expect(el.width).toBe(160); // unchanged
    expect(el.height).toBe(120); // unchanged
  });

  it('updates src with width and height (rich result)', () => {
    let state = stateWith(image);
    state = editorReducer(state, {
      type: 'UPDATE_ELEMENT',
      id: 'img1',
      changes: { src: 'https://example.com/big.png', width: 800, height: 600 } as any,
    });
    const el = findElementById(state.document.root, 'img1')!.element as ImageNode;
    expect(el.src).toBe('https://example.com/big.png');
    expect(el.width).toBe(800);
    expect(el.height).toBe(600);
  });
});

// ─── Provider / hook isolation ─────────────────────────────────────────────

describe('ImagePickerProvider', () => {
  it('provides the browse callback to children', () => {
    let captured: ReturnType<typeof useImagePicker> | undefined;

    function Probe() {
      captured = useImagePicker();
      return null;
    }

    const picker = async (): Promise<BrowseImageResult | null> => ({ src: 'test' });

    renderToStaticMarkup(
      React.createElement(ImagePickerProvider, { onBrowse: picker },
        React.createElement(Probe)),
    );

    expect(captured).toBe(picker);
  });

  it('returns undefined when no provider is present', () => {
    let captured: ReturnType<typeof useImagePicker> | undefined = 'not-set' as any;

    function Probe() {
      captured = useImagePicker();
      return null;
    }

    renderToStaticMarkup(React.createElement(Probe));
    expect(captured).toBeUndefined();
  });
});
