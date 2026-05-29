export type TextWrapMode = 'none' | 'word' | 'char';

export interface MeasureTextOptions {
  fontSize?: number;
  /**
   * Used as a deterministic font-family bucket, not exact font metrics.
   * Monospace families are measured with uniform glyph widths.
   */
  fontFamily?: string;
  fontWeight?: string | number;
  /**
   * Values <= 4 are treated as a font-size ratio. Larger values are absolute px.
   */
  lineHeight?: number;
  maxWidth?: number;
  /**
   * Word wrapping collapses runs of whitespace to a single space, matching SVG's
   * default text rendering model.
   */
  wrap?: TextWrapMode;
}

export interface MeasuredTextLine {
  text: string;
  width: number;
}

export interface MeasuredTextLayout {
  width: number;
  height: number;
  lineHeight: number;
  wrap: TextWrapMode;
  lines: MeasuredTextLine[];
}

const DEFAULT_FONT_SIZE = 24;
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

function assertPositiveNumber(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function assertString(value: string, name: string) {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
}

function roundMeasurement(value: number) {
  return Math.round(value * 1000) / 1000;
}

function fontWeightScale(fontWeight: string | number | undefined) {
  if (typeof fontWeight === 'number') {
    return fontWeight >= 600 ? 1.06 : 1;
  }

  if (typeof fontWeight === 'string' && /bold|[6-9]00/.test(fontWeight)) {
    return 1.06;
  }

  return 1;
}

function isMonospaceFamily(fontFamily: string | undefined) {
  return fontFamily !== undefined && /mono|consolas|courier|menlo|monaco/i.test(fontFamily);
}

function glyphWidthFactor(char: string, fontFamily: string | undefined) {
  if (/[\u0300-\u036f\u200d]/u.test(char)) return 0;
  if (isMonospaceFamily(fontFamily)) {
    return /\s/.test(char) ? 0.6 : 0.62;
  }

  if (/\s/.test(char)) return 0.33;
  if (/[\.,:;!'`\|iIl1]/.test(char)) return 0.28;
  if (/[mwMW@#%&]/.test(char)) return 0.9;
  if (/[A-Z]/.test(char)) return 0.68;
  if (/[0-9]/.test(char)) return 0.56;
  if (char.codePointAt(0)! > 255) return 1;
  return 0.56;
}

export function measureTextWidth(content: string, options: MeasureTextOptions = {}) {
  assertString(content, 'content');
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  assertPositiveNumber(fontSize, 'fontSize');

  const weightScale = fontWeightScale(options.fontWeight);
  let width = 0;

  for (const char of Array.from(content)) {
    width += glyphWidthFactor(char, options.fontFamily) * fontSize * weightScale;
  }

  return roundMeasurement(width);
}

function resolveLineHeight(lineHeight: number | undefined, fontSize: number) {
  if (lineHeight === undefined) {
    return fontSize * DEFAULT_LINE_HEIGHT_RATIO;
  }

  assertPositiveNumber(lineHeight, 'lineHeight');
  return lineHeight <= 4 ? fontSize * lineHeight : lineHeight;
}

function normalizeLayoutOptions(options: MeasureTextOptions) {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  assertPositiveNumber(fontSize, 'fontSize');

  const lineHeight = resolveLineHeight(options.lineHeight, fontSize);

  if (options.maxWidth !== undefined) {
    assertPositiveNumber(options.maxWidth, 'maxWidth');
  }

  return {
    fontSize,
    lineHeight,
    maxWidth: options.maxWidth,
    wrap: options.wrap ?? (options.maxWidth === undefined ? 'none' : 'word'),
  };
}

type NormalizedLayoutOptions = ReturnType<typeof normalizeLayoutOptions>;

function measureLine(text: string, options: MeasureTextOptions): MeasuredTextLine {
  return {
    text,
    width: measureTextWidth(text, options),
  };
}

function wrapParagraphByWord(paragraph: string, maxWidth: number, options: MeasureTextOptions) {
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (!current || measureTextWidth(candidate, options) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  lines.push(current);
  return lines;
}

function wrapParagraphByChar(paragraph: string, maxWidth: number, options: MeasureTextOptions) {
  const lines: string[] = [];
  let current = '';

  for (const char of Array.from(paragraph)) {
    const candidate = `${current}${char}`;

    if (!current || measureTextWidth(candidate, options) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current.trimEnd());
    current = char.trimStart();
  }

  if (current.length > 0) {
    lines.push(current.trimEnd());
  }
  return lines;
}

function wrapParagraph(
  paragraph: string,
  options: MeasureTextOptions,
  normalized: NormalizedLayoutOptions
): string[] {
  if (paragraph.length === 0 || normalized.wrap === 'none' || normalized.maxWidth === undefined) {
    return [paragraph];
  }

  if (normalized.wrap === 'char') {
    return wrapParagraphByChar(paragraph, normalized.maxWidth, options);
  }

  return wrapParagraphByWord(paragraph, normalized.maxWidth, options);
}

export function measureTextLayout(content: string, options: MeasureTextOptions = {}): MeasuredTextLayout {
  assertString(content, 'content');
  const normalized = normalizeLayoutOptions(options);
  if (content.length === 0) {
    return {
      width: 0,
      height: 0,
      lineHeight: roundMeasurement(normalized.lineHeight),
      wrap: normalized.wrap,
      lines: [],
    };
  }

  const lines = content
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapParagraph(paragraph, options, normalized))
    .map((line) => measureLine(line, { ...options, fontSize: normalized.fontSize }));
  const width = lines.reduce((maxWidth, line) => Math.max(maxWidth, line.width), 0);

  return {
    width: roundMeasurement(width),
    height: roundMeasurement(lines.length * normalized.lineHeight),
    lineHeight: roundMeasurement(normalized.lineHeight),
    wrap: normalized.wrap,
    lines,
  };
}
