/**
 * Full presentation demos for the Examples docs pages.
 * These render the complete slide decks using DslRenderer,
 * adapting backgrounds to match the Starlight light/dark theme.
 */
import React, { useState, useEffect } from 'react';
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

import calculusJson from '../../../packages/dsl/examples/calculus-explained.json';
import agenticJson from '../../../packages/dsl/examples/agentic-loop.json';

const DARK_BG = '#0a0a1e';
const LIGHT_BG = '#f5f5fa';
const LIGHT_TEXT = '#1a1a2e';

function useStarlightTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    const update = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setTheme(t === 'light' ? 'light' : 'dark');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** Recursively swap dark backgrounds and text colors for light mode */
function adaptForLight(node: any): any {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(adaptForLight);

  const result: any = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'background' && value === DARK_BG) {
      result[key] = LIGHT_BG;
    } else if (key === 'children' && Array.isArray(value)) {
      result[key] = value.map(adaptForLight);
    } else if ((key === 'fill' || key === 'color') && typeof value === 'string'
               && (value === '#e0e7ff' || value === '#e0e0e0' || value === '#fff' || value === '#ffffff')) {
      result[key] = LIGHT_TEXT;
    } else {
      result[key] = value;
    }
  }
  return result;
}

function useThemedDoc(doc: unknown): ElucimDocument {
  const theme = useStarlightTheme();
  return React.useMemo(() => {
    if (theme === 'dark') return doc as ElucimDocument;
    return adaptForLight(doc) as ElucimDocument;
  }, [doc, theme]);
}

export function FullCalculusPresentation() {
  const doc = useThemedDoc(calculusJson);
  return (
    <DslRenderer
      dsl={doc}
      style={{ width: '100%', maxWidth: 900 }}
    />
  );
}

export function FullAgenticPresentation() {
  const doc = useThemedDoc(agenticJson);
  return (
    <DslRenderer
      dsl={doc}
      style={{ width: '100%', maxWidth: 900 }}
    />
  );
}
