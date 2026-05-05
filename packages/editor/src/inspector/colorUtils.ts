import { SEMANTIC_TOKENS } from '@elucim/core';

export function isLiteralHexColor(value: string | undefined): value is string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '');
}

export function colorPreview(value: string | undefined, fallback = '#ffffff'): string {
  if (!value) return fallback;
  if (value.startsWith('$')) {
    const token = value.slice(1);
    return SEMANTIC_TOKENS[token]?.fallback ?? fallback;
  }
  return isLiteralHexColor(value) ? value : fallback;
}
