import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';

// ─── Context ─────────────────────────────────────────────────────────────────

interface PresentationContextValue {
  slideIndex: number;
  totalSlides: number;
  /** Navigate to specific slide */
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  /** Whether currently in fullscreen */
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function usePresentationContext() {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error('usePresentationContext must be used inside <Presentation>');
  return ctx;
}

// ─── Slide ───────────────────────────────────────────────────────────────────

export interface SlideProps {
  /** Optional slide title (shown in presenter HUD) */
  title?: string;
  /** Presenter notes (shown in presenter view, not on screen) */
  notes?: string;
  /** Background color override for this slide */
  background?: string;
  /** Children — any Elucim content (Player, Scene, raw SVG, HTML) */
  children: React.ReactNode;
}

/**
 * A single slide in a Presentation.
 * Children can be anything: a <Player> with animations, static content, HTML, etc.
 */
export function Slide({ children, background }: SlideProps) {
  return (
    <div
      data-testid="elucim-slide"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: background ?? 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// ─── Transitions ─────────────────────────────────────────────────────────────

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'zoom';

function getTransitionStyle(
  type: TransitionType,
  direction: 'enter' | 'exit',
  progress: number,
): React.CSSProperties {
  const t = direction === 'enter' ? progress : 1 - progress;

  switch (type) {
    case 'fade':
      return { opacity: t };
    case 'slide-left': {
      const offset = direction === 'enter' ? (1 - t) * 100 : -t * 100;
      return { transform: `translateX(${offset}%)`, opacity: Math.min(1, t * 2) };
    }
    case 'slide-up': {
      const offset = direction === 'enter' ? (1 - t) * 100 : -t * 100;
      return { transform: `translateY(${offset}%)`, opacity: Math.min(1, t * 2) };
    }
    case 'zoom': {
      const scale = direction === 'enter' ? 0.5 + t * 0.5 : 1 + (1 - t) * 0.5;
      return { transform: `scale(${scale})`, opacity: t };
    }
    case 'none':
    default:
      return {};
  }
}

// ─── Presentation ────────────────────────────────────────────────────────────

export interface PresentationProps {
  /** Slide width. Default: 1920 */
  width?: number;
  /** Slide height. Default: 1080 */
  height?: number;
  /** Background color for the presentation. Default: '#0d0d1a' */
  background?: string;
  /** Transition between slides. Default: 'fade' */
  transition?: TransitionType;
  /** Transition duration in ms. Default: 400 */
  transitionDuration?: number;
  /** Show slide counter HUD. Default: true */
  showHUD?: boolean;
  /** Show presenter notes panel below slides. Default: false */
  showNotes?: boolean;
  /** Start on this slide index. Default: 0 */
  startSlide?: number;
  /** Called when slide changes */
  onSlideChange?: (index: number) => void;
  /** Children — must be <Slide> components */
  children: React.ReactNode;
}

/**
 * Full-screen presentation mode for Elucim.
 *
 * Usage:
 *   <Presentation transition="fade">
 *     <Slide title="Intro">
 *       <Player ...> ... </Player>
 *     </Slide>
 *     <Slide title="Theorem">
 *       <Player ...> ... </Player>
 *     </Slide>
 *   </Presentation>
 *
 * Keyboard:
 *   → / Space / PageDown  = next slide
 *   ← / PageUp            = previous slide
 *   Home                   = first slide
 *   End                    = last slide
 *   F / F11                = toggle fullscreen
 *   Escape                 = exit fullscreen
 *   G                      = go to slide (shows prompt)
 */
export function Presentation({
  width = 1920,
  height = 1080,
  background = '#0d0d1a',
  transition = 'fade',
  transitionDuration = 400,
  showHUD = true,
  showNotes = false,
  startSlide = 0,
  onSlideChange,
  children,
}: PresentationProps) {
  const [slideIndex, setSlideIndex] = useState(startSlide);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transProgress, setTransProgress] = useState(1);
  const [prevSlideIndex, setPrevSlideIndex] = useState(startSlide);
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<number>(0);

  // Extract slides from children
  const slides = useMemo(() => {
    const result: React.ReactElement<SlideProps>[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === Slide) {
        result.push(child as React.ReactElement<SlideProps>);
      }
    });
    return result;
  }, [children]);

  const totalSlides = slides.length;

