import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { renderToPng, stripCssFunctions, renderToSvgString } from '@elucim/dsl';

// Expose for E2E testing (Playwright can call window.__elucim.renderToPng)
(window as any).__elucim = { renderToPng, stripCssFunctions, renderToSvgString };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
