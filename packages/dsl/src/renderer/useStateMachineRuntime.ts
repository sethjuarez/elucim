import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElucimDocument } from '../schema/types';
import type { ElucimV2Document } from '../v2/types';
import { migrateV2ToV1 } from '../v2/migrate';
import { applyTimelineFrames } from '../v2/timeline';
import {
  advanceStateMachineRunFrame,
  dispatchStateMachineRunEvent,
  getStateMachineRunVisualFrames,
  startStateMachineRun,
  type ElucimV2StateMachineRun,
} from '../v2/stateMachine';

interface StateMachineRuntimeOptions {
  dsl: ElucimDocument | ElucimV2Document;
  valid: boolean;
  poster?: 'first' | 'last' | number;
  loop?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
}

interface StateMachineRuntime {
  enabled: boolean;
  renderableDsl?: ElucimDocument;
  frameOverride?: number;
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
  const v2StateMachineDoc = useMemo(() => getV2StateMachineDocument(dsl), [dsl]);
  const stateMachineId = v2StateMachineDoc?.defaultStateMachine;
  const enabled = valid && poster === undefined && Boolean(stateMachineId && v2StateMachineDoc?.stateMachines?.[stateMachineId]);
  const shouldLoop = loop ?? v2StateMachineDoc?.scene.loop ?? false;
  const [run, setRun] = useState<ElucimV2StateMachineRun | null>(null);
  const effectiveRun = useMemo(() => {
    if (!enabled || !v2StateMachineDoc || !stateMachineId) return null;
    return run?.machineId === stateMachineId ? run : startStateMachineRun(v2StateMachineDoc, stateMachineId);
  }, [enabled, run, stateMachineId, v2StateMachineDoc]);

  useEffect(() => {
    if (!enabled || !v2StateMachineDoc || !stateMachineId) {
      setRun(null);
      return;
    }
    setRun(startStateMachineRun(v2StateMachineDoc, stateMachineId));
  }, [enabled, stateMachineId, v2StateMachineDoc]);

  const triggerEvent = useCallback((event: string, key?: string) => {
    if (!enabled || !v2StateMachineDoc || !effectiveRun) return false;
    const next = dispatchStateMachineRunEvent(v2StateMachineDoc, effectiveRun, key ? { name: event, key } : event);
    if (!next.changed) return false;
    setRun(next);
    onPlayStateChange?.(next.playing);
    return true;
  }, [effectiveRun, enabled, onPlayStateChange, v2StateMachineDoc]);

  useEffect(() => {
    if (!enabled || !v2StateMachineDoc || !effectiveRun?.playing) return;
    let raf = 0;
    let lastTime = performance.now();
    const fps = v2StateMachineDoc.scene.fps ?? 60;
    const tick = (now: number) => {
      const elapsed = now - lastTime;
      const frameDelta = Math.floor((elapsed / 1000) * fps);
      if (frameDelta >= 1) {
        setRun(current => {
          if (!current?.playing) return current;
          const next = advanceStateMachineRunFrame(v2StateMachineDoc, current, frameDelta);
          if (shouldLoop && stateMachineId && (next.finished || next.exited)) {
            const restarted = startStateMachineRun(v2StateMachineDoc, stateMachineId);
            if (next.playing !== restarted.playing) onPlayStateChange?.(restarted.playing);
            return restarted;
          }
          if (next.playing !== current.playing) onPlayStateChange?.(next.playing);
          return next;
        });
        lastTime = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [effectiveRun?.playing, enabled, onPlayStateChange, shouldLoop, stateMachineId, v2StateMachineDoc]);

  const renderableDsl = enabled && v2StateMachineDoc && effectiveRun
    ? stateMachineRunToRenderableV1(v2StateMachineDoc, effectiveRun)
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
    frameOverride: enabled ? 0 : undefined,
    getTotalFrames: () => effectiveRun ? getRunDuration(v2StateMachineDoc, effectiveRun) + 1 : 0,
    seekToFrame: frame => {
      setRun(current => current ? { ...current, currentFrame: Math.max(0, Math.min(frame, getRunDuration(v2StateMachineDoc, current))) } : current);
    },
    play: () => {
      if (shouldLoop && effectiveRun && (effectiveRun.finished || effectiveRun.exited) && v2StateMachineDoc && stateMachineId) {
        const restarted = startStateMachineRun(v2StateMachineDoc, stateMachineId);
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

function getV2StateMachineDocument(dsl: ElucimDocument | ElucimV2Document): ElucimV2Document | undefined {
  return dsl.version === '2.0' && dsl.defaultStateMachine ? dsl : undefined;
}

function stateMachineRunToRenderableV1(doc: ElucimV2Document, run: ElucimV2StateMachineRun): ElucimDocument {
  const frames = getStateMachineRunVisualFrames(doc, run);
  return migrateV2ToV1(frames.length > 0 ? applyTimelineFrames(doc, frames) : doc);
}

function getRunDuration(doc: ElucimV2Document | undefined, run: ElucimV2StateMachineRun): number {
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
