import type { PointerEvent as ReactPointerEvent } from 'react';

export interface RafDragPoint {
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  moved: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface StartRafDragOptions {
  event: ReactPointerEvent<Element>;
  capture?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  moveThreshold?: number;
  onStart?: (point: RafDragPoint) => void;
  onFrame?: (point: RafDragPoint) => void;
  onCommit?: (point: RafDragPoint) => void;
  onCancel?: (point: RafDragPoint) => void;
}

export function startRafDrag({
  event,
  capture = true,
  preventDefault = true,
  stopPropagation = true,
  moveThreshold = 0,
  onStart,
  onFrame,
  onCommit,
  onCancel,
}: StartRafDragOptions): void {
  if (preventDefault) event.preventDefault();
  if (stopPropagation) event.stopPropagation();

  const target = event.currentTarget;
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startY = event.clientY;
  let latestX = startX;
  let latestY = startY;
  let moved = false;
  let rafId: number | null = null;
  let active = true;
  let altKey = event.altKey;
  let ctrlKey = event.ctrlKey;
  let metaKey = event.metaKey;
  let shiftKey = event.shiftKey;

  const point = (): RafDragPoint => ({
    clientX: latestX,
    clientY: latestY,
    deltaX: latestX - startX,
    deltaY: latestY - startY,
    moved,
    altKey,
    ctrlKey,
    metaKey,
    shiftKey,
  });

  const cleanup = () => {
    active = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (capture && typeof target.releasePointerCapture === 'function' && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    window.removeEventListener('pointermove', handleMove, true);
    window.removeEventListener('pointerup', handleCommit, true);
    window.removeEventListener('pointercancel', handleCancel, true);
    window.removeEventListener('mousemove', handleMove, true);
    window.removeEventListener('mouseup', handleCommit, true);
  };

  const flush = () => {
    rafId = null;
    if (active) onFrame?.(point());
  };

  const schedule = () => {
    if (rafId === null) rafId = requestAnimationFrame(flush);
  };

  const update = (moveEvent: PointerEvent | MouseEvent) => {
    latestX = moveEvent.clientX;
    latestY = moveEvent.clientY;
    altKey = moveEvent.altKey;
    ctrlKey = moveEvent.ctrlKey;
    metaKey = moveEvent.metaKey;
    shiftKey = moveEvent.shiftKey;
    const distance = Math.hypot(latestX - startX, latestY - startY);
    moved = moved || distance >= moveThreshold;
    if (moved) schedule();
  };

  function handleMove(moveEvent: PointerEvent | MouseEvent) {
    update(moveEvent);
  }

  function handleCommit(upEvent: PointerEvent | MouseEvent) {
    update(upEvent);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (moved) onFrame?.(point());
    onCommit?.(point());
    cleanup();
  }

  function handleCancel(cancelEvent: PointerEvent | MouseEvent) {
    update(cancelEvent);
    onCancel?.(point());
    cleanup();
  }

  if (capture && typeof target.setPointerCapture === 'function') {
    target.setPointerCapture(pointerId);
  }
  onStart?.(point());
  window.addEventListener('pointermove', handleMove, true);
  window.addEventListener('pointerup', handleCommit, true);
  window.addEventListener('pointercancel', handleCancel, true);
  window.addEventListener('mousemove', handleMove, true);
  window.addEventListener('mouseup', handleCommit, true);
}
