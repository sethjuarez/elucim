import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElucimDocument as RenderableDocument } from '../schema/types';
import type { ElucimDocument, ElucimStateMachineRun } from '../document';
import {
  advanceStateMachineRunFrame,
  applyTimelineFrames,
  createRenderableDocument,
  dispatchStateMachineRunEvent,
  getStateMachineRunVisualFrames,
  resolveTimelineReveals,
  startStateMachineRun,
} from '../document';
import type { RevealState } from '@elucim/core';

interface StateMachineRuntimeOptions {
  dsl: RenderableDocument | ElucimDocument;
  valid: boolean;
  poster?: 'first' | 'last' | number;
  loop?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

interface StateMachineRuntime {
  enabled: boolean;
  renderableDsl?: RenderableDocument;
  frameOverride?: number;
  revealStates?: Record<string, RevealState>;
  getTotalFrames(): number;
  seekToFrame(frame: number): void;
  play(): void;
  pause(): void;
  isPlaying(): boolean;
  rootProps: {
    tabIndex?: number;
    'aria-label'?: string;
    onClick(event: React.MouseEvent<HTMLDivElement>): void;
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void;
  };
}

export function useStateMachineRuntime({
  dsl,
  valid,
  poster,
  loop,
  onPlayStateChange,
}: StateMachineRuntimeOptions): StateMachineRuntime {
  const stateMachineDocument = useMemo(() => getStateMachineDocument(dsl), [dsl]);
  const stateMachineId = stateMachineDocument?.defaultStateMachine;
  const enabled = valid && poster === undefined && Boolean(stateMachineId && stateMachineDocument?.stateMachines?.[stateMachineId]);
  const shouldLoop = loop ?? stateMachineDocument?.scene.loop ?? false;
  const [run, setRun] = useState<ElucimStateMachineRun | null>(null);
  const effectiveRun = useMemo(() => {
    if (!enabled || !stateMachineDocument || !stateMachineId) return null;
    return run?.machineId === stateMachineId ? run : startStateMachineRun(stateMachineDocument, stateMachineId);
  }, [enabled, run, stateMachineDocument, stateMachineId]);
  const effectiveRunRef = React.useRef<ElucimStateMachineRun | null>(effectiveRun);
  effectiveRunRef.current = effectiveRun;

  useEffect(() => {
    if (!enabled || !stateMachineDocument || !stateMachineId) {
      setRun(null);
      return;
    }
    setRun(startStateMachineRun(stateMachineDocument, stateMachineId));
  }, [enabled, stateMachineDocument, stateMachineId]);

  const triggerEvent = useCallback((event: string, key?: string) => {
    const currentRun = effectiveRunRef.current;
    if (!enabled || !stateMachineDocument || !currentRun) return false;
    const next = dispatchStateMachineRunEvent(stateMachineDocument, currentRun, key ? { name: event, key } : event);
    if (!next.changed) return false;
    effectiveRunRef.current = next;
    setRun(next);
    onPlayStateChange?.(next.playing);
    return true;
  }, [enabled, onPlayStateChange, stateMachineDocument]);

  useEffect(() => {
    if (!enabled || !stateMachineDocument || !effectiveRun?.playing) return;
    let raf = 0;
    let lastTime = performance.now();
    const fps = stateMachineDocument.scene.fps ?? 60;
    const tick = (now: number) => {
      const elapsed = now - lastTime;
      const frameDelta = Math.floor((elapsed / 1000) * fps);
      if (frameDelta >= 1) {
        setRun(current => {
          if (!current?.playing) return current;
          const next = advanceStateMachineRunFrame(stateMachineDocument, current, frameDelta);
          if (shouldLoop && stateMachineId && (next.finished || next.exited)) {
            const restarted = startStateMachineRun(stateMachineDocument, stateMachineId);
            effectiveRunRef.current = restarted;
            if (next.playing !== restarted.playing) onPlayStateChange?.(restarted.playing);
            return restarted;
          }
          effectiveRunRef.current = next;
          if (next.playing !== current.playing) onPlayStateChange?.(next.playing);
          return next;
        });
        lastTime = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [effectiveRun?.playing, enabled, onPlayStateChange, shouldLoop, stateMachineDocument, stateMachineId]);

  const renderableDsl = enabled && stateMachineDocument && effectiveRun
    ? stateMachineRunToRenderableDocument(stateMachineDocument, effectiveRun)
    : undefined;
  const revealStates = enabled && stateMachineDocument && effectiveRun
    ? resolveTimelineReveals(stateMachineDocument, getStateMachineRunVisualFrames(stateMachineDocument, effectiveRun))
    : undefined;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || isInteractiveClickTarget(event.target)) return;
    event.currentTarget.focus();
    if (triggerEvent('onClick')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enabled || event.key === 'Tab') return;
    const keyName = displayKeyName(event.key);
    if (!keyName) return;
    if (triggerEvent('onKey', keyName)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return {
    enabled,
    renderableDsl,
    frameOverride: enabled ? effectiveRun?.currentFrame : undefined,
    revealStates,
    getTotalFrames: () => effectiveRun ? getRunDuration(stateMachineDocument, effectiveRun) + 1 : 0,
    seekToFrame: frame => {
      setRun(current => {
        if (!current) return current;
        const currentFrame = Math.max(0, Math.min(frame, getRunDuration(stateMachineDocument, current)));
        const next = {
          ...current,
          currentFrame,
          stateFrames: current.stateFrames.map((value, index) =>
            index === current.stateFrames.length - 1 ? currentFrame : value,
          ),
        };
        effectiveRunRef.current = next;
        return next;
      });
    },
    play: () => {
      if (shouldLoop && effectiveRun && (effectiveRun.finished || effectiveRun.exited) && stateMachineDocument && stateMachineId) {
        const restarted = startStateMachineRun(stateMachineDocument, stateMachineId);
        setRun(restarted);
        onPlayStateChange?.(restarted.playing);
        return;
      }
      const canPlay = Boolean(effectiveRun?.timelineId && !effectiveRun.exited && !effectiveRun.finished);
      if (!canPlay) return;
      setRun(current => current ? { ...current, playing: true } : current);
      if (!effectiveRun?.playing) onPlayStateChange?.(true);
    },
    pause: () => {
      setRun(current => current ? { ...current, playing: false } : current);
      onPlayStateChange?.(false);
    },
    isPlaying: () => effectiveRun?.playing ?? false,
    rootProps: {
      tabIndex: enabled ? 0 : undefined,
      'aria-label': enabled ? 'Elucim state machine viewer' : undefined,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    },
  };
}

function getStateMachineDocument(dsl: RenderableDocument | ElucimDocument): ElucimDocument | undefined {
  return dsl.version === '2.0' && dsl.defaultStateMachine ? dsl : undefined;
}

function stateMachineRunToRenderableDocument(doc: ElucimDocument, run: ElucimStateMachineRun): RenderableDocument {
  const frames = getStateMachineRunVisualFrames(doc, run);
  return createRenderableDocument(frames.length > 0 ? applyTimelineFrames(doc, frames) : doc);
}

function getRunDuration(doc: ElucimDocument | undefined, run: ElucimStateMachineRun): number {
  if (!doc || run.stateId === 'entry' || !run.timelineId) return 0;
  return doc.timelines?.[run.timelineId]?.duration ?? 0;
}

function displayKeyName(key: string): string | undefined {
  if (key === ' ') return 'Space';
  if (!key) return undefined;
  return key.length === 1 ? key.toUpperCase() : key;
}

function isInteractiveClickTarget(target: EventTarget): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, a, [data-testid="elucim-controls"]'));
}
