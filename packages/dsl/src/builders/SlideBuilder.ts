import type { ElementNode, EasingSpec } from '../schema/types';
import type { Theme } from './themes';

/**
 * SlideBuilder — fluent API for composing slide content.
 *
 * Manages automatic frame-based timing: each call appends elements
 * at the current "cursor" position and advances it.
 */
export class SlideBuilder {
  private elements: ElementNode[] = [];
  private cursor = 0;
  private _fps: number;
  private _width: number;
  private _height: number;
  theme: Theme;

  constructor(theme: Theme, fps = 30, width = 900, height = 640) {
    this.theme = theme;
    this._fps = fps;
    this._width = width;
    this._height = height;
  }

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get fps(): number { return this._fps; }
  get cx(): number { return this._width / 2; }
  get cy(): number { return this._height / 2; }

  /** Current animation frame cursor */
  get frame(): number { return this.cursor; }

  /** Advance the cursor by N frames */
  wait(frames: number): this {
    this.cursor += frames;
    return this;
  }

  /** Set cursor to an absolute frame */
  at(frame: number): this {
    this.cursor = frame;
    return this;
  }

  // ─── High-level helpers ──────────────────────────────────────────────

  /** Large centered title text */
  title(content: string, opts?: { y?: number; fontSize?: number; color?: string }): this {
    return this.addAtCursor({
      type: 'fadeIn', duration: 15, children: [{
        type: 'text',
        x: this.cx, y: opts?.y ?? 55,
        content,
        fontSize: opts?.fontSize ?? 28,
        fill: opts?.color ?? this.theme.title,
        textAnchor: 'middle',
        fontWeight: 'bold',
      }],
    }, 15);
  }

  /** Smaller subtitle text */
  subtitle(content: string, opts?: { y?: number; fontSize?: number; color?: string }): this {
    return this.addAtCursor({
      type: 'fadeIn', duration: 12, children: [{
        type: 'text',
        x: this.cx, y: opts?.y ?? 95,
        content,
        fontSize: opts?.fontSize ?? 16,
        fill: opts?.color ?? this.theme.subtitle,
        textAnchor: 'middle',
      }],
    }, 10);
  }

  /** Add a LaTeX expression */
  latex(expression: string, opts?: {
    x?: number; y?: number; fontSize?: number; color?: string; fadeIn?: number; advance?: number;
  }): this {
    const duration = opts?.fadeIn ?? 15;
    return this.addAtCursor({
      type: 'fadeIn', duration, children: [{
        type: 'latex',
        expression,
        x: opts?.x ?? this.cx, y: opts?.y ?? 300,
        fontSize: opts?.fontSize ?? 28,
        color: opts?.color ?? this.theme.primary,
        align: 'center',
      }],
    }, opts?.advance ?? 10);
  }

  /** Add text at a position */
  text(content: string, opts: {
    x: number; y: number;
    fontSize?: number; color?: string; anchor?: 'start' | 'middle' | 'end';
    fontWeight?: string | number; fontFamily?: string;
    fadeIn?: number; advance?: number;
  }): this {
    const duration = opts.fadeIn ?? 15;
    const advance = opts.advance ?? 5;
    return this.addAtCursor({
      type: 'fadeIn', duration, children: [{
        type: 'text',
        x: opts.x, y: opts.y,
        content,
        fontSize: opts.fontSize ?? 14,
        fill: opts.color ?? this.theme.foreground,
        textAnchor: opts.anchor ?? 'middle',
        fontWeight: opts.fontWeight,
        fontFamily: opts.fontFamily,
      }],
    }, advance);
  }