  const animateTransition = useCallback((fromIndex: number, toIndex: number) => {
    if (transition === 'none' || transitionDuration <= 0) {
      setTransProgress(1);
      return;
    }

    setPrevSlideIndex(fromIndex);
    setTransitioning(true);
    setTransProgress(0);

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / transitionDuration);
      // Smooth ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setTransProgress(eased);

      if (p < 1) {
        transitionRef.current = requestAnimationFrame(animate);
      } else {
        setTransitioning(false);
        setTransProgress(1);
      }
    };
    transitionRef.current = requestAnimationFrame(animate);
  }, [transition, transitionDuration]);

  useEffect(() => {
    return () => cancelAnimationFrame(transitionRef.current);
  }, []);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1));
    if (clamped === slideIndex || transitioning) return;
    animateTransition(slideIndex, clamped);
    setSlideIndex(clamped);
    onSlideChange?.(clamped);
  }, [slideIndex, totalSlides, transitioning, animateTransition, onSlideChange]);

  const next = useCallback(() => {
    if (slideIndex < totalSlides - 1) goTo(slideIndex + 1);
  }, [slideIndex, totalSlides, goTo]);

  const prev = useCallback(() => {
    if (slideIndex > 0) goTo(slideIndex - 1);
  }, [slideIndex, goTo]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFS);
    return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Only handle if presentation container or its children are focused,
      // or if we're in fullscreen
      if (!containerRef.current) return;
      const isInContainer = containerRef.current.contains(document.activeElement) ||
        document.activeElement === containerRef.current ||
        document.fullscreenElement === containerRef.current;
      if (!isInContainer) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(totalSlides - 1);
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          // Don't prevent default — let browser handle exiting fullscreen
          break;
        case 'g':
        case 'G': {
          e.preventDefault();
          const input = prompt(`Go to slide (1-${totalSlides}):`);
          if (input) {
            const n = parseInt(input, 10);
            if (!isNaN(n)) goTo(n - 1);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev, goTo, totalSlides, toggleFullscreen]);

  // Click to advance (click on right half → next, left half → prev)
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [data-testid="elucim-controls"], [data-testid="elucim-scrubbar"]')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX > rect.width * 0.5) {
      next();
    } else {
      prev();
    }
  }, [next, prev]);

  const contextValue: PresentationContextValue = {
    slideIndex,
    totalSlides,
    goTo,
    next,
    prev,
    isFullscreen,
    toggleFullscreen,
  };

  const currentSlide = slides[slideIndex];
  const prevSlide = slides[prevSlideIndex];
  const currentNotes = currentSlide?.props?.notes;
  const currentTitle = currentSlide?.props?.title;

  const aspectRatio = width / height;

  return (
    <PresentationContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        tabIndex={0}
        onClick={handleClick}
        data-testid="elucim-presentation"
        style={{
          width: '100%',
          height: showNotes ? '80vh' : '100%',
          maxHeight: '100vh',
          background,
          position: 'relative',
          outline: 'none',
          overflow: 'hidden',
          aspectRatio: `${width} / ${height}`,
          margin: '0 auto',
          cursor: 'none',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onMouseMove={(e) => {
          // Show cursor on mouse move, hide after 2s
          const el = e.currentTarget;
          el.style.cursor = 'default';
          clearTimeout((el as any).__cursorTimeout);
          (el as any).__cursorTimeout = setTimeout(() => {
            el.style.cursor = 'none';
          }, 2000);
        }}
      >
        {/* Exiting slide (during transition) */}
        {transitioning && prevSlide && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...getTransitionStyle(transition, 'exit', transProgress),
            }}
          >
            {prevSlide}
          </div>
        )}

        {/* Current slide */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...getTransitionStyle(transition, 'enter', transProgress),
          }}
        >
          {currentSlide}
        </div>

        {/* HUD overlay */}
        {showHUD && (
          <div
            data-testid="elucim-presentation-hud"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: 14,
              opacity: 0.8,
              pointerEvents: 'none',
              transition: 'opacity 0.3s',
              zIndex: 100,
            }}
          >
            <span>
              {currentTitle && <strong>{currentTitle}</strong>}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {slides.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === slideIndex ? 10 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === slideIndex ? '#4ecdc4' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {slideIndex + 1} / {totalSlides}
              </span>
            </div>
          </div>
        )}

        {/* Fullscreen button (top right, appears on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          data-testid="elucim-fullscreen-btn"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 16,
            zIndex: 100,
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.6'; }}
          title={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
        >
          {isFullscreen ? '⊠' : '⛶'}
        </button>

        {/* Navigation arrows (appear on hover) */}
        {slideIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            data-testid="elucim-prev-btn"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: 44,
              height: 44,
              cursor: 'pointer',
              fontSize: 20,
              zIndex: 100,
              opacity: 0.5,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
            title="Previous slide"
          >
            ‹
          </button>
        )}
        {slideIndex < totalSlides - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            data-testid="elucim-next-btn"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: 44,
              height: 44,
              cursor: 'pointer',
              fontSize: 20,
              zIndex: 100,
              opacity: 0.5,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
            title="Next slide"
          >
            ›
          </button>
        )}
      </div>

      {/* Presenter notes panel */}
      {showNotes && (
        <div
          data-testid="elucim-presenter-notes"
          style={{
            padding: '16px 24px',
            background: '#1a1a2e',
            borderTop: '1px solid #333',
            color: '#ccc',
            fontSize: 15,
            lineHeight: 1.6,
            maxHeight: '20vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#666', marginBottom: 8, letterSpacing: 1 }}>
            Presenter Notes — Slide {slideIndex + 1}{currentTitle ? `: ${currentTitle}` : ''}
          </div>
          {currentNotes ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{currentNotes}</div>
          ) : (
            <div style={{ color: '#555', fontStyle: 'italic' }}>No notes for this slide.</div>
          )}
        </div>
      )}
    </PresentationContext.Provider>
  );
}
