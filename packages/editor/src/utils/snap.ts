import type { BoundingBox } from './bounds';

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  label?: string;
}

const SNAP_THRESHOLD = 8;

/**
 * Given an element's bounds and a list of other element bounds + scene edges,
 * compute snap guides and adjusted position deltas.
 */
export function computeSnap(
  movingBounds: BoundingBox,
  targets: BoundingBox[],
  sceneWidth: number,
  sceneHeight: number,
): { snapDx: number; snapDy: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  let snapDx = 0;
  let snapDy = 0;

  const movingCx = movingBounds.x + movingBounds.width / 2;
  const movingCy = movingBounds.y + movingBounds.height / 2;
  const movingRight = movingBounds.x + movingBounds.width;
  const movingBottom = movingBounds.y + movingBounds.height;

  // Scene center guides
  const sceneCx = sceneWidth / 2;
  const sceneCy = sceneHeight / 2;

  // Check scene center X
  if (Math.abs(movingCx - sceneCx) < SNAP_THRESHOLD) {
    snapDx = sceneCx - movingCx;
    guides.push({ type: 'vertical', position: sceneCx, label: 'center' });
  }
  // Check scene center Y
  if (Math.abs(movingCy - sceneCy) < SNAP_THRESHOLD) {
    snapDy = sceneCy - movingCy;
    guides.push({ type: 'horizontal', position: sceneCy, label: 'center' });
  }

  // Check scene edges
  if (Math.abs(movingBounds.x) < SNAP_THRESHOLD) {
    snapDx = -movingBounds.x;
    guides.push({ type: 'vertical', position: 0 });
  } else if (Math.abs(movingRight - sceneWidth) < SNAP_THRESHOLD) {
    snapDx = sceneWidth - movingRight;
    guides.push({ type: 'vertical', position: sceneWidth });
  }

  if (Math.abs(movingBounds.y) < SNAP_THRESHOLD) {
    snapDy = -movingBounds.y;
    guides.push({ type: 'horizontal', position: 0 });
  } else if (Math.abs(movingBottom - sceneHeight) < SNAP_THRESHOLD) {
    snapDy = sceneHeight - movingBottom;
    guides.push({ type: 'horizontal', position: sceneHeight });
  }

  // Check alignment with other elements
  for (const target of targets) {
    const targetCx = target.x + target.width / 2;
    const targetCy = target.y + target.height / 2;

    // Center-to-center alignment
    if (!snapDx && Math.abs(movingCx - targetCx) < SNAP_THRESHOLD) {
      snapDx = targetCx - movingCx;
      guides.push({ type: 'vertical', position: targetCx });
    }
    if (!snapDy && Math.abs(movingCy - targetCy) < SNAP_THRESHOLD) {
      snapDy = targetCy - movingCy;
      guides.push({ type: 'horizontal', position: targetCy });
    }

    // Edge alignment
    if (!snapDx && Math.abs(movingBounds.x - target.x) < SNAP_THRESHOLD) {
      snapDx = target.x - movingBounds.x;
      guides.push({ type: 'vertical', position: target.x });
    }
    if (!snapDx && Math.abs(movingRight - (target.x + target.width)) < SNAP_THRESHOLD) {
      snapDx = (target.x + target.width) - movingRight;
      guides.push({ type: 'vertical', position: target.x + target.width });
    }
    if (!snapDy && Math.abs(movingBounds.y - target.y) < SNAP_THRESHOLD) {
      snapDy = target.y - movingBounds.y;
      guides.push({ type: 'horizontal', position: target.y });
    }
    if (!snapDy && Math.abs(movingBottom - (target.y + target.height)) < SNAP_THRESHOLD) {
      snapDy = (target.y + target.height) - movingBottom;
      guides.push({ type: 'horizontal', position: target.y + target.height });
    }
  }

  return { snapDx, snapDy, guides };
}