  /** Add an arrow */
  arrow(x1: number, y1: number, x2: number, y2: number, opts?: {
    color?: string; strokeWidth?: number; headSize?: number;
    dashed?: boolean; fadeIn?: number; advance?: number;
  }): this {
    const duration = opts?.fadeIn ?? 12;
    const node: ElementNode = {
      type: 'arrow',
      x1, y1, x2, y2,
      stroke: opts?.color ?? this.theme.primary,
      strokeWidth: opts?.strokeWidth ?? 2,
      headSize: opts?.headSize ?? 8,
      strokeDasharray: opts?.dashed ? '6 3' : undefined,
      fadeIn: duration,
    };
    return this.addAtCursor(node, opts?.advance ?? 3);
  }

  /** Add a line */
  line(x1: number, y1: number, x2: number, y2: number, opts?: {
    color?: string; strokeWidth?: number; dashed?: boolean; fadeIn?: number; advance?: number;
  }): this {
    const duration = opts?.fadeIn ?? 12;
    return this.addAtCursor({
      type: 'line', x1, y1, x2, y2,
      stroke: opts?.color ?? this.theme.muted,
      strokeWidth: opts?.strokeWidth ?? 1,
      strokeDasharray: opts?.dashed ? '6 3' : undefined,
      fadeIn: duration,
    }, opts?.advance ?? 3);
  }

  /** Add a rectangle */
  rect(x: number, y: number, w: number, h: number, opts?: {
    fill?: string; stroke?: string; strokeWidth?: number;
    rx?: number; dashed?: boolean; fadeIn?: number; advance?: number;
  }): this {
    const duration = opts?.fadeIn ?? 12;
    return this.addAtCursor({
      type: 'rect', x, y, width: w, height: h,
      fill: opts?.fill ?? 'none',
      stroke: opts?.stroke ?? this.theme.boxStroke,
      strokeWidth: opts?.strokeWidth ?? 1.5,
      rx: opts?.rx ?? 6,
      strokeDasharray: opts?.dashed ? '6 3' : undefined,
      fadeIn: duration,
    }, opts?.advance ?? 5);
  }

  /** Add a circle */
  circle(cx: number, cy: number, r: number, opts?: {
    fill?: string; stroke?: string; strokeWidth?: number; fadeIn?: number; advance?: number;
  }): this {
    const duration = opts?.fadeIn ?? 12;
    return this.addAtCursor({
      type: 'circle', cx, cy, r,
      fill: opts?.fill ?? 'none',
      stroke: opts?.stroke ?? this.theme.primary,
      strokeWidth: opts?.strokeWidth ?? 2,
      fadeIn: duration,
    }, opts?.advance ?? 5);
  }

  /** Add a bar chart */
  barChart(bars: { label: string; value: number; color?: string }[], opts: {
    x: number; y: number; width: number; height: number;
    barColor?: string; labelColor?: string; maxValue?: number;
    valueFormat?: 'number' | 'percent'; gap?: number;
    fadeIn?: number; showValues?: boolean; labelFontSize?: number;
  }): this {
    const duration = opts.fadeIn ?? 20;
    return this.addAtCursor({
      type: 'barChart',
      bars,
      x: opts.x, y: opts.y, width: opts.width, height: opts.height,
      barColor: opts.barColor ?? this.theme.primary,
      labelColor: opts.labelColor ?? this.theme.foreground,
      labelFontSize: opts.labelFontSize,
      maxValue: opts.maxValue,
      valueFormat: opts.valueFormat,
      gap: opts.gap,
      showValues: opts.showValues,
      fadeIn: duration,
    } as ElementNode, 10);
  }

  /** Add a matrix visualization */
  matrix(values: (number | string)[][], opts?: {
    x?: number; y?: number; cellSize?: number;
    color?: string; bracketColor?: string; fontSize?: number;
    fadeIn?: number;
  }): this {
    const duration = opts?.fadeIn ?? 20;
    return this.addAtCursor({
      type: 'matrix', values,
      x: opts?.x ?? this.cx, y: opts?.y ?? 300,
      cellSize: opts?.cellSize ?? 50,
      color: opts?.color ?? this.theme.foreground,
      bracketColor: opts?.bracketColor ?? this.theme.primary,
      fontSize: opts?.fontSize,
      fadeIn: duration,
    }, 10);
  }

