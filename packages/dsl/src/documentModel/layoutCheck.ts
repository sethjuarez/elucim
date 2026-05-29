import { measureTextLayout } from '@elucim/core';
import type { MeasureTextOptions, TextWrapMode } from '@elucim/core';
import { collectElementBounds, type ElementBounds } from './polish';
import type { ElucimDocument, ElucimElement } from './types';

export type ElucimLayoutCheckSeverity = 'warning' | 'error';
export type ElucimLayoutCheckCode =
  | 'raw-text-too-wide'
  | 'text-layout-width-without-maxwidth'
  | 'text-overflows-width'
  | 'text-overflows-height'
  | 'textbox-inner-bounds'
  | 'textbox-overflow'
  | 'textbox-truncated'
  | 'textbox-tiny-font'
  | 'element-overlap';

export interface ElucimLayoutIssue {
  id: string;
  code: ElucimLayoutCheckCode;
  severity: ElucimLayoutCheckSeverity;
  message: string;
  affectedElementIds: string[];
  details?: Record<string, number | string | string[]>;
}

export type ElucimLayoutRepairConfidence = 'safe' | 'review';
export type ElucimLayoutRepairAction =
  | 'update-text-wrapping'
  | 'resize-textbox'
  | 'rewrite-copy'
  | 'move-element'
  | 'review-overlap';

export interface ElucimLayoutRepairPatch {
  props?: Record<string, number | string | boolean | null>;
  layout?: Record<string, number | string | boolean | null>;
}

export interface ElucimLayoutRepairCommand {
  op: 'updateElement';
  id: string;
  patch: ElucimLayoutRepairPatch;
}

export interface ElucimLayoutRepairCliCommand {
  command: 'update-element';
  argvTemplate: string[];
  filePlaceholder: '<file>';
}

export interface ElucimLayoutRepairSuggestion {
  id: string;
  issueId: string;
  issueCode: ElucimLayoutCheckCode;
  confidence: ElucimLayoutRepairConfidence;
  action: ElucimLayoutRepairAction;
  targetElementId: string;
  affectedElementIds: string[];
  message: string;
  rationale: string;
  command?: ElucimLayoutRepairCommand;
  cli?: ElucimLayoutRepairCliCommand;
  details?: Record<string, number | string>;
}

export interface ElucimLayoutCheckOptions {
  minimumReadableFontSize?: number;
  overlapAreaThreshold?: number;
}

export interface ElucimLayoutCheckResult {
  valid: boolean;
  issueCount: number;
  errors: ElucimLayoutIssue[];
  warnings: ElucimLayoutIssue[];
  issues: ElucimLayoutIssue[];
}

export interface ElucimLayoutRepairOptions {
  checkOptions?: ElucimLayoutCheckOptions;
  includeReview?: boolean;
  reviewSuggestionIds?: string[];
  maxPasses?: number;
}

export interface ElucimAppliedLayoutRepair {
  pass: number;
  suggestion: ElucimLayoutRepairSuggestion;
}

export type ElucimSkippedLayoutRepairReason =
  | 'review-not-selected'
  | 'no-command'
  | 'unsupported-command'
  | 'target-not-found'
  | 'no-change'
  | 'target-already-repaired-this-pass';

export interface ElucimSkippedLayoutRepair {
  pass: number;
  suggestion: ElucimLayoutRepairSuggestion;
  reason: ElucimSkippedLayoutRepairReason;
}

export interface ElucimLayoutRepairResult {
  document: ElucimDocument;
  changed: boolean;
  converged: boolean;
  passes: number;
  before: ElucimLayoutCheckResult;
  after: ElucimLayoutCheckResult;
  applied: ElucimAppliedLayoutRepair[];
  skipped: ElucimSkippedLayoutRepair[];
  repairSuggestions: ElucimLayoutRepairSuggestion[];
}

const DEFAULT_SCENE_WIDTH = 1280;
const DEFAULT_MINIMUM_READABLE_FONT_SIZE = 14;
const DEFAULT_OVERLAP_AREA_THRESHOLD = 64;
const TEXTBOX_DEFAULT_FONT_SIZE = 20;
const TEXTBOX_DEFAULT_MIN_FONT_SIZE = 10;
const TEXT_DEFAULT_FONT_SIZE = 24;
const TEXTBOX_DEFAULT_PADDING_X = 12;
const TEXTBOX_DEFAULT_PADDING_Y = 10;
const DEFAULT_REPAIR_MAX_PASSES = 3;

interface ResolvedPadding {
  x: number;
  y: number;
}

export function checkLayoutForAgent(
  doc: ElucimDocument,
  options: ElucimLayoutCheckOptions = {}
): ElucimLayoutCheckResult {
  const minimumReadableFontSize = options.minimumReadableFontSize ?? DEFAULT_MINIMUM_READABLE_FONT_SIZE;
  const overlapAreaThreshold = options.overlapAreaThreshold ?? DEFAULT_OVERLAP_AREA_THRESHOLD;
  const issues = [
    ...checkTextLayout(doc, minimumReadableFontSize),
    ...checkLikelyOverlaps(doc, overlapAreaThreshold),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id));
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  return {
    valid: errors.length === 0,
    issueCount: issues.length,
    errors,
    warnings,
    issues,
  };
}

