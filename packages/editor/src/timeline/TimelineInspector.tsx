import type { ElucimRevealEffect, ElucimTimeline } from '@elucim/editor-projection';
import { v } from '../theme/tokens';
import { ANIMATABLE_PROPERTIES } from './constants';
import { parseKeyframeValue } from './keyframeValue';
import { inspectorInputStyle, motionInspectorPanelStyle } from './styles';
import type { SelectedTimelineItem, TimelineKeyframe, TimelineTrack } from './types';

export function TimelineInspector({
  clip,
  track,
  keyframe,
  selectedItem,
  elementIds,
  elementTypes,
  onRenameClip,
  onUpdateDuration,
  onUpdateTrack,
  onUpdateKeyframe,
  onDeleteKeyframe,
  onUpdateEffects,
}: {
  clip?: ElucimTimeline;
  track?: TimelineTrack;
  keyframe?: TimelineKeyframe;
  selectedItem: SelectedTimelineItem | null;
  elementIds: string[];
  elementTypes: Record<string, string>;
  onRenameClip?: (clip: ElucimTimeline, nextId: string) => void;
  onUpdateDuration: (clip: ElucimTimeline, duration: number) => void;
  onUpdateTrack: (clip: ElucimTimeline, trackIndex: number, patch: Partial<TimelineTrack>) => void;
  onUpdateKeyframe: (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number, patch: { frame?: number; value?: unknown }) => void;
  onDeleteKeyframe: (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number) => void;
  onUpdateEffects: (clip: ElucimTimeline, effects: ElucimRevealEffect[]) => void;
}) {
  if (!clip) {
    return <div style={{ ...motionInspectorPanelStyle, color: v('--elucim-editor-text-muted'), fontSize: 11 }}>Select a timeline to edit details.</div>;
  }
  const commitKeyframeFrame = (value: string) => {
    if (!keyframe || selectedItem?.trackIndex === undefined || selectedItem.keyframeIndex === undefined) return;
    if (value.trim() === '') return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const frame = Math.max(0, Math.min(clip.duration, Math.round(numeric)));
    if (frame !== keyframe.frame) onUpdateKeyframe(clip, selectedItem.trackIndex, selectedItem.keyframeIndex, { frame });
  };
  const commitKeyframeValue = (value: string) => {
    if (!keyframe || selectedItem?.trackIndex === undefined || selectedItem.keyframeIndex === undefined) return;
    const nextValue = track?.property === 'content' ? value : parseKeyframeValue(value);
    if (nextValue !== keyframe.value) onUpdateKeyframe(clip, selectedItem.trackIndex, selectedItem.keyframeIndex, { value: nextValue });
  };
  const commitDuration = (value: string) => {
    if (value.trim() === '') return;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric !== clip.duration) onUpdateDuration(clip, numeric);
  };
  const effects = clip.effects ?? [];
  const updateEffect = (effectIndex: number, patch: Partial<ElucimRevealEffect>) => {
    onUpdateEffects(clip, effects.map((effect, index) => index === effectIndex ? { ...effect, ...patch } : effect));
  };
  const updateEffectNumber = (effectIndex: number, field: 'from' | 'duration' | 'staggerInFrames', value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const effect = effects[effectIndex];
    if (!effect) return;
    const targetCount = Math.max(1, effect.targets.length);
    const stagger = effect.staggerInFrames ?? 0;
    const maxStart = Math.max(0, clip.duration - effect.duration - stagger * (targetCount - 1));
    const maxDuration = Math.max(1, clip.duration - effect.from - stagger * (targetCount - 1));
    const maxStagger = targetCount === 1
      ? clip.duration
      : Math.max(0, Math.floor((clip.duration - effect.from - effect.duration) / (targetCount - 1)));
    const maximum = field === 'from' ? maxStart : field === 'duration' ? maxDuration : maxStagger;
    updateEffect(effectIndex, { [field]: Math.max(field === 'duration' ? 1 : 0, Math.min(maximum, Math.round(numeric))) });
  };
  const addRevealEffect = () => {
    const existingIds = new Set(effects.map(effect => effect.id));
    let id = 'reveal';
    let suffix = 2;
    while (existingIds.has(id)) id = `reveal-${suffix++}`;
    onUpdateEffects(clip, [...effects, {
      id,
      kind: 'reveal',
      targets: elementIds.length > 0 ? [elementIds[0]] : [],
      from: 0,
      duration: Math.min(30, clip.duration),
      strategy: 'auto',
    }]);
  };
  return (
    <aside style={motionInspectorPanelStyle}>
      <div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Animation details</div>
        <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{clip.id}</div>
        <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>
          {clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'} · {effects.length} reveal{effects.length === 1 ? '' : 's'}
        </div>
      </div>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Name
        <input
          key={clip.id}
          aria-label={`Rename animation ${clip.id}`}
          defaultValue={clip.id}
          onBlur={event => onRenameClip?.(clip, event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          style={inspectorInputStyle}
        />
      </label>
      <div style={{ display: 'grid', gap: 6, paddingTop: 6, borderTop: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Reveal effects</div>
        {effects.map((effect, effectIndex) => {
          const cursor = typeof effect.cursor === 'object' ? effect.cursor : undefined;
          const canTypeTargets = effect.targets.length > 0 && effect.targets.every(target => elementTypes[target] === 'text');
          return (
            <div key={effect.id} style={{ display: 'grid', gap: 5, padding: 6, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 4 }}>
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Effect ID
                <input
                  aria-label={`${clip.id} reveal ${effectIndex + 1} ID`}
                  value={effect.id}
                  onChange={event => updateEffect(effectIndex, { id: event.target.value })}
                  style={inspectorInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Targets
                <input
                  aria-label={`${clip.id} reveal ${effectIndex + 1} targets`}
                  value={effect.targets.join(', ')}
                  onChange={event => updateEffect(effectIndex, {
                    targets: event.target.value.split(',').map(value => value.trim()).filter(Boolean),
                  })}
                  style={inspectorInputStyle}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                  Start
                  <input
                    aria-label={`${clip.id} reveal ${effectIndex + 1} start`}
                    type="number"
                    min={0}
                    max={clip.duration}
                    value={effect.from}
                    onChange={event => updateEffectNumber(effectIndex, 'from', event.target.value)}
                    style={inspectorInputStyle}
                  />
                </label>
                <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                  Duration
                  <input
                    aria-label={`${clip.id} reveal ${effectIndex + 1} duration`}
                    type="number"
                    min={1}
                    max={clip.duration}
                    value={effect.duration}
                    onChange={event => updateEffectNumber(effectIndex, 'duration', event.target.value)}
                    style={inspectorInputStyle}
                  />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Strategy
                <select
                  aria-label={`${clip.id} reveal ${effectIndex + 1} strategy`}
                  value={effect.strategy ?? 'auto'}
                  onChange={event => updateEffect(effectIndex, { strategy: event.target.value as ElucimRevealEffect['strategy'] })}
                  style={inspectorInputStyle}
                >
                  <option value="auto">Auto</option>
                  {canTypeTargets && <option value="type">Type text</option>}
                  <option value="fade">Fade</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Stagger
                <input
                  aria-label={`${clip.id} reveal ${effectIndex + 1} stagger`}
                  type="number"
                  min={0}
                  value={effect.staggerInFrames ?? 0}
                  onChange={event => updateEffectNumber(effectIndex, 'staggerInFrames', event.target.value)}
                  style={inspectorInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                Cursor
                <select
                  aria-label={`${clip.id} reveal ${effectIndex + 1} cursor`}
                  value={effect.cursor === false ? 'off' : 'on'}
                  onChange={event => updateEffect(effectIndex, { cursor: event.target.value === 'on' ? (cursor ?? true) : false })}
                  style={inspectorInputStyle}
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </label>
              {effect.cursor !== false && (
                <>
                  <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                    Cursor character
                    <input
                      aria-label={`${clip.id} reveal ${effectIndex + 1} cursor character`}
                      value={cursor?.character ?? ''}
                      onChange={event => updateEffect(effectIndex, { cursor: { ...cursor, character: event.target.value || undefined } })}
                      style={inspectorInputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                    Cursor blink
                    <input
                      aria-label={`${clip.id} reveal ${effectIndex + 1} cursor blink`}
                      type="number"
                      min={1}
                      value={cursor?.blinkEveryFrames ?? ''}
                      onChange={event => {
                        const value = event.target.value === '' ? undefined : Math.max(1, Math.round(Number(event.target.value)));
                        updateEffect(effectIndex, { cursor: { ...cursor, blinkEveryFrames: value } });
                      }}
                      style={inspectorInputStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
                    Hide cursor
                    <select
                      aria-label={`${clip.id} reveal ${effectIndex + 1} hide cursor`}
                      value={cursor?.hideWhenComplete === false ? 'no' : 'yes'}
                      onChange={event => updateEffect(effectIndex, {
                        cursor: { ...cursor, hideWhenComplete: event.target.value === 'yes' },
                      })}
                      style={inspectorInputStyle}
                    >
                      <option value="yes">After reveal</option>
                      <option value="no">Never</option>
                    </select>
                  </label>
                </>
              )}
              <button
                type="button"
                aria-label={`Remove ${clip.id} reveal ${effectIndex + 1}`}
                onClick={() => onUpdateEffects(clip, effects.filter((_, index) => index !== effectIndex))}
                style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
              >
                Remove reveal
              </button>
            </div>
          );
        })}
        <button
          type="button"
          aria-label={`Add reveal to ${clip.id}`}
          onClick={addRevealEffect}
          disabled={elementIds.length === 0}
          style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-fg'), cursor: elementIds.length ? 'pointer' : 'not-allowed', padding: '4px 6px', textAlign: 'left' }}
        >
          Add reveal
        </button>
      </div>
      <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
        Duration
        <input
          key={`${clip.id}-${clip.duration}-duration`}
          aria-label={`Animation ${clip.id} duration`}
          type="number"
          min={1}
          defaultValue={clip.duration}
          onBlur={event => commitDuration(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              event.currentTarget.value = String(clip.duration);
              event.currentTarget.blur();
            }
          }}
          style={inspectorInputStyle}
        />
      </label>
      {track && selectedItem?.trackIndex !== undefined && (
        <>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Target
            <select
              aria-label={`${clip.id} track ${selectedItem.trackIndex + 1} target`}
              value={track.target}
              onChange={event => onUpdateTrack(clip, selectedItem.trackIndex!, { target: event.target.value })}
              style={inspectorInputStyle}
            >
              {elementIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Property
            <select
              aria-label={`${clip.id} track ${selectedItem.trackIndex + 1} property`}
              value={track.property}
              onChange={event => onUpdateTrack(clip, selectedItem.trackIndex!, { property: event.target.value as TimelineTrack['property'] })}
              style={inspectorInputStyle}
            >
              {ANIMATABLE_PROPERTIES
                .filter(property => property !== 'content' || elementTypes[track.target] === 'text')
                .map(property => <option key={property} value={property}>{property}</option>)}
            </select>
          </label>
        </>
      )}
      {keyframe && selectedItem?.trackIndex !== undefined && selectedItem.keyframeIndex !== undefined && (
        <div style={{ display: 'grid', gap: 6, paddingTop: 6, borderTop: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Keyframe</div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Frame
            <input
              key={`${clip.id}-${selectedItem.trackIndex}-${selectedItem.keyframeIndex}-${keyframe.frame}-frame`}
              aria-label={`${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1} frame`}
              type="number"
              min={0}
              max={clip.duration}
              defaultValue={keyframe.frame}
              onBlur={event => commitKeyframeFrame(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.currentTarget.value = String(keyframe.frame);
                  event.currentTarget.blur();
                }
              }}
              style={inspectorInputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Value
            <input
              key={`${clip.id}-${selectedItem.trackIndex}-${selectedItem.keyframeIndex}-${String(keyframe.value)}-value`}
              aria-label={`${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1} value`}
              defaultValue={String(keyframe.value)}
              onBlur={event => commitKeyframeValue(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.currentTarget.value = String(keyframe.value);
                  event.currentTarget.blur();
                }
              }}
              style={inspectorInputStyle}
            />
          </label>
          <button
            type="button"
            aria-label={`Remove ${clip.id} ${track?.target}.${track?.property} keyframe ${selectedItem.keyframeIndex + 1}`}
            onClick={() => onDeleteKeyframe(clip, selectedItem.trackIndex!, selectedItem.keyframeIndex!)}
            style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer', padding: '4px 6px', textAlign: 'left' }}
          >
            Remove keyframe
          </button>
        </div>
      )}
      {!track && <div style={{ color: v('--elucim-editor-text-muted'), lineHeight: 1.4 }}>Select a track row to edit its target and property. Select a diamond keyframe to edit frame/value.</div>}
    </aside>
  );
}
