import React, { useCallback, useRef } from 'react';
import type { ElementNode } from '@elucim/dsl';
import type { Viewport } from '../state/types';
import { getElementBounds } from '../utils/bounds';
import { getElementId } from '../state/types';

interface MinimapProps {
  viewport: Viewport;
  sceneWidth: number;
  sceneHeight: number;
  containerWidth: number;
  containerHeight: number;
  elements: ElementNode[];
  onViewportChange: (viewport: Partial<Viewport>) => void;
}

const MINIMAP_WIDTH = 140;
const MINIMAP_HEIGHT = 100;

/**
 * Bird's-eye minimap showing the scene and current viewport position.
 * Click or drag to pan the viewport.
 */
export function Minimap({
  viewport,
  sceneWidth,
  sceneHeight,
  containerWidth,
  containerHeight,
  elements,
  onViewportChange,
}: MinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Scale scene to fit minimap
  const scaleX = MINIMAP_WIDTH / (sceneWidth * 1.5);
  const scaleY = MINIMAP_HEIGHT / (sceneHeight * 1.5);
  const scale = Math.min(scaleX, scaleY);

  // Scene rect in minimap coords (centered)
  const sceneW = sceneWidth * scale;
  const sceneH = sceneHeight * scale;
  const sceneX = (MINIMAP_WIDTH - sceneW) / 2;
  const sceneY = (MINIMAP_HEIGHT - sceneH) / 2;

  // Viewport rect in minimap coords
  const vpW = (containerWidth / viewport.zoom) * scale;
  const vpH = (containerHeight / viewport.zoom) * scale;
  const vpX = sceneX + (-viewport.x / viewport.zoom) * scale;
  const vpY = sceneY + (-viewport.y / viewport.zoom) * scale;

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click to viewport position
    const sceneClickX = (clickX - sceneX) / scale;
    const sceneClickY = (clickY - sceneY) / scale;

    // Center viewport on the clicked point
    const newX = -(sceneClickX - containerWidth / viewport.zoom / 2) * viewport.zoom;
    const newY = -(sceneClickY - containerHeight / viewport.zoom / 2) * viewport.zoom;

    onViewportChange({ x: newX, y: newY });
  }, [viewport, containerWidth, containerHeight, sceneX, sceneY, scale, onViewportChange]);

  return (
    <div
      className="elucim-editor-minimap"
      style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        zIndex: 90,
        background: '#0f172acc',
        backdropFilter: 'blur(4px)',
        border: '1px solid #334155',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
        style={{ display: 'block', cursor: 'pointer' }}
      >
        {/* Scene background */}
        <rect x={sceneX} y={sceneY} width={sceneW} height={sceneH} fill="#0f172a" stroke="#334155" strokeWidth={0.5} />

        {/* Element indicators */}
        {elements.map((el, i) => {
          const bounds = getElementBounds(el);
          if (!bounds) return null;
          return (
            <rect
              key={getElementId(el, i)}
              x={sceneX + bounds.x * scale}
              y={sceneY + bounds.y * scale}
              width={Math.max(2, bounds.width * scale)}
              height={Math.max(2, bounds.height * scale)}
              fill="#4a9eff44"
              stroke="#4a9eff88"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="none"
          stroke="#4a9eff"
          strokeWidth={1}
          strokeDasharray="2 1"
        />
      </svg>
    </div>
  );
}