export function suggestLayoutRepairsForAgent(
  doc: ElucimDocument,
  result: ElucimLayoutCheckResult = checkLayoutForAgent(doc)
): ElucimLayoutRepairSuggestion[] {
  const bounds = new Map(collectElementBounds(doc).map(bound => [bound.id, bound]));
  return result.issues
    .flatMap(issue => repairSuggestionForIssue(doc, bounds, issue))
    .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.id.localeCompare(b.id));
}

export function repairLayoutForAgent(
  doc: ElucimDocument,
  options: ElucimLayoutRepairOptions = {}
): ElucimLayoutRepairResult {
  const maxPasses = Math.max(1, Math.floor(options.maxPasses ?? DEFAULT_REPAIR_MAX_PASSES));
  const reviewSuggestionIds = new Set(options.reviewSuggestionIds ?? []);
  const before = checkLayoutForAgent(doc, options.checkOptions);
  let current = doc;
  const applied: ElucimAppliedLayoutRepair[] = [];
  const skipped: ElucimSkippedLayoutRepair[] = [];
  let passes = 0;
  let converged = false;

  for (let pass = 1; pass <= maxPasses; pass += 1) {
    passes = pass;
    const passLayout = checkLayoutForAgent(current, options.checkOptions);
    const suggestions = suggestLayoutRepairsForAgent(current, passLayout);
    const repairedTargets = new Set<string>();
    let passChanged = false;

    for (const suggestion of suggestions) {
      if (suggestion.confidence === 'review' && !options.includeReview && !reviewSuggestionIds.has(suggestion.id)) {
        skipped.push({ pass, suggestion, reason: 'review-not-selected' });
        continue;
      }
      if (!suggestion.command) {
        skipped.push({ pass, suggestion, reason: 'no-command' });
        continue;
      }
      if (suggestion.command.op !== 'updateElement') {
        skipped.push({ pass, suggestion, reason: 'unsupported-command' });
        continue;
      }
      if (repairedTargets.has(suggestion.targetElementId)) {
        skipped.push({ pass, suggestion, reason: 'target-already-repaired-this-pass' });
        continue;
      }

      const next = applyLayoutRepairCommand(current, suggestion.command);
      if (!next) {
        skipped.push({ pass, suggestion, reason: 'target-not-found' });
        continue;
      }
      if (documentsEqual(current, next)) {
        skipped.push({ pass, suggestion, reason: 'no-change' });
        continue;
      }

      current = next;
      passChanged = true;
      repairedTargets.add(suggestion.targetElementId);
      applied.push({ pass, suggestion });
    }

    if (!passChanged) {
      converged = true;
      break;
    }
  }

  const after = checkLayoutForAgent(current, options.checkOptions);
  return {
    document: current,
    changed: !documentsEqual(doc, current),
    converged,
    passes,
    before,
    after,
    applied,
    skipped,
    repairSuggestions: suggestLayoutRepairsForAgent(current, after),
  };
}

function repairSuggestionForIssue(
  doc: ElucimDocument,
  bounds: Map<string, ElementBounds>,
  issue: ElucimLayoutIssue
): ElucimLayoutRepairSuggestion[] {
  switch (issue.code) {
    case 'raw-text-too-wide':
    case 'text-layout-width-without-maxwidth':
      return suggestTextWrappingRepair(doc, issue);
    case 'text-overflows-width':
      return suggestTextWidthRepair(doc, issue);
    case 'text-overflows-height':
      return suggestCopyRewrite(issue, 'Use a textbox with shrink/truncate fitting or shorten this text so it fits the intended region.');
    case 'textbox-overflow':
      return suggestTextBoxResizeRepair(doc, issue);
    case 'textbox-tiny-font':
      return suggestTextBoxReadabilityRepair(doc, issue);
    case 'textbox-truncated':
      return suggestTextBoxTruncationRepair(doc, issue);
    case 'element-overlap':
      return suggestOverlapRepair(doc, bounds, issue);
    case 'textbox-inner-bounds':
      return suggestTextBoxPaddingRepair(doc, issue);
  }
}

function applyLayoutRepairCommand(doc: ElucimDocument, command: ElucimLayoutRepairCommand): ElucimDocument | undefined {
  const element = doc.elements[command.id];
  if (!element) return undefined;
  return {
    ...doc,
    elements: {
      ...doc.elements,
      [command.id]: applyLayoutRepairPatch(element, command.patch),
    },
  };
}

function applyLayoutRepairPatch(element: ElucimElement, patch: ElucimLayoutRepairPatch): ElucimElement {
  const next: ElucimElement = { ...element };
  if (patch.props) {
    next.props = mergePatchObject(element.props, patch.props) as ElucimElement['props'];
  }
  if (patch.layout) {
    next.layout = mergePatchObject(element.layout ?? {}, patch.layout) as ElucimElement['layout'];
  }
  return next;
}

function mergePatchObject(
  base: object,
  patch: Record<string, number | string | boolean | null>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
}

