import type { ElucimAnchor, ElucimAnchorPoint, ElucimDocument, ElucimElement } from './types';

/** A measured box, e.g. an element bounding box from a recorded take. */
export interface ElucimAnchorBox {
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Alias for `width` (DOMRect-style take logs). */
  w?: number;
  /** Alias for `height`. */
  h?: number;
}

export interface ElucimAnchorBindings {
  anchors: Record<string, ElucimAnchorBox>;
  /**
   * Coordinate space of the boxes (e.g. the video or viewport size). Boxes are
   * scaled into scene coordinates when it differs from the scene size. Omit when
   * the boxes are already in scene coordinates.
   */
  source?: { width: number; height: number };
}

export type ElucimAnchorErrorCode = 'unknown-anchor' | 'invalid-box' | 'invalid-source' | 'unsupported-endpoint' | 'unsupported-element';

export class ElucimAnchorError extends Error {
  readonly code: ElucimAnchorErrorCode;
  readonly path: string;

  constructor(code: ElucimAnchorErrorCode, path: string, message: string) {
    super(message);
    this.name = 'ElucimAnchorError';
    this.code = code;
    this.path = path;
  }
}

/** Resolves a point on an anchor box. Point anchors (no size) return `x,y` for every point. */
export function anchorPoint(anchor: Pick<ElucimAnchor, 'x' | 'y' | 'width' | 'height'>, point: ElucimAnchorPoint = 'center'): [number, number] {
  const w = anchor.width ?? 0;
  const h = anchor.height ?? 0;
  const fx = point.includes('left') ? 0 : point.includes('right') ? 1 : 0.5;
  const fy = point.startsWith('top') ? 0 : point.startsWith('bottom') ? 1 : 0.5;
  return [anchor.x + w * fx, anchor.y + h * fy];
}

/**
 * Returns a new document where `document.anchors` take the bound positions and
 * every element with `layout.anchor` follows its anchor. Elements keep their
 * authored offset from the declared anchor (shifted by bound minus declared
 * point); `line`/`arrow` elements with `endpoint` pin just that end. Anchors
 * without a binding keep their declared position. Pure: the input is not mutated.
 *
 * Throws {@link ElucimAnchorError} for bindings to undeclared anchors or invalid boxes.
 */
export function bindAnchors(doc: ElucimDocument, bindings: ElucimAnchorBindings): ElucimDocument {
  const declared = doc.anchors ?? {};
  const scale = sourceScale(doc, bindings.source);
  const bound: Record<string, ElucimAnchor> = { ...declared };

  for (const [id, box] of Object.entries(bindings.anchors ?? {})) {
    const path = `anchors.${id}`;
    if (!declared[id]) {
      const known = Object.keys(declared);
      throw new ElucimAnchorError('unknown-anchor', path, `Binding for unknown anchor "${id}". Declared anchors: ${known.length ? known.join(', ') : '(none)'}.`);
    }
    const width = box.width ?? box.w;
    const height = box.height ?? box.h;
    for (const [key, value] of [['x', box.x], ['y', box.y], ['width', width], ['height', height]] as const) {
      if (value === undefined && (key === 'width' || key === 'height')) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || ((key === 'width' || key === 'height') && value < 0)) {
        throw new ElucimAnchorError('invalid-box', `${path}.${key}`, `Anchor "${id}" ${key} must be a finite${key === 'x' || key === 'y' ? '' : ' non-negative'} number, got ${String(value)}.`);
      }
    }
    bound[id] = {
      ...declared[id],
      x: box.x * scale[0],
      y: box.y * scale[1],
      ...(width !== undefined ? { width: width * scale[0] } : {}),
      ...(height !== undefined ? { height: height * scale[1] } : {}),
    };
  }

  const elements: Record<string, ElucimElement> = { ...doc.elements };
  const shifts = new Map<string, [number, number]>();
  const shift = (id: string, dx: number, dy: number): boolean => {
    const shifted = shiftElement(elements[id], dx, dy);
    if (!shifted) return false;
    elements[id] = shifted;
    const previous = shifts.get(id) ?? [0, 0];
    shifts.set(id, [previous[0] + dx, previous[1] + dy]);
    return true;
  };
  const pins: Array<{ id: string; end: [number, number]; endpoint: 'start' | 'end' }> = [];

  for (const [id, element] of Object.entries(doc.elements)) {
    const ref = element.layout?.anchor;
    const from = ref ? declared[ref.id] : undefined;
    const to = ref ? bound[ref.id] : undefined;
    if (!ref || !from || !to || from === to) continue;
    const start = anchorPoint(from, ref.point);
    const end = anchorPoint(to, ref.point);
    if (ref.endpoint) {
      pins.push({ id, end, endpoint: ref.endpoint });
      continue;
    }
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    if (shift(id, dx, dy)) continue;
    // Groups and other containers have no own geometry: move their descendants.
    // (A base layout.translate would be replaced by any translate track.)
    // Descendants with their own full anchor are positioned by it instead.
    const descendants = collectDescendants(doc, id);
    if (descendants.length === 0) {
      throw new ElucimAnchorError('unsupported-element', `elements.${id}.layout.anchor`, `Element "${id}" follows anchor "${ref.id}" but has no position props (x/y, cx/cy, x1/y1, from/to, points, layout.x/y) or children to move.`);
    }
    for (const childId of descendants) shift(childId, dx, dy);
  }
  // Endpoints pin last so a pinned arrow inside a moved group keeps its other end with the group.
  for (const { id, end, endpoint } of pins) elements[id] = pinEndpoint(elements[id], end, endpoint);

  return { ...doc, anchors: bound, elements, ...shiftTimelines(doc, elements, shifts) };
}

