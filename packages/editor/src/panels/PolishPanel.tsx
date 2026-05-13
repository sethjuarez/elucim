import { useEffect, useMemo, useState } from 'react';
import type { ElucimDocument, ElucimDocumentNudge } from '@elucim/dsl';
import { analyzePolish, applyNudge, suggestDocumentNudges, suggestSemanticLayoutNudges } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { findElementById } from '../state/reducer';
import { CANVAS_ID } from '../state/types';
import { v } from '../theme/tokens';

export function PolishPanel({ document, onDocumentChange }: { document?: ElucimDocument; onDocumentChange?: (document: ElucimDocument) => void }) {
  const { state } = useEditorState();
  const selectedId = state.selectedIds.length === 1 && state.selectedIds[0] !== CANVAS_ID ? state.selectedIds[0] : null;
  const selected = selectedId ? findElementById(state.document.root, selectedId)?.element : null;
  const selectedLabel = selectedId && selected ? (('id' in selected && selected.id) ? selected.id : selectedId) : null;
  const currentDocument = state.canonicalDocument ?? document;
  const selectedDocumentElement = selectedId && currentDocument ? currentDocument.elements[selectedId] : undefined;
  const machineIds = Object.keys(currentDocument?.stateMachines ?? {});
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<Set<string>>(() => new Set());
  const [semanticLayoutNudges, setSemanticLayoutNudges] = useState<ElucimDocumentNudge[]>([]);
  const [semanticLayoutError, setSemanticLayoutError] = useState<string | null>(null);
  const [semanticLayoutLoading, setSemanticLayoutLoading] = useState(false);
  const [nudgeResult, setNudgeResult] = useState<{
    title: string;
    summaries: string[];
    affectedAreas: string[];
    confidence: ElucimDocumentNudge['confidence'];
    commandCount: number;
    previewSummaries: string[];
    error?: string;
  } | null>(null);
  const documentNudges = useMemo(() => currentDocument
    ? suggestDocumentNudges(currentDocument)
    : [], [currentDocument]);
  useEffect(() => {
    if (!currentDocument) {
      setSemanticLayoutNudges([]);
      setSemanticLayoutError(null);
      setSemanticLayoutLoading(false);
      return;
    }
    let cancelled = false;
    setSemanticLayoutLoading(true);
    setSemanticLayoutError(null);
    suggestSemanticLayoutNudges(currentDocument)
      .then(nudges => {
        if (cancelled) return;
        setSemanticLayoutNudges(nudges);
      })
      .catch(error => {
        if (cancelled) return;
        setSemanticLayoutNudges([]);
        setSemanticLayoutError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setSemanticLayoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentDocument]);
  const nudgeCandidates = useMemo(() => currentDocument
    ? [...documentNudges, ...semanticLayoutNudges].filter(nudge => !dismissedNudgeIds.has(nudge.id))
    : [], [currentDocument, dismissedNudgeIds, documentNudges, semanticLayoutNudges]);
  const polishReport = useMemo(() => currentDocument ? analyzePolish(currentDocument) : undefined, [currentDocument]);
  const nudgePreviews = useMemo(() => {
    if (!currentDocument) return new Map<string, string[]>();
    const entries: Array<[string, string[]]> = nudgeCandidates.map(nudge => {
      try {
        return [nudge.id, applyNudge(currentDocument, nudge).summaries];
      } catch (error) {
        return [nudge.id, [`Cannot preview nudge: ${error instanceof Error ? error.message : String(error)}`]];
      }
    });
    return new Map(entries);
  }, [currentDocument, nudgeCandidates]);
  const updateDocument = (updater: (document: ElucimDocument) => ElucimDocument) => {
    const baseDocument = currentDocument;
    if (!baseDocument) return;
    onDocumentChange?.(updater(baseDocument));
  };

  const updateMetadata = (changes: NonNullable<ElucimDocument['metadata']>) => {
    updateDocument(nextDocument => ({
      ...nextDocument,
      metadata: { ...nextDocument.metadata, ...changes },
    }));
  };

  const updateSelectedIntent = (changes: NonNullable<NonNullable<ElucimDocument['elements'][string]>['intent']>) => {
    if (!selectedId) return;
    updateDocument(nextDocument => ({
      ...nextDocument,
      elements: {
        ...nextDocument.elements,
        [selectedId]: {
          ...nextDocument.elements[selectedId],
          intent: { ...nextDocument.elements[selectedId]?.intent, ...changes },
        },
      },
    }));
  };

  const applyEditorNudge = (nudgeId: string) => {
    const baseDocument = currentDocument;
    const nudge = nudgeCandidates.find(candidate => candidate.id === nudgeId);
    if (!baseDocument || !nudge) return;
    const affectedAreas = summarizeAffectedAreas(nudge);
    const previewSummaries = nudgePreviews.get(nudge.id) ?? [];
    try {
      const result = applyNudge(baseDocument, nudge);
      onDocumentChange?.(result.document);
      setNudgeResult({ title: nudge.title, summaries: result.summaries, affectedAreas, confidence: nudge.confidence, commandCount: nudge.commands.length, previewSummaries });
      setDismissedNudgeIds(previous => new Set(previous).add(nudge.id));
    } catch (error) {
      setNudgeResult({ title: nudge.title, summaries: [], affectedAreas, confidence: nudge.confidence, commandCount: nudge.commands.length, previewSummaries, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const dismissEditorNudge = (nudgeId: string) => {
    setDismissedNudgeIds(previous => new Set(previous).add(nudgeId));
  };

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
      <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.45 }}>
        Polish is for scene metadata, selected-element intent, suggestions, and document diagnostics. Use the State machines motion tab to author interactive state graphs.
      </div>

      {nudgeResult && (
        <div
          role="status"
          style={{
            padding: 8,
            border: `1px solid ${nudgeResult.error ? v('--elucim-editor-warning') : v('--elucim-editor-success')}`,
            borderRadius: 6,
            background: `color-mix(in srgb, ${nudgeResult.error ? v('--elucim-editor-warning') : v('--elucim-editor-success')} 10%, transparent)`,
            color: nudgeResult.error ? v('--elucim-editor-warning') : v('--elucim-editor-text-secondary'),
            display: 'grid',
            gap: 4,
            lineHeight: 1.35,
          }}
        >
          <div style={{ color: nudgeResult.error ? v('--elucim-editor-warning') : v('--elucim-editor-fg'), fontWeight: 700 }}>
            {nudgeResult.error ? `Could not apply ${nudgeResult.title}` : `Applied ${nudgeResult.title}`}
          </div>
          {nudgeResult.error ? (
            <div>{nudgeResult.error}</div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 2 }}>
                <div><strong>Impact:</strong> {formatAffectedAreas(nudgeResult.affectedAreas)}</div>
                <div><strong>Confidence:</strong> {nudgeResult.confidence === 'safe' ? 'Safe' : 'Review before publishing'} · {nudgeResult.commandCount} change{nudgeResult.commandCount === 1 ? '' : 's'}</div>
              </div>
              <div style={{ color: v('--elucim-editor-text-muted') }}>
                Result is visible in {formatAffectedAreas(nudgeResult.affectedAreas)}.
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {nudgeResult.summaries.map((summary, index) => <li key={index}>{summary}</li>)}
              </ul>
              {nudgeResult.previewSummaries.length > 0 && (
                <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10 }}>
                  Matched preview: {nudgeResult.previewSummaries.join(' ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {currentDocument && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Motion
          </div>
          <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.4 }}>
            {machineIds.length === 0
              ? 'No state machines yet. Open the State machines motion tab and use Add state machine to create one.'
              : `${machineIds.length} state machine${machineIds.length === 1 ? '' : 's'} in this scene. Open the State machines motion tab to edit the graph, states, and transitions.`}
          </div>
        </div>
      )}

      {currentDocument && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Scene metadata
          </div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Polish level
            <select
              aria-label="Polish level"
              value={currentDocument.metadata?.polishLevel ?? 'draft'}
              onChange={event => updateMetadata({ polishLevel: event.target.value as NonNullable<ElucimDocument['metadata']>['polishLevel'] })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              <option value="draft">draft</option>
              <option value="refined">refined</option>
              <option value="final">final</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Intent
            <input
              aria-label="Document intent"
              value={currentDocument.metadata?.intent ?? ''}
              onChange={event => updateMetadata({ intent: event.target.value })}
              placeholder="What this visual should communicate"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Generated/source
            <input
              aria-label="Generated by"
              value={currentDocument.metadata?.generatedBy ?? ''}
              onChange={event => updateMetadata({ generatedBy: event.target.value })}
              placeholder="Designer, user, agent name"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Notes
            <textarea
              aria-label="Document notes"
              value={(currentDocument.metadata?.notes ?? []).join('\n')}
              onChange={event => updateMetadata({ notes: event.target.value.split('\n').map(note => note.trim()).filter(Boolean) })}
              placeholder="One note per line"
              rows={3}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
        </div>
      )}

      {currentDocument && polishReport && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Polish score
            </div>
            <strong style={{ color: polishReport.score.overall >= 85 ? v('--elucim-editor-success') : v('--elucim-editor-warning') }}>
              {polishReport.score.overall}
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>
            <span>Layout {polishReport.score.layout}</span>
            <span>Hierarchy {polishReport.score.hierarchy}</span>
            <span>Readability {polishReport.score.readability}</span>
            <span>Graph {polishReport.score.graph}</span>
            <span>Structure {polishReport.score.structure}</span>
            <span>Motion {polishReport.score.motion}</span>
          </div>
          {polishReport.diagnostics.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
              {polishReport.diagnostics.slice(0, 5).map(diagnostic => (
                <li key={diagnostic.id}>
                  <strong>{diagnostic.category}</strong>: {diagnostic.message}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.4 }}>
              No polish diagnostics found.
            </div>
          )}
          {semanticLayoutLoading && (
            <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, lineHeight: 1.35 }}>
              Checking semantic layout relationships...
            </div>
          )}
          {semanticLayoutError && (
            <div style={{ color: v('--elucim-editor-warning'), fontSize: 10, lineHeight: 1.35 }}>
              Semantic layout unavailable: {semanticLayoutError}
            </div>
          )}
        </div>
      )}

      {currentDocument && nudgeCandidates.length > 0 && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Polish suggestions
          </div>
          {nudgeCandidates.map(nudge => (
            <div key={nudge.id} style={{ display: 'grid', gap: 4, padding: 6, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: v('--elucim-editor-fg') }}>{nudge.title}</strong>
                <span style={{ color: nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning') }}>
                  {nudge.category ? `${nudge.category} / ` : ''}{nudge.confidence}
                </span>
              </div>
              <div style={{ color: v('--elucim-editor-text-secondary'), lineHeight: 1.35 }}>{nudge.description}</div>
              <div style={{ display: 'grid', gap: 2, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
                <span><strong>Impact:</strong> {formatAffectedAreas(summarizeAffectedAreas(nudge))}</span>
                <span><strong>Review level:</strong> {nudge.confidence === 'safe' ? 'Safe deterministic change' : 'Review the result after applying'} · {nudge.commands.length} change{nudge.commands.length === 1 ? '' : 's'}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-muted'), fontSize: 10, lineHeight: 1.35 }}>
                {nudge.commands.map((command, index) => <li key={index}>{summarizeNudgeCommand(command)}</li>)}
              </ul>
              {(nudgePreviews.get(nudge.id)?.length ?? 0) > 0 && (
                <div style={{ borderTop: `1px solid ${v('--elucim-editor-border-subtle')}`, paddingTop: 4 }}>
                  <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, fontWeight: 700, marginBottom: 2 }}>
                    What will change
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: v('--elucim-editor-text-secondary'), fontSize: 10, lineHeight: 1.35 }}>
                    {nudgePreviews.get(nudge.id)?.map((summary, index) => <li key={index}>{summary}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  aria-label={`Apply nudge ${nudge.title}`}
                  onClick={() => applyEditorNudge(nudge.id)}
                  style={{ flex: 1, border: `1px solid ${nudge.confidence === 'safe' ? v('--elucim-editor-success') : v('--elucim-editor-warning')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-fg'), cursor: 'pointer', textAlign: 'left' }}
                >
                  Apply {nudge.confidence === 'safe' ? 'safe nudge' : 'review nudge'}
                </button>
                <button
                  type="button"
                  aria-label={`Dismiss nudge ${nudge.title}`}
                  onClick={() => dismissEditorNudge(nudge.id)}
                  style={{ border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: '4px 6px', background: 'transparent', color: v('--elucim-editor-text-secondary'), cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentDocument && selectedDocumentElement && (
        <div style={{ padding: 8, border: `1px solid ${v('--elucim-editor-border-subtle')}`, borderRadius: 6, background: v('--elucim-editor-input-bg'), display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: v('--elucim-editor-text-muted'), fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Selected intent
          </div>
          <div style={{ color: v('--elucim-editor-fg'), fontWeight: 700 }}>{selectedId}</div>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Role
            <input
              aria-label="Selected role"
              value={selectedDocumentElement.intent?.role ?? ''}
              onChange={event => updateSelectedIntent({ role: event.target.value })}
              placeholder="title, hero, stage-1, cta"
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Importance
            <select
              aria-label="Selected importance"
              value={selectedDocumentElement.intent?.importance ?? 'supporting'}
              onChange={event => updateSelectedIntent({ importance: event.target.value as NonNullable<typeof selectedDocumentElement.intent>['importance'] })}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4 }}
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
              <option value="supporting">supporting</option>
              <option value="decorative">decorative</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: v('--elucim-editor-text-secondary') }}>
            <input
              aria-label="Selected generated"
              type="checkbox"
              checked={selectedDocumentElement.intent?.generated ?? false}
              onChange={event => updateSelectedIntent({ generated: event.target.checked })}
            />
            Generated by agent
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Description
            <textarea
              aria-label="Selected description"
              value={selectedDocumentElement.intent?.description ?? ''}
              onChange={event => updateSelectedIntent({ description: event.target.value })}
              rows={2}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 3, color: v('--elucim-editor-text-secondary') }}>
            Hints
            <textarea
              aria-label="Selected hints"
              value={(selectedDocumentElement.intent?.hints ?? []).join('\n')}
              onChange={event => updateSelectedIntent({ hints: event.target.value.split('\n').map(hint => hint.trim()).filter(Boolean) })}
              placeholder="One hint per line"
              rows={3}
              style={{ background: v('--elucim-editor-surface'), color: v('--elucim-editor-fg'), border: `1px solid ${v('--elucim-editor-border')}`, borderRadius: 4, padding: 4, resize: 'vertical' }}
            />
          </label>
        </div>
      )}

      {state.compatibilityWarnings.length > 0 && (
        <div role="status" style={{ padding: 8, border: `1px solid ${v('--elucim-editor-warning')}`, borderRadius: 6, background: `color-mix(in srgb, ${v('--elucim-editor-warning')} 10%, transparent)`, color: v('--elucim-editor-warning'), lineHeight: 1.4 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Document compatibility warnings</div>
          {state.compatibilityWarnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      )}

      <div style={{ color: v('--elucim-editor-text-muted'), lineHeight: 1.45 }}>
        Selected element: {selectedLabel ?? 'none'}. Use timeline-backed nudges or the State machines motion tab for motion.
      </div>
    </div>
  );
}

function summarizeAffectedAreas(nudge: ElucimDocumentNudge): string[] {
  const areas = new Set<string>();
  for (const command of nudge.commands) {
    areas.add(commandAffectedArea(command));
  }
  return Array.from(areas);
}

function commandAffectedArea(command: ElucimDocumentNudge['commands'][number]): string {
  switch (command.op) {
    case 'updateMetadata':
      return 'Scene metadata';
    case 'addElement':
      return `Object "${command.element.id}"`;
    case 'updateElement':
    case 'deleteElement':
    case 'moveElement':
    case 'reorderElement':
    case 'reparentElement':
      return `Object "${command.id}"`;
    case 'upsertTimeline':
      return `Timeline "${command.timeline.id}"`;
    case 'deleteTimeline':
      return `Timeline "${command.id}"`;
    case 'applyTimelineFrame':
      return `Timeline "${command.timelineId}"`;
    default: {
      const exhaustiveCommand: never = command;
      return String(exhaustiveCommand);
    }
  }
}

function formatAffectedAreas(areas: string[]): string {
  if (areas.length === 0) return 'the document';
  if (areas.length <= 3) return areas.join(', ');
  return `${areas.slice(0, 3).join(', ')} and ${areas.length - 3} more`;
}

function summarizeNudgeCommand(command: ElucimDocumentNudge['commands'][number]): string {
  switch (command.op) {
    case 'updateMetadata':
      return `Update metadata: ${Object.keys(command.metadata ?? {}).join(', ')}`;
    case 'updateElement':
      return `Update ${command.id}: ${Object.keys(command.patch).join(', ')}`;
    case 'upsertTimeline':
      return `Upsert timeline "${command.timeline.id}" with ${command.timeline.tracks.length} track${command.timeline.tracks.length === 1 ? '' : 's'}`;
    case 'deleteTimeline':
      return `Delete timeline "${command.id}"`;
    case 'addElement':
      return `Add element "${command.element.id}"`;
    case 'deleteElement':
      return `Delete element "${command.id}"`;
    case 'moveElement':
      return `Move element "${command.id}"`;
    case 'reorderElement':
      return `Reorder element "${command.id}" to sibling index ${command.index}`;
    case 'reparentElement':
      return `Reparent element "${command.id}"`;
    case 'applyTimelineFrame':
      return `Preview timeline "${command.timelineId}" at frame ${command.frame}`;
    default: {
      const exhaustiveCommand: never = command;
      return `Unknown command: ${String(exhaustiveCommand)}`;
    }
  }
}
