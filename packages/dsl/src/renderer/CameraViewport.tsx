import React from 'react';
import type { CameraNode } from '../schema/types';

export interface CameraViewportTransform {
  viewport: { x: number; y: number; width: number; height: number };
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SceneCameraViewportProps {
  camera?: CameraNode;
  width: number;
  height: number;
  children: React.ReactNode;
}

export function resolveCameraViewport(camera: CameraNode, width: number, height: number): CameraViewportTransform {
  if (
    !Number.isFinite(camera.viewport.x) ||
    !Number.isFinite(camera.viewport.y) ||
    !Number.isFinite(camera.viewport.width) ||
    !Number.isFinite(camera.viewport.height) ||
    camera.viewport.width <= 0 ||
    camera.viewport.height <= 0
  ) {
    throw new Error('Camera viewport must have finite coordinates and positive dimensions');
  }
  const coordinateScale = camera.coordinateSpace === 'normalized'
    ? { x: width, y: height }
    : { x: 1, y: 1 };
  const viewport = {
    x: camera.viewport.x * coordinateScale.x,
    y: camera.viewport.y * coordinateScale.y,
    width: camera.viewport.width * coordinateScale.x,
    height: camera.viewport.height * coordinateScale.y,
  };
  const fit = camera.fit ?? 'cover';
  const scale = fit === 'contain'
    ? Math.min(width / viewport.width, height / viewport.height)
    : Math.max(width / viewport.width, height / viewport.height);
  return {
    viewport,
    scale,
    offsetX: (width - viewport.width * scale) / 2,
    offsetY: (height - viewport.height * scale) / 2,
  };
}

/**
 * Maps scene children through a nested SVG viewport so the crop remains
 * deterministic in browser, SSR, and SVG export renderers.
 */
export function SceneCameraViewport({ camera, width, height, children }: SceneCameraViewportProps) {
  if (!camera) return <>{children}</>;

  const { viewport } = resolveCameraViewport(camera, width, height);
  const viewBox = [
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height,
  ].join(' ');

  return (
    <svg
      x={0}
      y={0}
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio={(camera.fit ?? 'cover') === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
      overflow="hidden"
      data-elucim-camera-viewport
    >
      {children}
    </svg>
  );
}