function checkTextLayout(doc: ElucimDocument, minimumReadableFontSize: number): ElucimLayoutIssue[] {
  return Object.values(doc.elements).flatMap(element => {
    if (isTextBox(element)) return checkTextBox(element, minimumReadableFontSize);
    if (isText(element)) return checkText(element, doc.scene.width ?? DEFAULT_SCENE_WIDTH);
    return [];
  });
}

function suggestTextWrappingRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isText(element)) return [];
  const sceneWidth = doc.scene.width ?? DEFAULT_SCENE_WIDTH;
  const targetWidth = roundedDimension(
    numberDetail(issue, 'layoutWidth')
    ?? Math.min(sceneWidth * 0.7, Math.max(280, numberDetail(issue, 'measuredWidth') ?? 320))
  );
  return [updatePropsSuggestion({
    issue,
    action: 'update-text-wrapping',
    confidence: 'safe',
    targetElementId: element.id,
    props: { maxWidth: targetWidth, wrap: 'word' },
    message: `Set maxWidth:${targetWidth} and wrap:"word" on text "${element.id}".`,
    rationale: 'Raw text only wraps when maxWidth is render-effective; this keeps generated copy bounded without changing element type.',
    details: { targetWidth },
  })];
}

function suggestTextWidthRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isText(element)) return [];
  const maxWidth = numberValue(element.props.maxWidth);
  const wrap = textWrapMode(element.props.wrap);
  if (wrap !== 'word') {
    return [updatePropsSuggestion({
      issue,
      action: 'update-text-wrapping',
      confidence: 'safe',
      targetElementId: element.id,
      props: { wrap: 'word' },
      message: `Use wrap:"word" on text "${element.id}" so prose respects maxWidth.`,
      rationale: 'Word wrapping preserves normal words and is less visually disruptive than char wrapping. Re-run layout checks after applying because very long tokens may still need char wrapping or a textbox.',
    })];
  }
  if (maxWidth !== undefined && hasWordLongerThan(element, maxWidth)) {
    return [updatePropsSuggestion({
      issue,
      action: 'update-text-wrapping',
      confidence: 'safe',
      targetElementId: element.id,
      props: { wrap: 'char' },
      message: `Use wrap:"char" on text "${element.id}" so long tokens cannot escape maxWidth.`,
      rationale: 'Word wrapping cannot split a single long token; char wrapping is deterministic and preserves the existing width.',
    })];
  }
  const targetWidth = roundedDimension(Math.max(maxWidth ?? 0, numberDetail(issue, 'measuredWidth') ?? 0) + 12);
  return [updatePropsSuggestion({
    issue,
    action: 'update-text-wrapping',
    confidence: 'review',
    targetElementId: element.id,
    props: targetWidth > 12 ? { maxWidth: targetWidth } : { wrap: 'char' },
    message: `Review text "${element.id}" width; widen maxWidth${targetWidth > 12 ? ` to about ${targetWidth}` : ''} or convert it to a textbox.`,
    rationale: 'The overflow is not clearly caused by a single long token, so widening or converting to a textbox is safer than forcing mid-word breaks.',
    details: targetWidth > 12 ? { targetWidth } : undefined,
  })];
}

function suggestCopyRewrite(issue: ElucimLayoutIssue, rationale: string): ElucimLayoutRepairSuggestion[] {
  const targetElementId = issue.affectedElementIds[0];
  return [{
    id: `layout-repair-${issue.id}-rewrite-copy`,
    issueId: issue.id,
    issueCode: issue.code,
    confidence: 'review',
    action: 'rewrite-copy',
    targetElementId,
    affectedElementIds: issue.affectedElementIds,
    message: `Shorten or restructure copy for "${targetElementId}".`,
    rationale,
  }];
}

function suggestTextBoxResizeRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isTextBox(element)) return [];
  const width = textBoxWidth(element);
  const height = textBoxHeight(element);
  if (width === undefined || height === undefined) return suggestCopyRewrite(issue, 'The textbox has no explicit size to adjust safely.');
  const padding = resolvePadding(element.props.padding);
  const measuredWidth = numberDetail(issue, 'measuredWidth') ?? 0;
  const measuredHeight = numberDetail(issue, 'measuredHeight') ?? 0;
  const innerWidth = numberDetail(issue, 'innerWidth') ?? Math.max(0, width - padding.x * 2);
  const innerHeight = numberDetail(issue, 'innerHeight') ?? Math.max(0, height - padding.y * 2);
  const targetWidth = measuredWidth > innerWidth
    ? roundedDimension(width + measuredWidth - innerWidth + 12)
    : width;
  const targetHeight = measuredHeight > innerHeight
    ? roundedDimension(height + measuredHeight - innerHeight + 12)
    : roundedDimension(height + 24);
  return [resizeTextBoxSuggestion({
    issue,
    element,
    targetWidth,
    targetHeight,
    confidence: 'safe',
    message: `Resize textbox "${element.id}" to ${targetWidth}x${targetHeight} so the current copy fits.`,
    rationale: 'The suggestion preserves text, font, and fitting mode while expanding only the constrained textbox dimension.',
  })];
}

function suggestTextBoxReadabilityRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isTextBox(element)) return [];
  const width = textBoxWidth(element);
  const height = textBoxHeight(element);
  const fontSize = numberDetail(issue, 'fontSize');
  const minimumReadableFontSize = numberDetail(issue, 'minimumReadableFontSize');
  if (width === undefined || height === undefined || fontSize === undefined || minimumReadableFontSize === undefined || fontSize <= 0) {
    return suggestCopyRewrite(issue, 'The text only fits at an unreadably small font size; shorten the copy or increase the textbox size.');
  }
  const scale = Math.min(2.25, Math.max(1.15, minimumReadableFontSize / fontSize));
  const targetWidth = roundedDimension(width * Math.min(1.35, scale));
  const targetHeight = roundedDimension(height * scale);
  return [resizeTextBoxSuggestion({
    issue,
    element,
    targetWidth,
    targetHeight,
    confidence: 'review',
    message: `Increase textbox "${element.id}" to about ${targetWidth}x${targetHeight} or shorten the copy.`,
    rationale: 'The current copy requires shrink-to-fit below the readability threshold, so a human or agent should trade off box size against copy length.',
    details: { targetWidth, targetHeight, scale: Math.round(scale * 100) / 100 },
  })];
}

function suggestTextBoxTruncationRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isTextBox(element)) return [];
  const width = textBoxWidth(element);
  const height = textBoxHeight(element);
  const measuredHeight = numberDetail(issue, 'measuredHeight');
  const innerHeight = numberDetail(issue, 'innerHeight');
  if (width === undefined || height === undefined || measuredHeight === undefined || innerHeight === undefined) {
    return suggestCopyRewrite(issue, 'The textbox drops multiple lines in truncate mode; shorten the copy or increase the textbox height.');
  }
  const targetHeight = roundedDimension(height + Math.max(24, measuredHeight - innerHeight + 12));
  return [resizeTextBoxSuggestion({
    issue,
    element,
    targetWidth: width,
    targetHeight,
    confidence: 'review',
    message: `Increase textbox "${element.id}" height to about ${targetHeight} or shorten the copy.`,
    rationale: 'Truncation is allowed, but dropping several lines usually hides important generated explanation text.',
  })];
}

function suggestTextBoxPaddingRepair(doc: ElucimDocument, issue: ElucimLayoutIssue): ElucimLayoutRepairSuggestion[] {
  const element = doc.elements[issue.affectedElementIds[0]];
  if (!element || !isTextBox(element)) return [];
  const width = textBoxWidth(element);
  const height = textBoxHeight(element);
  if (width === undefined || height === undefined) return [];
  const paddingX = numberDetail(issue, 'paddingX') ?? TEXTBOX_DEFAULT_PADDING_X;
  const paddingY = numberDetail(issue, 'paddingY') ?? TEXTBOX_DEFAULT_PADDING_Y;
  const targetWidth = roundedDimension(Math.max(width, paddingX * 2 + 80));
  const targetHeight = roundedDimension(Math.max(height, paddingY * 2 + 48));
  return [resizeTextBoxSuggestion({
    issue,
    element,
    targetWidth,
    targetHeight,
    confidence: 'safe',
    message: `Resize textbox "${element.id}" to at least ${targetWidth}x${targetHeight} so padding leaves room for text.`,
    rationale: 'A textbox needs positive inner width and height after padding before any text can render.',
  })];
}

function suggestOverlapRepair(
  doc: ElucimDocument,
  bounds: Map<string, ElementBounds>,
  issue: ElucimLayoutIssue
): ElucimLayoutRepairSuggestion[] {
  const targetElementId = chooseMovableOverlapTarget(doc, issue.affectedElementIds);
  const target = doc.elements[targetElementId];
  const targetBounds = bounds.get(targetElementId);
  if (!target || !targetBounds) {
    return suggestCopyRewrite(issue, 'The overlap could not be mapped to a movable element; review spacing manually.');
  }
  if (!hasMovablePosition(target)) {
    return [{
      id: `layout-repair-${issue.id}-review-overlap`,
      issueId: issue.id,
      issueCode: issue.code,
      confidence: 'review',
      action: 'review-overlap',
      targetElementId,
      affectedElementIds: issue.affectedElementIds,
      message: `Review overlap between ${issue.affectedElementIds.map(id => `"${id}"`).join(' and ')}.`,
      rationale: 'The target element has no explicit x/y position that can be nudged deterministically.',
    }];
  }

  const overlapWidth = numberDetail(issue, 'width') ?? 0;
  const overlapHeight = numberDetail(issue, 'height') ?? 0;
  const sceneWidth = doc.scene.width ?? DEFAULT_SCENE_WIDTH;
  const sceneHeight = doc.scene.height ?? 720;
  const verticalMove = overlapHeight + 16;
  const horizontalMove = overlapWidth + 16;
  const preferVertical = overlapHeight <= overlapWidth || targetBounds.x + targetBounds.width + horizontalMove > sceneWidth;
  const dx = preferVertical ? 0 : horizontalMove;
  const dy = preferVertical ? verticalMove : 0;
  const nextBoundsX = roundedCoordinate(Math.min(Math.max(0, targetBounds.x + dx), Math.max(0, sceneWidth - targetBounds.width)));
  const nextBoundsY = roundedCoordinate(Math.min(Math.max(0, targetBounds.y + dy), Math.max(0, sceneHeight - targetBounds.height)));
  const appliedDx = nextBoundsX - targetBounds.x;
  const appliedDy = nextBoundsY - targetBounds.y;
  if (appliedDx === 0 && appliedDy === 0) {
    return suggestCopyRewrite(issue, 'The overlap cannot be resolved by a simple in-scene nudge; resize or reorder the elements manually.');
  }
  const patch = positionDeltaPatch(target, appliedDx, appliedDy);
  return [repairSuggestion({
    issue,
    action: 'move-element',
    confidence: 'review',
    targetElementId,
    patch,
    message: `Move "${targetElementId}" by (${Math.round(appliedDx)}, ${Math.round(appliedDy)}) to separate the overlapping bounds.`,
    rationale: 'Overlap can be intentional, so this is review-level and only nudges one explicitly positioned element.',
    details: { dx: Math.round(appliedDx), dy: Math.round(appliedDy), boundsX: nextBoundsX, boundsY: nextBoundsY },
  })];
}

