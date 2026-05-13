import type { ElucimTimeline } from '@elucim/dsl';
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
  onRenameClip,
  onUpdateDuration,
  onUpdateTrack,
  onUpdateKeyframe,
  onDeleteKeyframe,
}: {
  clip?: ElucimTimeline;
  track?: TimelineTrack;
  keyframe?: TimelineKeyframe;
  selectedItem: SelectedTimelineItem | null;
  elementIds: string[];
  onRenameClip?: (clip: ElucimTimeline, nextId: string) => void;
  onUpdateDuration: (clip: ElucimTimeline, duration: number) => void;
  onUpdateTrack: (clip: ElucimTimeline, trackIndex: number, patch: Partial<TimelineTrack>) => void;
  onUpdateKeyframe: (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number, patch: { frame?: number; value?: unknown }) => void;
  onDeleteKeyframe: (clip: ElucimTimeline, trackIndex: number, keyframeIndex: number) => void;
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
    const nextValue = parseKeyframeValue(value);
    if (nextValue !== keyframe.value) onUpdateKeyframe(clip, selectedItem.trackIndex, selectedItem.keyframeIndex, { value: nextValue });
  };
  const commitDuration = (value: string) => {
    if (value.trim() === '') return;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric !== clip.duration) onUpdateDuration(clip, numeric);
  };
  return (
    <aside style={motionInspectorPanelStyle}>
      <div>
        <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Animation details</div>
        <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{clip.id}</div>
        <div style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>{clip.tracks.length} track{clip.tracks.length === 1 ? '' : 's'}</div>
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
              {ANIMATABLE_PROPERTIES.map(property => <option key={property} value={property}>{property}</option>)}
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
