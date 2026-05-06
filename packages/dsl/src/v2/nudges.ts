import type { ElucimV2Command } from './commands';
import { applyCommand } from './commands';
import type { ElucimV2Document } from './types';

export interface ElucimV2Nudge {
  id: string;
  title: string;
  description: string;
  commands: ElucimV2Command[];
  confidence: 'safe' | 'review';
}

export interface ElucimV2NudgeResult {
  document: ElucimV2Document;
  summaries: string[];
}

export function suggestDocumentNudges(doc: ElucimV2Document): ElucimV2Nudge[] {
  const nudges: ElucimV2Nudge[] = [];
  if (doc.metadata?.polishLevel !== 'refined' && doc.metadata?.polishLevel !== 'final') {
    nudges.push({
      id: 'mark-refined',
      title: 'Mark document as refined',
      description: 'Set metadata.polishLevel to refined so hosts can distinguish draft agent output from polished Elucim output.',
      confidence: 'safe',
      commands: [{ op: 'updateMetadata', metadata: { polishLevel: 'refined' } }],
    });
  }

  const rootChildren = doc.scene.children.filter(id => doc.elements[id]);
  const missingZIndex = rootChildren.some((id, index) => doc.elements[id].layout?.zIndex !== index);
  if (missingZIndex && rootChildren.length > 1) {
    nudges.push({
      id: 'normalize-root-layer-order',
      title: 'Normalize root layer order',
      description: 'Assign top-level zIndex values that match scene order for predictable agent patches and editor hierarchy behavior.',
      confidence: 'safe',
      commands: rootChildren.map((id, index) => ({ op: 'updateElement', id, patch: { layout: { zIndex: index } } })),
    });
  }

  if (!doc.timelines || Object.keys(doc.timelines).length === 0) {
    const timeline = buildIntroTimeline(doc, rootChildren);
    if (timeline) {
      nudges.push({
        id: 'add-staggered-intro',
        title: 'Add staggered intro clip',
        description: 'Create a simple opacity timeline for top-level elements so generated slides feel presentation-ready by default.',
        confidence: 'review',
        commands: [{ op: 'upsertTimeline', timeline }],
      });
    }
  }

  return nudges;
}

export function applyNudge(doc: ElucimV2Document, nudge: ElucimV2Nudge): ElucimV2NudgeResult {
  let current = doc;
  const summaries: string[] = [];
  for (const command of nudge.commands) {
    const result = applyCommand(current, command);
    current = result.document;
    summaries.push(result.summary);
  }
  return { document: current, summaries };
}

function buildIntroTimeline(doc: ElucimV2Document, rootChildren: string[]) {
  const targets = rootChildren.slice(0, 8);
  if (targets.length === 0) return undefined;
  const stagger = 6;
  const fadeDuration = 18;
  const duration = Math.min(doc.scene.durationInFrames, Math.max(fadeDuration, (targets.length - 1) * stagger + fadeDuration));
  return {
    id: 'auto-intro',
    duration,
    tracks: targets.map((target, index) => {
      const start = Math.min(index * stagger, Math.max(0, duration - fadeDuration));
      return {
        target,
        property: 'opacity' as const,
        keyframes: [
          { frame: start, value: 0 },
          { frame: Math.min(duration, start + fadeDuration), value: 1, easing: 'easeOutCubic' as const },
        ],
      };
    }),
  };
}