  /** Add a graph (nodes + edges) */
  graph(nodes: { id: string; x: number; y: number; label?: string; color?: string; radius?: number }[],
        edges: { from: string; to: string; directed?: boolean; label?: string; color?: string }[],
        opts?: {
          nodeColor?: string; edgeColor?: string; labelColor?: string;
          nodeRadius?: number; edgeWidth?: number; fadeIn?: number;
        }): this {
    const duration = opts?.fadeIn ?? 20;
    return this.addAtCursor({
      type: 'graph', nodes, edges,
      nodeColor: opts?.nodeColor ?? this.theme.secondary,
      edgeColor: opts?.edgeColor ?? this.theme.muted,
      labelColor: opts?.labelColor ?? '#fff',
      nodeRadius: opts?.nodeRadius,
      edgeWidth: opts?.edgeWidth,
      fadeIn: duration,
    }, 10);
  }

  // ─── Layout helpers ──────────────────────────────────────────────────

  /**
   * Render a horizontal row of labeled boxes.
   * Returns the box positions for follow-up arrows, etc.
   */
  boxRow(labels: string[], opts?: {
    y?: number; boxWidth?: number; boxHeight?: number;
    gap?: number; colors?: string[]; textColor?: string;
    fontSize?: number; fillOpacity?: number; strokeColors?: string[];
    fadeIn?: number; fontFamily?: string;
  }): { x: number; y: number; w: number; h: number; cx: number; cy: number }[] {
    const boxW = opts?.boxWidth ?? 80;
    const boxH = opts?.boxHeight ?? 40;
    const gap = opts?.gap ?? 12;
    const y = opts?.y ?? 250;
    const totalW = labels.length * boxW + (labels.length - 1) * gap;
    const startX = (this._width - totalW) / 2;
    const duration = opts?.fadeIn ?? 15;

    const positions = labels.map((_, i) => {
      const bx = startX + i * (boxW + gap);
      return { x: bx, y, w: boxW, h: boxH, cx: bx + boxW / 2, cy: y + boxH / 2 };
    });

    // Add staggered boxes
    const children: ElementNode[] = labels.map((label, i) => {
      const pos = positions[i];
      const fillColor = opts?.colors?.[i] ?? this.theme.boxFill;
      const strokeColor = opts?.strokeColors?.[i] ?? this.theme.boxStroke;
      return {
        type: 'group',
        children: [
          {
            type: 'rect',
            x: pos.x, y: pos.y, width: boxW, height: boxH,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: 1.5,
            rx: 6,
          },
          {
            type: 'text',
            x: pos.cx, y: pos.cy + 5,
            content: label,
            fontSize: opts?.fontSize ?? 13,
            fill: opts?.textColor ?? this.theme.foreground,
            textAnchor: 'middle' as const,
            fontFamily: opts?.fontFamily,
          },
        ],
      } satisfies ElementNode;
    });

    this.addAtCursor({
      type: 'stagger', staggerDelay: 3,
      children,
    }, 8 + labels.length * 2);

    return positions;
  }

