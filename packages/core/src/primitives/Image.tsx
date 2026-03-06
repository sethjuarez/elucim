import React, { useId } from 'react';
import { useAnimation, type AnimationProps } from './animation';
import { withTransform, type SpatialProps, type BaseElementProps } from './transform';

export interface ImageProps extends AnimationProps, SpatialProps, BaseElementProps {
  /** Image URL or data URI */
  src: string;
  /** X position in SVG coordinates */
  x: number;
  /** Y position in SVG coordinates */
  y: number;
  /** Rendered width */
  width: number;
  /** Rendered height */
  height: number;
  /** SVG preserveAspectRatio. Default: 'xMidYMid meet' */
  preserveAspectRatio?: string;
  /** Rounded corner radius. Applied via clipPath. Default: 0 */
  borderRadius?: number;
  /** Clip to shape inscribed in bounds. Default: 'none' */
  clipShape?: 'none' | 'circle' | 'ellipse';
  /** Base opacity. Default: 1 */
  opacity?: number;
}

/**
 * Embeds any web-supported image (PNG, JPEG, SVG, WebP, GIF) in a scene.
 * Supports clipping (borderRadius, clipShape) and spatial transforms.
 */
export function Image({
  src,
  x,
  y,
  width,
  height,
  preserveAspectRatio = 'xMidYMid meet',
  borderRadius = 0,
  clipShape = 'none',
  opacity: baseOpacity = 1,
  fadeIn,
  fadeOut,
  easing,
  rotation,
  rotationOrigin,
  scale,
  translate,
}: ImageProps) {
  const clipId = useId();
  const anim = useAnimation({ fadeIn, fadeOut, easing });
  const needsClip = borderRadius > 0 || clipShape !== 'none';

  const cx = x + width / 2;
  const cy = y + height / 2;

  const clipPathContent = needsClip ? (
    <defs>
      <clipPath id={clipId}>
        {clipShape === 'circle' ? (
          <circle cx={cx} cy={cy} r={Math.min(width, height) / 2} />
        ) : clipShape === 'ellipse' ? (
          <ellipse cx={cx} cy={cy} rx={width / 2} ry={height / 2} />
        ) : (
          <rect x={x} y={y} width={width} height={height} rx={borderRadius} ry={borderRadius} />
        )}
      </clipPath>
    </defs>
  ) : null;

  const el = (
    <g data-testid="elucim-image" opacity={baseOpacity * anim.opacity}>
      {clipPathContent}
      <image
        href={src}
        x={x}
        y={y}
        width={width}
        height={height}
        preserveAspectRatio={preserveAspectRatio}
        clipPath={needsClip ? `url(#${clipId})` : undefined}
      />
    </g>
  );

  return withTransform(el, { rotation, rotationOrigin, scale, translate }, [cx, cy]);
}
