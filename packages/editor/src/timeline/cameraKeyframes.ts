import type { CameraNode, ElucimTimeline } from '@elucim/editor-projection';

export interface SceneCameraViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Replaces or inserts one camera sample without changing the timeline's
 * coordinate space or fit mode.
 */
export function upsertTimelineCameraKeyframe(
  timeline: ElucimTimeline,
  sourceCamera: CameraNode | undefined,
  frame: number,
  sceneViewport: SceneCameraViewport,
  sceneWidth: number,
  sceneHeight: number,
): ElucimTimeline {
  const coordinateSpace = timeline.camera?.coordinateSpace ?? sourceCamera?.coordinateSpace ?? 'scene';
  const keyframeFrame = Math.max(0, Math.min(frame, timeline.duration));
  const viewport = coordinateSpace === 'normalized'
    ? {
        x: sceneViewport.x / sceneWidth,
        y: sceneViewport.y / sceneHeight,
        width: sceneViewport.width / sceneWidth,
        height: sceneViewport.height / sceneHeight,
      }
    : { ...sceneViewport };
  const keyframes = [
    ...(timeline.camera?.keyframes ?? []),
    { frame: keyframeFrame, viewport },
  ]
    .filter((keyframe, index, all) => keyframe.frame !== keyframeFrame || index === all.length - 1)
    .sort((left, right) => left.frame - right.frame);

  return {
    ...timeline,
    camera: {
      coordinateSpace,
      fit: timeline.camera?.fit ?? sourceCamera?.fit ?? 'cover',
      keyframes,
    },
  };
}