  /**
   * Render a vertical stack of labeled boxes.
   */
  boxColumn(labels: string[], opts?: {
    x?: number; y?: number; boxWidth?: number; boxHeight?: number;
    gap?: number; colors?: string[]; textColor?: string;
    fontSize?: number; fadeIn?: number;
  }): { x: number; y: number; w: number; h: number; cx: number; cy: number }[] {
    const boxW = opts?.boxWidth ?? 160;
    const boxH = opts?.boxHeight ?? 36;
    const gap = opts?.gap ?? 8;
    const startY = opts?.y ?? 150;
    const centerX = opts?.x ?? this.cx;
    const duration = opts?.fadeIn ?? 15;

    const positions = labels.map((_, i) => {
      const by = startY + i * (boxH + gap);
      const bx = centerX - boxW / 2;
      return { x: bx, y: by, w: boxW, h: boxH, cx: centerX, cy: by + boxH / 2 };
    });

    const children: ElementNode[] = labels.map((label, i) => {
      const pos = positions[i];
      const fillColor = opts?.colors?.[i] ?? this.theme.boxFill;
      return {
        type: 'group',
        children: [
          {
            type: 'rect',
            x: pos.x, y: pos.y, width: boxW, height: boxH,
            fill: fillColor,
            stroke: opts?.colors?.[i] ? opts.colors[i] : this.theme.boxStroke,
            strokeWidth: 1.5, rx: 6,
          },
          {
            type: 'text',
            x: pos.cx, y: pos.cy + 5,
            content: label,
            fontSize: opts?.fontSize ?? 13,
            fill: opts?.textColor ?? this.theme.foreground,
            textAnchor: 'middle' as const,
          },
        ],
      } satisfies ElementNode;
    });

    this.addAtCursor({
      type: 'stagger', staggerDelay: 3,
      children,
    }, 8 + labels.length * 2);

    return positions;
  }

  /**
   * Draw arrows connecting sequential positions (e.g., output of boxRow/boxColumn).
   */
  connectDown(positions: { cx: number; y: number; h: number }[], opts?: {
    color?: string; headSize?: number;
  }): this {
    const children: ElementNode[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      children.push({
        type: 'arrow',
        x1: from.cx, y1: from.y + from.h + 2,
        x2: to.cx, y2: to.y - 2,
        stroke: opts?.color ?? this.theme.muted,
        strokeWidth: 1.5,
        headSize: opts?.headSize ?? 6,
      });
    }
    return this.addAtCursor({
      type: 'stagger', staggerDelay: 2,
      children,
    }, 5 + positions.length * 2);
  }

  /**
   * Draw arrows between two rows of boxes (fan-out pattern).
   */
  connectRows(
    fromPositions: { cx: number; y: number; h: number }[],
    toPositions: { cx: number; y: number }[],
    opts?: { color?: string; headSize?: number }
  ): this {
    const children: ElementNode[] = [];
    // Connect each from to the nearest to, or all-to-all if same length
    if (fromPositions.length === toPositions.length) {
      for (let i = 0; i < fromPositions.length; i++) {
        children.push({
          type: 'arrow',
          x1: fromPositions[i].cx, y1: fromPositions[i].y + fromPositions[i].h + 2,
          x2: toPositions[i].cx, y2: toPositions[i].y - 2,
          stroke: opts?.color ?? this.theme.muted,
          strokeWidth: 1.5,
          headSize: opts?.headSize ?? 6,
        });
      }
    }
    return this.addAtCursor({
      type: 'fadeIn', duration: 15, children,
    }, 15);
  }

  // ─── Raw element access ──────────────────────────────────────────────

  /** Add any raw ElementNode at the current cursor position */
  add(node: ElementNode, advanceFrames = 0): this {
    return this.addAtCursor(node, advanceFrames);
  }

  /** Add a raw element at a specific frame (doesn't move cursor) */
  addAt(frame: number, node: ElementNode): this {
    this.elements.push({
      type: 'sequence', from: frame,
      children: [node],
    });
    return this;
  }

  /** Add multiple raw elements simultaneously at current cursor */
  addAll(nodes: ElementNode[], advanceFrames = 0): this {
    return this.addAtCursor({
      type: 'group', children: nodes,
    }, advanceFrames);
  }

  // ─── Internal ────────────────────────────────────────────────────────

  private addAtCursor(node: ElementNode, advanceFrames: number): this {
    this.elements.push({
      type: 'sequence', from: this.cursor,
      children: [node],
    });
    this.cursor += advanceFrames;
    return this;
  }

  /** Build the slide's player node with all timed elements */
  _build(): { elements: ElementNode[]; durationInFrames: number } {
    // Duration = cursor + 60 frames of extra time for final animations to play
    const duration = Math.max(this.cursor + 60, 90);
    return { elements: this.elements, durationInFrames: duration };
  }
}

