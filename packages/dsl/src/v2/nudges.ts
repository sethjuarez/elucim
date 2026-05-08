import type { ElucimV2Command } from './commands';
import { applyCommand } from './commands';
import { getDocumentLinearDuration } from './duration';
import type { ElucimV2Document } from './types';
import { analyzePolish, getSmoothConnectorCandidates, graphNeedsLayout, layoutGraphElementLayered, POLISH_MIN_TEXT_SIZE, POLISH_TARGET_TITLE_SIZE, type ElucimPolishCategory } from './polish';

export interface ElucimDocumentNudge {
  id: string;
  title: string;
  description: string;
  commands: ElucimV2Command[];
  confidence: 'safe' | 'review';
  category?: ElucimPolishCategory;
}

export interface ElucimDocumentNudgeResult {
  document: ElucimV2Document;
  summaries: string[];
}

export function suggestDocumentNudges(doc: ElucimV2Document): ElucimDocumentNudge[] {
  const nudges: ElucimDocumentNudge[] = [];
  if (doc.metadata?.polishLevel !== 'refined' && doc.metadata?.polishLevel !== 'final') {
    nudges.push({
      id: 'mark-refined',
      title: 'Mark document as refined',
      description: 'Set metadata.polishLevel to refined so hosts can distinguish draft agent output from polished Elucim output.',
      confidence: 'safe',
      category: 'structure',
      commands: [{ op: 'updateMetadata', metadata: { polishLevel: 'refined' } }],
    });
  }

  const rootChildren = doc.scene.children.filter(id => doc.elements[id]);

  if (!doc.timelines || Object.keys(doc.timelines).length === 0) {
    const timeline = buildIntroTimeline(doc, rootChildren);
    if (timeline) {
      nudges.push({
        id: 'add-staggered-intro',
        title: 'Add staggered intro clip',
        description: 'Create a simple opacity timeline for top-level elements so generated slides feel presentation-ready by default.',
        confidence: 'review',
        category: 'motion',
        commands: [{ op: 'upsertTimeline', timeline }],
      });
    }
  }
  const report = analyzePolish(doc);
  const safePolish = buildSafePolishNudge(doc);
  if (safePolish && report.diagnostics.some(diagnostic => diagnostic.suggestedNudgeId === safePolish.id)) {
    nudges.push(safePolish);
  }
  const titleNudge = buildTitleHierarchyNudge(doc);
  if (titleNudge && report.diagnostics.some(diagnostic => diagnostic.suggestedNudgeId === titleNudge.id)) {
    nudges.push(titleNudge);
  }
  for (const element of Object.values(doc.elements)) {
    if (!graphNeedsLayout(element)) continue;
    const nextNodes = layoutGraphElementLayered(element);
    if (!nextNodes) continue;
    nudges.push({
      id: `layout-graph-${element.id}`,
      title: `Apply layered layout to ${element.id}`,
      description: 'Use a Mermaid-inspired layered graph layout to reduce crossings, separate nodes, and make flow direction clearer.',
      confidence: 'review',
      category: 'graph',
      commands: [{ op: 'updateElement', id: element.id, patch: { props: { nodes: nextNodes } } }],
    });
  }
  const smoothConnectorCommands = getSmoothConnectorCandidates(doc).map(candidate => {
    const element = doc.elements[candidate.id];
    const { lineStyle, ...curve } = candidate.suggestedCurve;
    return {
      op: 'updateElement' as const,
      id: candidate.id,
      patch: {
        type: 'bezierCurve',
        props: {
          ...element.props,
          type: 'bezierCurve',
          ...curve,
          ...(lineStyle ? { lineStyle } : {}),
        },
      },
    };
  });
  if (smoothConnectorCommands.length > 0) {
    nudges.push({
      id: 'smooth-connector-continuations',
      title: 'Smooth connector continuations',
      description: 'Convert straight line and arrow connectors into editable Bezier curves with rounded caps so flow direction reads more smoothly.',
      confidence: 'review',
      category: 'layout',
      commands: smoothConnectorCommands,
    });
  }

  return nudges;
}

export function applyNudge(doc: ElucimV2Document, nudge: ElucimDocumentNudge): ElucimDocumentNudgeResult {
  let current = doc;
  const summaries: string[] = [];
  for (const command of nudge.commands) {
    const result = applyCommand(current, command);
    current = result.document;
    summaries.push(result.summary);
  }
  return { document: current, summaries };
}

function buildSafePolishNudge(doc: ElucimV2Document): ElucimDocumentNudge | undefined {
  const commands: ElucimV2Command[] = [];
  for (const element of Object.values(doc.elements)) {
    if ((element.type === 'text' || element.props.type === 'text') && typeof element.props.fontSize === 'number' && element.props.fontSize < POLISH_MIN_TEXT_SIZE) {
      commands.push({ op: 'updateElement', id: element.id, patch: { props: { fontSize: POLISH_MIN_TEXT_SIZE } } });
    }
  }
  if (commands.length === 0) return undefined;
  return {
    id: 'polish-text-readability',
    title: 'Improve safe readability defaults',
    description: 'Apply low-risk readability fixes such as bringing very small labels up to a readable minimum.',
    confidence: 'safe',
    category: 'readability',
    commands,
  };
}

function buildTitleHierarchyNudge(doc: ElucimV2Document): ElucimDocumentNudge | undefined {
  const title = Object.values(doc.elements).find(element => (element.type === 'text' || element.props.type === 'text')
    && (element.role === 'title' || element.intent?.role === 'title' || /title|headline|heading/i.test(element.id)))
    ?? Object.values(doc.elements).find(element => element.type === 'text' || element.props.type === 'text');
  if (!title) return undefined;
  const fontSize = typeof title.props.fontSize === 'number' ? title.props.fontSize : 24;
  const needsProps = fontSize < 34 || title.props.fill !== '$title';
  const needsIntent = title.intent?.importance !== 'primary' || title.intent?.role !== 'title';
  if (!needsProps && !needsIntent && title.role === 'title') return undefined;
  return {
    id: 'polish-title-hierarchy',
    title: 'Strengthen title hierarchy',
    description: 'Make the primary text read as a title with stronger size, semantic color, and intent metadata.',
    confidence: 'safe',
    category: 'hierarchy',
    commands: [{
      op: 'updateElement',
      id: title.id,
      patch: {
        role: 'title',
        intent: { ...title.intent, role: 'title', importance: 'primary' },
        props: { fontSize: Math.max(fontSize, POLISH_TARGET_TITLE_SIZE), fill: '$title' },
      },
    }],
  };
}

function buildIntroTimeline(doc: ElucimV2Document, rootChildren: string[]) {
  const targets = rootChildren.slice(0, 8);
  if (targets.length === 0) return undefined;
  const stagger = 6;
  const fadeDuration = 18;
  const duration = Math.min(getDocumentLinearDuration(doc), Math.max(fadeDuration, (targets.length - 1) * stagger + fadeDuration));
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