function checkText(element: ElucimElement, sceneWidth: number): ElucimLayoutIssue[] {
  const content = stringValue(element.props.content) ?? element.id;
  const fontSize = numberValue(element.props.fontSize) ?? TEXT_DEFAULT_FONT_SIZE;
  const fontFamily = stringValue(element.props.fontFamily);
  const fontWeight = fontWeightValue(element.props.fontWeight);
  const explicitMaxWidth = numberValue(element.props.maxWidth);
  const layoutWidth = numberValue(element.layout?.width);
  const maxWidth = explicitMaxWidth;
  const maxHeight = numberValue(element.layout?.height);
  const lineHeight = numberValue(element.props.lineHeight);
  const wrap = textWrapMode(element.props.wrap);
  const layout = measureTextLayout(content, { fontSize, fontFamily, fontWeight, lineHeight, maxWidth, wrap });
  const issues: ElucimLayoutIssue[] = [];

  if (maxWidth !== undefined && layout.lines.some(line => line.width > maxWidth)) {
    issues.push({
      id: `text-overflows-width-${element.id}`,
      code: 'text-overflows-width',
      severity: 'error',
      message: `Text "${element.id}" exceeds its configured width; use wrap:"char", a wider maxWidth, or a textbox.`,
      affectedElementIds: [element.id],
      details: { measuredWidth: layout.width, maxWidth },
    });
  }

  if (maxHeight !== undefined && layout.height > maxHeight) {
    issues.push({
      id: `text-overflows-height-${element.id}`,
      code: 'text-overflows-height',
      severity: 'error',
      message: `Text "${element.id}" exceeds its configured height; use a taller region or a textbox with shrink/truncate fitting.`,
      affectedElementIds: [element.id],
      details: { measuredHeight: layout.height, maxHeight },
    });
  }

  if (explicitMaxWidth === undefined && layoutWidth !== undefined && layout.width > layoutWidth) {
    issues.push({
      id: `text-layout-width-without-maxwidth-${element.id}`,
      code: 'text-layout-width-without-maxwidth',
      severity: 'warning',
      message: `Text "${element.id}" has layout.width but no maxWidth, so it will not wrap during rendering.`,
      affectedElementIds: [element.id],
      details: { measuredWidth: layout.width, layoutWidth },
    });
  }

  if (maxWidth === undefined && content.length >= 80 && layout.width > sceneWidth * 0.45) {
    issues.push({
      id: `raw-text-too-wide-${element.id}`,
      code: 'raw-text-too-wide',
      severity: 'warning',
      message: `Long text "${element.id}" has no maxWidth; use textbox for generated explanatory copy.`,
      affectedElementIds: [element.id],
      details: { measuredWidth: layout.width, sceneWidth },
    });
  }

  return issues;
}

