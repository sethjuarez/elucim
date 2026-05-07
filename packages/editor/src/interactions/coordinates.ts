export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clientXToRatio(clientX: number, rect: Pick<DOMRect, 'left' | 'width'>): number {
  return rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
}

export function frameToPercent(frame: number, maxFrame: number): number {
  return maxFrame > 0 ? (clamp(frame, 0, maxFrame) / maxFrame) * 100 : 0;
}

export function ratioToFrame(ratio: number, maxFrame: number): number {
  return Math.round(clamp(ratio, 0, 1) * Math.max(0, maxFrame));
}

export function clampFrame(frame: number, minFrame: number, maxFrame: number): number {
  return clamp(Math.round(frame), minFrame, maxFrame);
}
