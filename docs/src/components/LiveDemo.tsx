import React from 'react';

/**
 * Wrapper for embedding live Elucim demos in docs pages.
 * Use with client:visible in MDX: <LiveDemo client:visible>...</LiveDemo>
 */
export default function LiveDemo({
  children,
  label = 'Live Demo',
  height = 'auto',
}: {
  children: React.ReactNode;
  label?: string;
  height?: string | number;
}) {
  return (
    <div className="live-demo">
      <div className="live-demo-label">
        <span>▶</span> {label}
      </div>
      <div className="live-demo-content" style={{ minHeight: height }}>
        {children}
      </div>
    </div>
  );
}
