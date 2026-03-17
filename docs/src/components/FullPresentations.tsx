/**
 * Full presentation demos for the Examples docs pages.
 * These render the complete slide decks using DslRenderer with
 * colorScheme="auto" so they adapt to light/dark mode.
 */
import React from 'react';
import { DslRenderer } from '@elucim/dsl';
import type { ElucimDocument } from '@elucim/dsl';

import calculusJson from '../../../packages/dsl/examples/calculus-explained.json';
import agenticJson from '../../../packages/dsl/examples/agentic-loop.json';

export function FullCalculusPresentation() {
  return (
    <DslRenderer
      dsl={calculusJson as unknown as ElucimDocument}
      colorScheme="auto"
      style={{ width: '100%' }}
    />
  );
}

export function FullAgenticPresentation() {
  return (
    <DslRenderer
      dsl={agenticJson as unknown as ElucimDocument}
      colorScheme="auto"
      style={{ width: '100%' }}
    />
  );
}
