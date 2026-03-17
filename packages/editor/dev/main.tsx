import React from 'react';
import { createRoot } from 'react-dom/client';
import { ElucimEditor } from '../src/index';

function App() {
  return (
    <ElucimEditor
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
