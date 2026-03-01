import React from 'react';
import { createRoot } from 'react-dom/client';
import { Explorer } from './Explorer';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Explorer />
  </React.StrictMode>
);
