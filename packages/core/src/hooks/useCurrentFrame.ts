import { useElucimContext } from '../context';

/**
 * Returns the current frame number within the current Scene.
 * Must be called inside a <Scene> component.
 */
export function useCurrentFrame(): number {
  const { frame } = useElucimContext();
  return frame;
}
