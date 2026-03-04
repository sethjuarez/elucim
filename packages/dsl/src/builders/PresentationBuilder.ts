import type { ElucimDocument, PresentationNode, SlideNode, TransitionType } from '../schema/types';
import { SlideBuilder } from './SlideBuilder';
import type { Theme } from './themes';
import { darkTheme } from './themes';

export interface PresentationOptions {
  width?: number;
  height?: number;
  fps?: number;
  transition?: TransitionType;
  transitionDuration?: number;
  showHud?: boolean;
  showNotes?: boolean;
}

interface SlideEntry {
  title: string;
  notes?: string;
  background?: string;
  build: (s: SlideBuilder) => void;
}

/**
 * PresentationBuilder — top-level fluent API for creating presentations.
 *
 * Usage:
 * ```ts
 * const doc = presentation('My Talk', darkTheme)
 *   .slide('Intro', s => { s.title('Hello'); })
 *   .slide('Details', s => { s.boxRow([...]); })
 *   .build();
 * ```
 */
export class PresentationBuilder {
  private _title: string;
  private _theme: Theme;
  private _opts: PresentationOptions;
  private _slides: SlideEntry[] = [];

  constructor(title: string, theme?: Theme, opts?: PresentationOptions) {
    this._title = title;
    this._theme = theme ?? darkTheme;
    this._opts = {
      width: 900,
      height: 640,
      fps: 30,
      transition: 'fade',
      transitionDuration: 10,
      showHud: true,
      showNotes: true,
      ...opts,
    };
  }

  /** Add a slide */
  slide(title: string, build: (s: SlideBuilder) => void, opts?: { notes?: string; background?: string }): this {
    this._slides.push({ title, build, notes: opts?.notes, background: opts?.background });
    return this;
  }

  /** Build the final ElucimDocument */
  build(): ElucimDocument {
    const slides: SlideNode[] = this._slides.map((entry) => {
      const sb = new SlideBuilder(
        this._theme,
        this._opts.fps,
        this._opts.width,
        this._opts.height,
      );
      entry.build(sb);
      const { elements, durationInFrames } = sb._build();

      return {
        type: 'slide' as const,
        title: entry.title,
        notes: entry.notes,
        background: entry.background,
        children: [{
          type: 'player' as const,
          width: this._opts.width,
          height: this._opts.height,
          fps: this._opts.fps!,
          durationInFrames,
          controls: false,
          loop: false,
          autoPlay: true,
          children: elements,
        }],
      };
    });

    const root: PresentationNode = {
      type: 'presentation',
      width: this._opts.width,
      height: this._opts.height,
      background: this._theme.background,
      transition: this._opts.transition,
      transitionDuration: this._opts.transitionDuration,
      showHud: this._opts.showHud,
      showNotes: this._opts.showNotes,
      slides,
    };

    return {
      version: '1.0',
      root,
    };
  }

  /** Build and return as JSON string (for saving to file) */
  toJSON(pretty = true): string {
    return JSON.stringify(this.build(), null, pretty ? 2 : undefined);
  }
}

/**
 * Create a new presentation. Entry point for the builder API.
 *
 * @example
 * ```ts
 * import { presentation, darkTheme } from '@elucim/dsl/builders';
 *
 * const doc = presentation('My Talk', darkTheme)
 *   .slide('Welcome', s => {
 *     s.title('Welcome to My Talk');
 *     s.subtitle('A visual journey');
 *   })
 *   .build();
 * ```
 */
export function presentation(title: string, theme?: Theme, opts?: PresentationOptions): PresentationBuilder {
  return new PresentationBuilder(title, theme, opts);
}