function checkTextBox(element: ElucimElement, minimumReadableFontSize: number): ElucimLayoutIssue[] {
  const content = stringValue(element.props.content) ?? element.id;
  const width = numberValue(element.layout?.width) ?? numberValue(element.props.width);
  const height = numberValue(element.layout?.height) ?? numberValue(element.props.height);
  if (width === undefined || height === undefined) return [];

  const padding = resolvePadding(element.props.padding);
  const innerWidth = width - padding.x * 2;
  const innerHeight = height - padding.y * 2;
  if (innerWidth <= 0 || innerHeight <= 0) {
    return [{
      id: `textbox-inner-bounds-${element.id}`,
      code: 'textbox-inner-bounds',
      severity: 'error',
      message: `Textbox "${element.id}" has no positive inner text area after padding.`,
      affectedElementIds: [element.id],
      details: { width, height, paddingX: padding.x, paddingY: padding.y },
    }];
  }

  const fontSize = numberValue(element.props.fontSize) ?? TEXTBOX_DEFAULT_FONT_SIZE;
  const minFontSize = numberValue(element.props.minFontSize) ?? TEXTBOX_DEFAULT_MIN_FONT_SIZE;
  const fontFamily = stringValue(element.props.fontFamily);
  const fontWeight = fontWeightValue(element.props.fontWeight);
  const lineHeight = numberValue(element.props.lineHeight);
  const autoFit = textBoxAutoFit(element.props.autoFit);
  const fitted = fitTextBox(content, {
    fontSize,
    minFontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    innerWidth,
    innerHeight,
    autoFit,
  });
  const issues: ElucimLayoutIssue[] = [];

  if (fitted.overflow) {
    issues.push({
      id: `textbox-overflow-${element.id}`,
      code: 'textbox-overflow',
      severity: 'error',
      message: `Textbox "${element.id}" cannot fit its text within ${Math.round(innerWidth)}x${Math.round(innerHeight)}.`,
      affectedElementIds: [element.id],
      details: {
        measuredWidth: fitted.width,
        measuredHeight: fitted.height,
        innerWidth,
        innerHeight,
        autoFit,
      },
    });
  }

  if (fitted.truncated && fitted.visibleLineCount === 0) {
    issues.push({
      id: `textbox-overflow-${element.id}`,
      code: 'textbox-overflow',
      severity: 'error',
      message: `Textbox "${element.id}" is too short to render even one truncated line.`,
      affectedElementIds: [element.id],
      details: { measuredHeight: fitted.height, innerHeight, autoFit },
    });
  } else if (fitted.truncated && fitted.droppedLineCount > 2) {
    issues.push({
      id: `textbox-truncated-${element.id}`,
      code: 'textbox-truncated',
      severity: 'warning',
      message: `Textbox "${element.id}" will truncate generated copy; consider a taller box or shorter text.`,
      affectedElementIds: [element.id],
      details: { measuredHeight: fitted.height, innerHeight, droppedLineCount: fitted.droppedLineCount },
    });
  }

  if (autoFit === 'shrink' && fitted.fontSize < minimumReadableFontSize) {
    issues.push({
      id: `textbox-tiny-font-${element.id}`,
      code: 'textbox-tiny-font',
      severity: 'warning',
      message: `Textbox "${element.id}" must shrink to ${fitted.fontSize}px, which may be hard to read.`,
      affectedElementIds: [element.id],
      details: { fontSize: fitted.fontSize, minimumReadableFontSize },
    });
  }

  return issues;
}

function fitTextBox(
  content: string,
  options: {
    fontSize: number;
    minFontSize: number;
    fontFamily?: string;
    fontWeight?: string | number;
    lineHeight?: number;
    innerWidth: number;
    innerHeight: number;
    autoFit: 'none' | 'shrink' | 'truncate';
  }
) {
  let resolvedFontSize = options.fontSize;
  let layout = measureTextLayout(content, textBoxMeasureOptions(options, resolvedFontSize, 'word'));

  if (options.autoFit === 'shrink') {
    while (
      resolvedFontSize > options.minFontSize
      && (layout.height > options.innerHeight || layout.lines.some(line => line.width > options.innerWidth))
    ) {
      resolvedFontSize = Math.max(options.minFontSize, resolvedFontSize - 1);
      layout = measureTextLayout(content, textBoxMeasureOptions(options, resolvedFontSize, 'word'));
    }

    if (layout.lines.some(line => line.width > options.innerWidth)) {
      layout = measureTextLayout(content, textBoxMeasureOptions(options, resolvedFontSize, 'char'));
    }
  }

  const overflow = layout.height > options.innerHeight || layout.lines.some(line => line.width > options.innerWidth);
  const visibleLineCount = options.autoFit === 'truncate' ? Math.floor(options.innerHeight / layout.lineHeight) : layout.lines.length;
  const droppedLineCount = options.autoFit === 'truncate' ? Math.max(0, layout.lines.length - visibleLineCount) : 0;
  return {
    fontSize: resolvedFontSize,
    width: layout.width,
    height: layout.height,
    overflow: options.autoFit === 'truncate' ? false : overflow,
    truncated: options.autoFit === 'truncate' && overflow,
    visibleLineCount,
    droppedLineCount,
  };
}

function textBoxMeasureOptions(
  options: {
    fontFamily?: string;
    fontWeight?: string | number;
    lineHeight?: number;
    innerWidth: number;
  },
  fontSize: number,
  wrap: TextWrapMode
): MeasureTextOptions {
  return {
    fontSize,
    fontFamily: options.fontFamily,
    fontWeight: options.fontWeight,
    lineHeight: options.lineHeight,
    maxWidth: options.innerWidth,
    wrap,
  };
}

