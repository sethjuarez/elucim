import React from 'react';

/**
 * Wrapper for embedding live Elucim demos in docs pages.
 * Use with client:visible in MDX: <LiveDemo client:visible>...</LiveDemo>
 */
export default function LiveDemo({
  children,
  height = 'auto',
  className,
}: {
  children: React.ReactNode;
  height?: string | number;
  className?: string;
}) {
  return (
    <div className={`live-demo${className ? ` ${className}` : ''}`}>
      <div className="live-demo-content" style={{ minHeight: height }}>
        {children}
      </div>
    </div>
  );
}
