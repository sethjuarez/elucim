export function parseKeyframeValue(value: string): unknown {
  const numeric = Number(value);
  return value.trim() !== '' && Number.isFinite(numeric) ? numeric : value;
}