function checkLikelyOverlaps(doc: ElucimDocument, overlapAreaThreshold: number): ElucimLayoutIssue[] {
  const bounds = collectElementBounds(doc);
  const issues: ElucimLayoutIssue[] = [];
  for (let i = 0; i < bounds.length; i += 1) {
    for (let j = i + 1; j < bounds.length; j += 1) {
      const a = bounds[i];
      const b = bounds[j];
      if (shouldIgnoreOverlap(doc, a.id, b.id)) continue;
      const intersection = intersectionRect(a, b);
      if (!intersection || intersection.width * intersection.height < overlapAreaThreshold) continue;
      const affectedElementIds = [a.id, b.id].sort();
      issues.push({
        id: `element-overlap-${affectedElementIds[0]}-${affectedElementIds[1]}`,
        code: 'element-overlap',
        severity: 'warning',
        message: `Elements "${a.id}" and "${b.id}" overlap; verify spacing or grouping intent.`,
        affectedElementIds,
        details: {
          area: Math.round(intersection.width * intersection.height),
          x: intersection.x,
          y: intersection.y,
          width: intersection.width,
          height: intersection.height,
        },
      });
    }
  }
  return issues.sort((a, b) => Number(b.details?.area ?? 0) - Number(a.details?.area ?? 0)).slice(0, 20);
}

function shouldIgnoreOverlap(doc: ElucimDocument, aId: string, bId: string) {
  if (isAncestor(doc, aId, bId) || isAncestor(doc, bId, aId)) return true;
  const a = doc.elements[aId];
  const b = doc.elements[bId];
  if (!a || !b) return true;
  if (a.parentId && a.parentId === b.parentId) {
    return isContainerLike(a) || isContainerLike(b);
  }
  return isDecorative(a) || isDecorative(b);
}

function updatePropsSuggestion(options: {
  issue: ElucimLayoutIssue;
  action: ElucimLayoutRepairAction;
  confidence: ElucimLayoutRepairConfidence;
  targetElementId: string;
  props: Record<string, number | string | boolean | null>;
  message: string;
  rationale: string;
  details?: Record<string, number | string>;
}): ElucimLayoutRepairSuggestion {
  return repairSuggestion({
    issue: options.issue,
    action: options.action,
    confidence: options.confidence,
    targetElementId: options.targetElementId,
    patch: { props: options.props },
    message: options.message,
    rationale: options.rationale,
    details: options.details,
  });
}

function resizeTextBoxSuggestion(options: {
  issue: ElucimLayoutIssue;
  element: ElucimElement;
  targetWidth: number;
  targetHeight: number;
  confidence: ElucimLayoutRepairConfidence;
  message: string;
  rationale: string;
  details?: Record<string, number | string>;
}): ElucimLayoutRepairSuggestion {
  const props: Record<string, number> = {};
  const layout: Record<string, number> = {};
  if (numberValue(options.element.props.width) !== undefined) props.width = options.targetWidth;
  if (numberValue(options.element.props.height) !== undefined) props.height = options.targetHeight;
  if (numberValue(options.element.layout?.width) !== undefined) layout.width = options.targetWidth;
  if (numberValue(options.element.layout?.height) !== undefined) layout.height = options.targetHeight;
  if (Object.keys(props).length === 0) {
    props.width = options.targetWidth;
    props.height = options.targetHeight;
  }
  const patch: ElucimLayoutRepairPatch = {};
  if (Object.keys(props).length > 0) patch.props = props;
  if (Object.keys(layout).length > 0) patch.layout = layout;
  return repairSuggestion({
    issue: options.issue,
    action: 'resize-textbox',
    confidence: options.confidence,
    targetElementId: options.element.id,
    patch,
    message: options.message,
    rationale: options.rationale,
    details: options.details ?? { targetWidth: options.targetWidth, targetHeight: options.targetHeight },
  });
}

function repairSuggestion(options: {
  issue: ElucimLayoutIssue;
  action: ElucimLayoutRepairAction;
  confidence: ElucimLayoutRepairConfidence;
  targetElementId: string;
  patch: ElucimLayoutRepairPatch;
  message: string;
  rationale: string;
  details?: Record<string, number | string>;
}): ElucimLayoutRepairSuggestion {
  const command: ElucimLayoutRepairCommand = {
    op: 'updateElement',
    id: options.targetElementId,
    patch: options.patch,
  };
  return {
    id: `layout-repair-${options.issue.id}-${options.action}`,
    issueId: options.issue.id,
    issueCode: options.issue.code,
    confidence: options.confidence,
    action: options.action,
    targetElementId: options.targetElementId,
    affectedElementIds: options.issue.affectedElementIds,
    message: options.message,
    rationale: options.rationale,
    command,
    cli: {
      command: 'update-element',
      argvTemplate: updateElementArgvTemplate(options.targetElementId, options.patch),
      filePlaceholder: '<file>',
    },
    details: options.details,
  };
}

function updateElementArgvTemplate(elementId: string, patch: ElucimLayoutRepairPatch) {
  const argv = ['update-element', '<file>', '--id', elementId];
  if (patch.props && Object.keys(patch.props).length > 0) {
    argv.push('--props-json', JSON.stringify(patch.props));
  }
  if (patch.layout && Object.keys(patch.layout).length > 0) {
    argv.push('--layout-json', JSON.stringify(patch.layout));
  }
  argv.push('--out', '<file>', '--json');
  return argv;
}

function chooseMovableOverlapTarget(doc: ElucimDocument, ids: string[]) {
  const candidates = ids
    .map(id => doc.elements[id])
    .filter((element): element is ElucimElement => Boolean(element));
  return candidates.find(element => !isContainerLike(element) && !isDecorative(element))?.id ?? ids[ids.length - 1];
}