/** Absolute-position tracks (`x`, point `from`/`to`) on moved elements must move too, or they override the binding. */
function shiftTimelines(
  doc: ElucimDocument,
  elements: Record<string, ElucimElement>,
  shifts: Map<string, [number, number]>,
): Pick<ElucimDocument, 'timelines'> | Record<string, never> {
  if (!doc.timelines || shifts.size === 0) return {};
  const timelines: NonNullable<ElucimDocument['timelines']> = {};
  for (const [timelineId, timeline] of Object.entries(doc.timelines)) {
    timelines[timelineId] = {
      ...timeline,
      tracks: timeline.tracks.map(track => {
        const delta = shifts.get(track.target);
        const props = elements[track.target]?.props ?? {};
        if (!delta) return track;
        if (track.property === 'x' && isNumber(props.x)) {
          return { ...track, keyframes: track.keyframes.map(k => (isNumber(k.value) ? { ...k, value: round(k.value + delta[0]) } : k)) };
        }
        if ((track.property === 'from' || track.property === 'to') && isPoint(props[track.property])) {
          return {
            ...track,
            keyframes: track.keyframes.map(k => (isPoint(k.value) ? { ...k, value: [round(k.value[0] + delta[0]), round(k.value[1] + delta[1])] } : k)),
          };
        }
        return track;
      }),
    };
  }
  return { timelines };
}

function collectDescendants(doc: ElucimDocument, id: string, seen = new Set<string>()): string[] {
  const out: string[] = [];
  for (const childId of doc.elements[id]?.children ?? []) {
    const child = doc.elements[childId];
    if (seen.has(childId) || !child) continue;
    seen.add(childId);
    const ownAnchor = child.layout?.anchor;
    if (ownAnchor && !ownAnchor.endpoint && doc.anchors?.[ownAnchor.id]) continue;
    out.push(childId, ...collectDescendants(doc, childId, seen));
  }
  return out;
}

function sourceScale(doc: ElucimDocument, source: ElucimAnchorBindings['source']): [number, number] {
  if (!source) return [1, 1];
  const sceneWidth = doc.scene.width ?? 800;
  const sceneHeight = doc.scene.height ?? 600;
  if (!(source.width > 0) || !(source.height > 0)) {
    throw new ElucimAnchorError('invalid-source', 'source', `source width and height must be positive numbers, got ${source.width}x${source.height}.`);
  }
  return [sceneWidth / source.width, sceneHeight / source.height];
}

function pinEndpoint(element: ElucimElement, to: [number, number], endpoint: 'start' | 'end'): ElucimElement {
  const props = { ...element.props };
  const [kx, ky] = endpoint === 'start' ? ['x1', 'y1'] : ['x2', 'y2'];
  if (!isNumber(props[kx]) || !isNumber(props[ky])) {
    throw new ElucimAnchorError('unsupported-endpoint', `elements.${element.id}.layout.anchor.endpoint`, `Element "${element.id}" uses anchor endpoint "${endpoint}" but has no numeric ${kx}/${ky} props.`);
  }
  props[kx] = round(to[0]);
  props[ky] = round(to[1]);
  return { ...element, props };
}

/** Shifts own geometry by (dx, dy); returns undefined when the element has none. */
function shiftElement(element: ElucimElement, dx: number, dy: number): ElucimElement | undefined {
  const props = { ...element.props };
  let moved = false;
  for (const [kx, ky] of [['x', 'y'], ['cx', 'cy'], ['x1', 'y1'], ['x2', 'y2'], ['x3', 'y3']]) {
    if (isNumber(props[kx])) { props[kx] = round(props[kx] + dx); moved = true; }
    if (isNumber(props[ky])) { props[ky] = round(props[ky] + dy); moved = true; }
  }
  for (const key of ['from', 'to', 'origin']) {
    const point = props[key];
    if (isPoint(point)) { props[key] = [round(point[0] + dx), round(point[1] + dy)]; moved = true; }
  }
  if (Array.isArray(props.points) && props.points.every(isPoint)) {
    props.points = (props.points as [number, number][]).map(([x, y]) => [round(x + dx), round(y + dy)]);
    moved = true;
  }
  const layout = { ...element.layout };
  if (isNumber(layout.x)) { layout.x = round(layout.x + dx); moved = true; }
  if (isNumber(layout.y)) { layout.y = round(layout.y + dy); moved = true; }
  return moved ? { ...element, props, layout } : undefined;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && isNumber(value[0]) && isNumber(value[1]);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
