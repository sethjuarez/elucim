import { describe, expect, it } from 'vitest';
import { upsertTimelineCameraKeyframe } from '../timeline/cameraKeyframes';

describe('upsertTimelineCameraKeyframe', () => {
  it('replaces a timeline keyframe in the timeline coordinate space', () => {
    const timeline = {
      id: 'focus',
      duration: 60,
      tracks: [],
      camera: {
        coordinateSpace: 'normalized' as const,
        fit: 'contain' as const,
        keyframes: [{ frame: 20, viewport: { x: 0, y: 0, width: 1, height: 1 } }],
      },
    };

    const next = upsertTimelineCameraKeyframe(
      timeline,
      undefined,
      20,
      { x: 160, y: 120, width: 320, height: 240 },
      800,
      600,
    );

    expect(next.camera).toEqual({
      coordinateSpace: 'normalized',
      fit: 'contain',
      keyframes: [{ frame: 20, viewport: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 } }],
    });
  });

  it('clamps a new keyframe to the timeline duration', () => {
    const next = upsertTimelineCameraKeyframe(
      { id: 'focus', duration: 30, tracks: [] },
      undefined,
      40,
      { x: 0, y: 0, width: 800, height: 600 },
      800,
      600,
    );

    expect(next.camera?.keyframes).toEqual([
      { frame: 30, viewport: { x: 0, y: 0, width: 800, height: 600 } },
    ]);
  });
});