function hasMovablePosition(element: ElucimElement) {
  return (
    (numberValue(element.props.x) !== undefined && numberValue(element.props.y) !== undefined)
    || (numberValue(element.props.cx) !== undefined && numberValue(element.props.cy) !== undefined)
    || (numberValue(element.layout?.x) !== undefined && numberValue(element.layout?.y) !== undefined)
  );
}

function positionDeltaPatch(element: ElucimElement, dx: number, dy: number): ElucimLayoutRepairPatch {
  const props: Record<string, number> = {};
  const layout: Record<string, number> = {};
  const x = numberValue(element.props.x);
  const y = numberValue(element.props.y);
  const cx = numberValue(element.props.cx);
  const cy = numberValue(element.props.cy);
  const layoutX = numberValue(element.layout?.x);
  const layoutY = numberValue(element.layout?.y);
  if (x !== undefined) props.x = roundedCoordinate(x + dx);
  if (y !== undefined) props.y = roundedCoordinate(y + dy);
  if (cx !== undefined) props.cx = roundedCoordinate(cx + dx);
  if (cy !== undefined) props.cy = roundedCoordinate(cy + dy);
  if (layoutX !== undefined) layout.x = roundedCoordinate(layoutX + dx);
  if (layoutY !== undefined) layout.y = roundedCoordinate(layoutY + dy);
  if (Object.keys(props).length === 0) {
    props.x = roundedCoordinate((layoutX ?? 0) + dx);
    props.y = roundedCoordinate((layoutY ?? 0) + dy);
  }
  const patch: ElucimLayoutRepairPatch = {};
  if (Object.keys(props).length > 0) patch.props = props;
  if (Object.keys(layout).length > 0) patch.layout = layout;
  return patch;
}

function textBoxWidth(element: ElucimElement) {
  return numberValue(element.layout?.width) ?? numberValue(element.props.width);
}

function textBoxHeight(element: ElucimElement) {
  return numberValue(element.layout?.height) ?? numberValue(element.props.height);
}

function hasWordLongerThan(element: ElucimElement, maxWidth: number) {
  const content = stringValue(element.props.content) ?? element.id;
  const fontSize = numberValue(element.props.fontSize) ?? TEXT_DEFAULT_FONT_SIZE;
  const fontFamily = stringValue(element.props.fontFamily);
  const fontWeight = fontWeightValue(element.props.fontWeight);
  return content
    .split(/\s+/)
    .filter(Boolean)
    .some(word => measureTextLayout(word, { fontSize, fontFamily, fontWeight, wrap: 'none' }).width > maxWidth);
}

function isAncestor(doc: ElucimDocument, ancestorId: string, childId: string) {
  let current = doc.elements[childId]?.parentId;
  while (current) {
    if (current === ancestorId) return true;
    current = doc.elements[current]?.parentId;
  }
  return false;
}

function isContainerLike(element: ElucimElement) {
  const role = element.role ?? element.intent?.role;
  return role === 'container' || role === 'background' || element.type === 'group' || element.props.type === 'group';
}

function isDecorative(element: ElucimElement) {
  return element.intent?.importance === 'decorative' || element.role === 'decoration';
}

function intersectionRect(a: ElementBounds, b: ElementBounds) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return undefined;
  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

function resolvePadding(value: unknown): ResolvedPadding {
  if (typeof value === 'number' && Number.isFinite(value)) return { x: value, y: value };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const padding = value as { x?: unknown; y?: unknown };
    return {
      x: numberValue(padding.x) ?? TEXTBOX_DEFAULT_PADDING_X,
      y: numberValue(padding.y) ?? TEXTBOX_DEFAULT_PADDING_Y,
    };
  }
  return { x: TEXTBOX_DEFAULT_PADDING_X, y: TEXTBOX_DEFAULT_PADDING_Y };
}

function isText(element: ElucimElement) {
  return element.type === 'text' || element.props.type === 'text';
}

function isTextBox(element: ElucimElement) {
  return element.type === 'textbox' || element.props.type === 'textbox';
}

function textWrapMode(value: unknown): TextWrapMode | undefined {
  return value === 'none' || value === 'word' || value === 'char' ? value : undefined;
}

function textBoxAutoFit(value: unknown): 'none' | 'shrink' | 'truncate' {
  return value === 'shrink' || value === 'truncate' || value === 'none' ? value : 'none';
}

function fontWeightValue(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function severityRank(severity: ElucimLayoutCheckSeverity) {
  return severity === 'error' ? 1 : 0;
}

function confidenceRank(confidence: ElucimLayoutRepairConfidence) {
  return confidence === 'safe' ? 1 : 0;
}

function documentsEqual(a: ElucimDocument, b: ElucimDocument) {
  return valuesEqual(a, b);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => valuesEqual(value, b[index]));
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => Object.prototype.hasOwnProperty.call(bRecord, key) && valuesEqual(aRecord[key], bRecord[key]));
}

function numberDetail(issue: ElucimLayoutIssue, key: string) {
  const value = issue.details?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function roundedDimension(value: number) {
  return Math.max(1, Math.ceil(value));
}

function roundedCoordinate(value: number) {
  return Math.round(value);
}
