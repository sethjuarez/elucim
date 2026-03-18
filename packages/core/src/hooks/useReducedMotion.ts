import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function queryMatches(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Returns true when the user prefers reduced motion.
 * Updates reactively if the preference changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(queryMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}
