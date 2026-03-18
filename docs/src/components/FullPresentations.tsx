/**
 * Full presentation demos for the Examples docs pages.
 * Detects Starlight's data-theme attribute to sync light/dark mode.
 */
import React, { useState, useEffect } from 'react';
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

import calculusJson from '../../../packages/dsl/examples/calculus-explained.json';
import agenticJson from '../../../packages/dsl/examples/agentic-loop.json';

/** Watch Starlight's data-theme attribute on <html> */
function useStarlightColorScheme(): 'light' | 'dark' | 'auto' {
  // Start with 'auto' to avoid SSR hydration mismatch — DslRenderer
  // will use prefers-color-scheme until the client effect reads Starlight's
  // data-theme attribute and switches to the explicit value.
  const [scheme, setScheme] = useState<'light' | 'dark' | 'auto'>('auto');
  useEffect(() => {
    const update = () => {
      const attr = document.documentElement.getAttribute('data-theme');
      setScheme(attr === 'light' ? 'light' : attr === 'dark' ? 'dark' : 'auto');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return scheme;
}

export function FullCalculusPresentation() {
  const colorScheme = useStarlightColorScheme();
  return (
    <DslRenderer
      dsl={calculusJson as unknown as ElucimDocument}
      colorScheme={colorScheme}
      style={{ width: '100%' }}
    />
  );
}

export function FullAgenticPresentation() {
  const colorScheme = useStarlightColorScheme();
  return (
    <DslRenderer
      dsl={agenticJson as unknown as ElucimDocument}
      colorScheme={colorScheme}
      style={{ width: '100%' }}
    />
  );
}
