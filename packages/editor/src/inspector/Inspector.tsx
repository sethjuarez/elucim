import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ElementNode } from '@elucim/dsl';
import { useEditorState } from '../state/EditorProvider';
import { findElementById } from '../state/reducer';
import { CANVAS_ID } from '../state/types';
import { useEditorIcons } from '../theme/icons';
import { v } from '../theme/tokens';
import { ArrayEditor, MatrixEditor, type ColumnDef } from './ArrayEditor';

export interface InspectorProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inspector content — shows properties for the selected element.
 * Rendered inside a FloatingPanel by ElucimEditor.
 */
export function Inspector({ className, style }: InspectorProps) {
  const { state, dispatch } = useEditorState();
  const { selectedIds, document } = state;

  const isCanvasSelected = selectedIds.length === 1 && selectedIds[0] === CANVAS_ID;

  // Canvas properties handler
  const handleCanvasChange = useCallback((field: string, value: any) => {
    dispatch({ type: 'UPDATE_CANVAS', changes: { [field]: value } });
  }, [dispatch]);

  // Element properties handler
  const elementId = (!isCanvasSelected && selectedIds.length === 1) ? selectedIds[0] : null;
  const loc = elementId ? findElementById(document.root, elementId) : null;
  const element = loc?.element ?? null;

  const handleChange = useCallback((field: string, value: any) => {
    if (!elementId) return;
    dispatch({ type: 'UPDATE_ELEMENT', id: elementId, changes: { [field]: value } as any });
  }, [dispatch, elementId]);

  // Canvas inspector
  if (isCanvasSelected) {
    const root = document.root as any;
    return (
      <div
        className={`elucim-editor-inspector ${className ?? ''}`}
        style={{ padding: 12, overflowY: 'auto', fontSize: 12, minWidth: 200, ...style }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: v('--elucim-editor-accent') }}>
          Canvas
        </div>

        <InspectorSection title="Dimensions">
          <NumberField label="Width" value={root.width ?? 800} onChange={val => handleCanvasChange('width', val)} />
          <NumberField label="Height" value={root.height ?? 600} onChange={val => handleCanvasChange('height', val)} />
        </InspectorSection>

        <InspectorSection title="Appearance">
          <ColorField label="Background" value={root.background ?? '#0f172a'} onChange={val => handleCanvasChange('background', val)} />
        </InspectorSection>

        <InspectorSection title="Playback">
          <NumberField label="FPS" value={root.fps ?? 60} onChange={val => handleCanvasChange('fps', val)} />
          <NumberField label="Duration" value={root.durationInFrames ?? 120} onChange={val => handleCanvasChange('durationInFrames', val)} />
        </InspectorSection>
      </div>
    );
  }

  if (!element) {
    return (
      <div
        className={`elucim-editor-inspector ${className ?? ''}`}
        style={{
          padding: 12,
          color: v('--elucim-editor-text-muted'),
          fontSize: 12,
          ...style,
        }}
      >
        {selectedIds.length === 0 ? 'No selection' : `${selectedIds.length} elements selected`}
      </div>
    );
  }

  return (
    <div
      className={`elucim-editor-inspector ${className ?? ''}`}
      style={{
        padding: 12,
        overflowY: 'auto',
        fontSize: 12,
        minWidth: 200,
        ...style,
      }}
    >
      {/* Element type header */}
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: v('--elucim-editor-accent') }}>
        {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
        {'id' in element && element.id ? ` — ${element.id}` : ''}
      </div>

      {/* Position section */}
      <InspectorSection title="Position">
        <PositionFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Style section */}
      <InspectorSection title="Style">
        <StyleFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Animation section */}
      <InspectorSection title="Animation">
        <AnimationFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Transform section */}
      <InspectorSection title="Transform">
        <TransformFields element={element} onChange={handleChange} />
      </InspectorSection>

      {/* Element-specific section */}
      <ElementSpecificFields element={element} onChange={handleChange} />
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const icons = useEditorIcons();
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          cursor: 'pointer',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: v('--elucim-editor-text-secondary'),
          padding: '4px 0',
          borderBottom: `1px solid ${v('--elucim-editor-border')}`,
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {open ? icons.ChevronDown() : icons.ChevronRight()} {title}
        </span>
      </div>
      {open && <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────

function NumberField({ label, value, onChange, step = 1 }: {
  label: string; value: number | undefined; onChange: (v: number) => void; step?: number;
}) {
  const [localStr, setLocalStr] = React.useState(String(value ?? ''));
  const committedRef = React.useRef(value);
  // Sync external value changes (nudge, drag, undo) into local string
  React.useEffect(() => {
    setLocalStr(String(value ?? ''));
    committedRef.current = value;
  }, [value]);
  const commit = (str: string) => {
    const num = parseFloat(str);
    if (!isNaN(num)) { onChange(num); committedRef.current = num; }
    else setLocalStr(String(value ?? ''));
  };
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <span style={{ color: v('--elucim-editor-text-secondary'), minWidth: 44, fontSize: 10 }}>{label}</span>
      <input
        type="number"
        value={localStr}
        step={step}
        onChange={e => {
          setLocalStr(e.target.value);
          const num = parseFloat(e.target.value);
          if (!isNaN(num)) { onChange(num); committedRef.current = num; }
        }}
        onBlur={() => commit(localStr)}
        onKeyDown={e => { if (e.key === 'Enter') commit(localStr); }}
        style={{
          width: 60,
          background: v('--elucim-editor-input-bg'),
          border: `1px solid ${v('--elucim-editor-border')}`,
          borderRadius: 3,
          color: v('--elucim-editor-fg'),
          padding: '1px 4px',
          fontSize: 10,
          height: 20,
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <span style={{ color: v('--elucim-editor-text-secondary'), minWidth: 44, fontSize: 10 }}>{label}</span>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <input
          type="color"
          value={value?.startsWith('#') ? value : '#ffffff'}
          onChange={e => onChange(e.target.value)}
          style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 60,
            background: v('--elucim-editor-input-bg'),
            border: `1px solid ${v('--elucim-editor-border')}`,
            borderRadius: 3,
            color: v('--elucim-editor-fg'),
            padding: '1px 4px',
            fontSize: 10,
            height: 20,
            boxSizing: 'border-box',
          }}
        />
      </div>
    </label>
  );
}

function TextField({ label, value, onChange }: {
  label: string; value: string | undefined; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ color: v('--elucim-editor-text-secondary'), fontSize: 10 }}>{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: v('--elucim-editor-input-bg'),
          border: `1px solid ${v('--elucim-editor-border')}`,
          borderRadius: 3,
          color: v('--elucim-editor-fg'),
          padding: '2px 4px',
          fontSize: 10,
          height: 22,
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <span style={{ color: v('--elucim-editor-text-secondary'), minWidth: 44, fontSize: 10 }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 90,
          background: v('--elucim-editor-input-bg'),
          border: `1px solid ${v('--elucim-editor-border')}`,
          borderRadius: 3,
          color: v('--elucim-editor-fg'),
          padding: '1px 2px',
          fontSize: 9,
          height: 20,
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </label>
  );
}

function AddFieldButton({ options, onAdd }: { options: string[]; onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setFlipUp(spaceBelow < 120);
    }
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => {
          if (options.length === 1) { onAdd(options[0]); }
          else { setOpen(!open); }
        }}
        style={{
          background: 'none',
          border: `1px dashed ${v('--elucim-editor-border')}`,
          borderRadius: 3,
          color: v('--elucim-editor-text-muted'),
          fontSize: 9,
          padding: '2px 6px',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        + Add {options.length === 1 ? options[0] : 'property…'}
      </button>
      {open && options.length > 1 && (
        <div style={{
          position: 'absolute',
          ...(flipUp ? { bottom: '100%' } : { top: '100%' }),
          left: 0,
          right: 0,
          background: v('--elucim-editor-surface'),
          border: `1px solid ${v('--elucim-editor-border')}`,
          borderRadius: 3,
          zIndex: 10,
          padding: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onAdd(opt); setOpen(false); }}
              style={{
                padding: '3px 6px',
                fontSize: 9,
                cursor: 'pointer',
                borderRadius: 2,
                color: v('--elucim-editor-fg'),
              }}
              onMouseEnter={e => (e.currentTarget.style.background = v('--elucim-editor-border'))}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Position Fields (property-based) ──────────────────────────────────────

function PositionFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  return (
    <>
      {/* xy position */}
      {'x' in el && typeof el.x === 'number' && <NumberField label="X" value={el.x} onChange={v => onChange('x', v)} />}
      {'y' in el && typeof el.y === 'number' && <NumberField label="Y" value={el.y} onChange={v => onChange('y', v)} />}
      {/* center+radius */}
      {'cx' in el && <NumberField label="CX" value={el.cx} onChange={v => onChange('cx', v)} />}
      {'cy' in el && <NumberField label="CY" value={el.cy} onChange={v => onChange('cy', v)} />}
      {'r' in el && <NumberField label="R" value={el.r} onChange={v => onChange('r', v)} />}
      {/* dimensions */}
      {'width' in el && typeof el.width === 'number' && <NumberField label="W" value={el.width} onChange={v => onChange('width', v)} />}
      {'height' in el && typeof el.height === 'number' && <NumberField label="H" value={el.height} onChange={v => onChange('height', v)} />}
      {/* endpoints */}
      {'x1' in el && <NumberField label="X1" value={el.x1} onChange={v => onChange('x1', v)} />}
      {'y1' in el && <NumberField label="Y1" value={el.y1} onChange={v => onChange('y1', v)} />}
      {'x2' in el && <NumberField label="X2" value={el.x2} onChange={v => onChange('x2', v)} />}
      {'y2' in el && <NumberField label="Y2" value={el.y2} onChange={v => onChange('y2', v)} />}
      {/* origin (axes, functionPlot, vector, vectorField) */}
      {Array.isArray(el.origin) && (
        <>
          <NumberField label="Origin X" value={el.origin[0]} onChange={v => onChange('origin', [v, el.origin[1]])} />
          <NumberField label="Origin Y" value={el.origin[1]} onChange={v => onChange('origin', [el.origin[0], v])} />
        </>
      )}
      {/* math scale (distinct from CSS transform scale) */}
      {'scale' in el && typeof el.scale === 'number' && (
        <NumberField label="Scale" value={el.scale} onChange={v => onChange('scale', v)} />
      )}
    </>
  );
}

// ─── Style Fields ──────────────────────────────────────────────────────────

function StyleFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  const [showExtras, setShowExtras] = useState(false);
  const hasOpacity = el.opacity !== undefined && el.opacity !== 1;
  return (
    <>
      {'fill' in el && <ColorField label="Fill" value={el.fill} onChange={v => onChange('fill', v)} />}
      {'stroke' in el && <ColorField label="Stroke" value={el.stroke} onChange={v => onChange('stroke', v)} />}
      {'color' in el && <ColorField label="Color" value={el.color} onChange={v => onChange('color', v)} />}
      {'strokeWidth' in el && <NumberField label="Stroke W" value={el.strokeWidth} onChange={v => onChange('strokeWidth', v)} step={0.5} />}
      {(hasOpacity || showExtras) && (
        <NumberField label="Opacity" value={el.opacity ?? 1} onChange={v => onChange('opacity', v)} step={0.05} />
      )}
      {'fontSize' in el && <NumberField label="Font Size" value={el.fontSize} onChange={v => onChange('fontSize', v)} />}
      {!hasOpacity && !showExtras && (
        <AddFieldButton options={['Opacity']} onAdd={() => setShowExtras(true)} />
      )}
    </>
  );
}

// ─── Animation Fields ──────────────────────────────────────────────────────

const EASING_OPTIONS = [
  'linear',
  'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInSine', 'easeOutSine', 'easeInOutSine',
  'easeOutElastic', 'easeOutBounce',
  'easeInBack', 'easeOutBack',
];

function AnimationFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  const [extras, setExtras] = useState<Set<string>>(new Set());

  const hasFadeIn = el.fadeIn !== undefined && el.fadeIn > 0;
  const hasFadeOut = el.fadeOut !== undefined && el.fadeOut > 0;
  const hasDraw = el.draw !== undefined && el.draw > 0;
  const hasEasing = el.easing !== undefined && el.easing !== 'linear';

  const addable: string[] = [];
  if (!hasFadeIn && !extras.has('fadeIn')) addable.push('Fade In');
  if (!hasFadeOut && !extras.has('fadeOut')) addable.push('Fade Out');
  if (!hasDraw && !extras.has('draw')) addable.push('Draw');
  if (!hasEasing && !extras.has('easing')) addable.push('Easing');

  const addField = (label: string) => {
    const key = label === 'Fade In' ? 'fadeIn' : label === 'Fade Out' ? 'fadeOut' : label.toLowerCase();
    setExtras(prev => new Set(prev).add(key));
  };

  return (
    <>
      {(hasFadeIn || extras.has('fadeIn')) && (
        <NumberField label="Fade In" value={el.fadeIn} onChange={v => onChange('fadeIn', v)} />
      )}
      {(hasFadeOut || extras.has('fadeOut')) && (
        <NumberField label="Fade Out" value={el.fadeOut} onChange={v => onChange('fadeOut', v)} />
      )}
      {(hasDraw || extras.has('draw')) && (
        <NumberField label="Draw" value={el.draw} onChange={v => onChange('draw', v)} />
      )}
      {(hasEasing || extras.has('easing')) && (
        <SelectField label="Easing" value={el.easing ?? 'linear'} options={EASING_OPTIONS} onChange={v => onChange('easing', v)} />
      )}
      {addable.length > 0 && (
        <AddFieldButton options={addable} onAdd={addField} />
      )}
    </>
  );
}

// ─── Transform Fields ──────────────────────────────────────────────────────

function TransformFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  const [extras, setExtras] = useState<Set<string>>(new Set());

  const hasRotation = el.rotation !== undefined && el.rotation !== 0;
  const hasScale = el.scale !== undefined && el.scale !== 1;
  const hasTranslate = Array.isArray(el.translate);
  const hasOrigin = Array.isArray(el.rotationOrigin);
  const hasZIndex = el.zIndex !== undefined && el.zIndex !== 0;

  const addable: string[] = [];
  if (!hasRotation && !extras.has('rotation')) addable.push('Rotation');
  if (!hasScale && !extras.has('scale')) addable.push('Scale');
  if (!hasTranslate && !extras.has('translate')) addable.push('Translate');
  if (!hasOrigin && !extras.has('origin')) addable.push('Origin');
  if (!hasZIndex && !extras.has('zIndex')) addable.push('Z-Index');

  const addField = (label: string) => {
    const key = label === 'Z-Index' ? 'zIndex' : label.toLowerCase();
    setExtras(prev => new Set(prev).add(key));
  };

  const scaleVal = el.scale;
  const translateVal = el.translate;
  const rotOriginVal = el.rotationOrigin;

  return (
    <>
      {(hasRotation || extras.has('rotation')) && (
        <NumberField label="Rotation" value={el.rotation} onChange={v => onChange('rotation', v)} />
      )}
      {(hasScale || extras.has('scale')) && (
        <NumberField
          label="Scale"
          value={typeof scaleVal === 'number' ? scaleVal : (Array.isArray(scaleVal) ? scaleVal[0] : undefined)}
          onChange={v => onChange('scale', v)}
          step={0.1}
        />
      )}
      {(hasTranslate || extras.has('translate')) && (
        <>
          <NumberField
            label="Translate X"
            value={Array.isArray(translateVal) ? translateVal[0] : undefined}
            onChange={v => onChange('translate', [v, Array.isArray(translateVal) ? translateVal[1] : 0])}
          />
          <NumberField
            label="Translate Y"
            value={Array.isArray(translateVal) ? translateVal[1] : undefined}
            onChange={v => onChange('translate', [Array.isArray(translateVal) ? translateVal[0] : 0, v])}
          />
        </>
      )}
      {(hasOrigin || extras.has('origin')) && (
        <>
          <NumberField
            label="Origin X"
            value={Array.isArray(rotOriginVal) ? rotOriginVal[0] : undefined}
            onChange={v => onChange('rotationOrigin', [v, Array.isArray(rotOriginVal) ? rotOriginVal[1] : 0])}
          />
          <NumberField
            label="Origin Y"
            value={Array.isArray(rotOriginVal) ? rotOriginVal[1] : undefined}
            onChange={v => onChange('rotationOrigin', [Array.isArray(rotOriginVal) ? rotOriginVal[0] : 0, v])}
          />
        </>
      )}
      {(hasZIndex || extras.has('zIndex')) && (
        <NumberField label="Z-Index" value={el.zIndex} onChange={v => onChange('zIndex', v)} />
      )}
      {addable.length > 0 && (
        <AddFieldButton options={addable} onAdd={addField} />
      )}
    </>
  );
}

// ─── Element-Specific Fields (property-based) ──────────────────────────────

function ElementSpecificFields({ element, onChange }: { element: ElementNode; onChange: (field: string, value: any) => void }) {
  const el = element as any;
  const sections: React.ReactNode[] = [];

  // Text content
  if ('content' in el) {
    sections.push(
      <InspectorSection key="content" title="Content">
        <TextField label="Text" value={el.content} onChange={v => onChange('content', v)} />
        {'fontFamily' in el && <TextField label="Font" value={el.fontFamily} onChange={v => onChange('fontFamily', v)} />}
        {'textAnchor' in el && <TextField label="Anchor" value={el.textAnchor} onChange={v => onChange('textAnchor', v)} />}
      </InspectorSection>
    );
  }

  // LaTeX expression
  if ('expression' in el) {
    sections.push(
      <InspectorSection key="expression" title="Expression">
        <TextField label="LaTeX" value={el.expression} onChange={v => onChange('expression', v)} />
      </InspectorSection>
    );
  }

  // Function expression (functionPlot, vectorField)
  if ('fn' in el) {
    sections.push(
      <InspectorSection key="function" title="Function">
        <TextField label="f(x)" value={el.fn} onChange={v => onChange('fn', v)} />
        {'samples' in el && <NumberField label="Samples" value={el.samples} onChange={v => onChange('samples', v)} />}
      </InspectorSection>
    );
  }

  // Image source
  if ('src' in el) {
    sections.push(
      <InspectorSection key="image" title="Image">
        <TextField label="Source" value={el.src} onChange={v => onChange('src', v)} />
      </InspectorSection>
    );
  }

  // Arrow head
  if ('headSize' in el) {
    sections.push(
      <InspectorSection key="arrow" title="Arrow">
        <NumberField label="Head Size" value={el.headSize} onChange={v => onChange('headSize', v)} />
      </InspectorSection>
    );
  }

  // Matrix values
  if (Array.isArray(el.values)) {
    sections.push(
      <InspectorSection key="matrix" title="Matrix">
        <MatrixEditor
          values={el.values as number[][]}
          onChange={v => onChange('values', v)}
        />
        {'cellSize' in el && <NumberField label="Cell Size" value={el.cellSize ?? 48} onChange={v => onChange('cellSize', v)} />}
      </InspectorSection>
    );
  }

  // Axes-specific
  if ('showGrid' in el || 'showTicks' in el || 'showLabels' in el || 'tickStep' in el) {
    sections.push(
      <InspectorSection key="axes" title="Axes">
        {'tickStep' in el && <NumberField label="Tick Step" value={el.tickStep} onChange={v => onChange('tickStep', v)} step={0.5} />}
        {'axisColor' in el && <ColorField label="Axis Color" value={el.axisColor} onChange={v => onChange('axisColor', v)} />}
        {'gridColor' in el && <ColorField label="Grid Color" value={el.gridColor} onChange={v => onChange('gridColor', v)} />}
      </InspectorSection>
    );
  }

  // Domain/Range (axes, functionPlot, vectorField)
  if (Array.isArray(el.domain) || Array.isArray(el.range)) {
    sections.push(
      <InspectorSection key="domain" title="Domain / Range">
        {Array.isArray(el.domain) && (
          <>
            <NumberField label="Domain Min" value={el.domain[0]} onChange={v => onChange('domain', [v, el.domain[1]])} />
            <NumberField label="Domain Max" value={el.domain[1]} onChange={v => onChange('domain', [el.domain[0], v])} />
          </>
        )}
        {Array.isArray(el.range) && (
          <>
            <NumberField label="Range Min" value={el.range[0]} onChange={v => onChange('range', [v, el.range[1]])} />
            <NumberField label="Range Max" value={el.range[1]} onChange={v => onChange('range', [el.range[0], v])} />
          </>
        )}
      </InspectorSection>
    );
  }

  // Graph nodes/edges
  if (Array.isArray(el.nodes)) {
    const nodeColumns: ColumnDef[] = [
      { key: 'id', label: 'ID', type: 'string', width: 36 },
      { key: 'x', label: 'X', type: 'number', width: 40 },
      { key: 'y', label: 'Y', type: 'number', width: 40 },
      { key: 'label', label: 'Label', type: 'string', width: 40 },
    ];
    const edgeColumns: ColumnDef[] = [
      { key: 'from', label: 'From', type: 'string' },
      { key: 'to', label: 'To', type: 'string' },
    ];
    sections.push(
      <InspectorSection key="graph" title="Graph">
        <div style={{ fontSize: 9, color: v('--elucim-editor-text-muted'), padding: '2px 0' }}>Nodes</div>
        <ArrayEditor
          columns={nodeColumns}
          rows={el.nodes}
          onChange={rows => onChange('nodes', rows)}
          newRowTemplate={{ id: `n${el.nodes.length}`, x: 200, y: 200, label: '' }}
        />
        {Array.isArray(el.edges) && (
          <>
            <div style={{ fontSize: 9, color: v('--elucim-editor-text-muted'), padding: '4px 0 2px' }}>Edges</div>
            <ArrayEditor
              columns={edgeColumns}
              rows={el.edges}
              onChange={rows => onChange('edges', rows)}
              newRowTemplate={{ from: '', to: '' }}
            />
          </>
        )}
        {'nodeRadius' in el && <NumberField label="Node Radius" value={el.nodeRadius} onChange={v => onChange('nodeRadius', v)} />}
        {'nodeColor' in el && <ColorField label="Node Color" value={el.nodeColor} onChange={v => onChange('nodeColor', v)} />}
        {'edgeColor' in el && <ColorField label="Edge Color" value={el.edgeColor} onChange={v => onChange('edgeColor', v)} />}
      </InspectorSection>
    );
  }

  // BarChart bars
  if (Array.isArray(el.bars)) {
    const barColumns: ColumnDef[] = [
      { key: 'label', label: 'Label', type: 'string' },
      { key: 'value', label: 'Value', type: 'number', width: 48 },
      { key: 'color', label: 'Color', type: 'color', width: 32 },
    ];
    sections.push(
      <InspectorSection key="barchart" title="Bar Chart">
        <ArrayEditor
          columns={barColumns}
          rows={el.bars}
          onChange={rows => onChange('bars', rows)}
          newRowTemplate={{ label: 'New', value: 50 }}
        />
        {'barColor' in el && <ColorField label="Default Bar Color" value={el.barColor} onChange={v => onChange('barColor', v)} />}
        {'gap' in el && <NumberField label="Gap" value={el.gap} onChange={v => onChange('gap', v)} step={0.1} />}
        {'maxValue' in el && <NumberField label="Max Value" value={el.maxValue} onChange={v => onChange('maxValue', v)} />}
      </InspectorSection>
    );
  }

  // Vector props
  if (Array.isArray(el.to) && !Array.isArray(el.nodes)) {
    sections.push(
      <InspectorSection key="vector" title="Vector">
        <NumberField label="To X" value={el.to[0]} onChange={v => onChange('to', [v, el.to[1]])} />
        <NumberField label="To Y" value={el.to[1]} onChange={v => onChange('to', [el.to[0], v])} />
        {Array.isArray(el.from) && (
          <>
            <NumberField label="From X" value={el.from[0]} onChange={v => onChange('from', [v, el.from[1]])} />
            <NumberField label="From Y" value={el.from[1]} onChange={v => onChange('from', [el.from[0], v])} />
          </>
        )}
        {'label' in el && <TextField label="Label" value={el.label} onChange={v => onChange('label', v)} />}
      </InspectorSection>
    );
  }

  // BezierCurve control points
  if ('cx1' in el && typeof el.cx1 === 'number') {
    sections.push(
      <InspectorSection key="control" title="Control Points">
        <NumberField label="CX1" value={el.cx1} onChange={v => onChange('cx1', v)} />
        <NumberField label="CY1" value={el.cy1} onChange={v => onChange('cy1', v)} />
        {'cx2' in el && typeof el.cx2 === 'number' && (
          <>
            <NumberField label="CX2" value={el.cx2} onChange={v => onChange('cx2', v)} />
            <NumberField label="CY2" value={el.cy2} onChange={v => onChange('cy2', v)} />
          </>
        )}
      </InspectorSection>
    );
  }

  // Polygon points
  if (Array.isArray(el.points) && !Array.isArray(el.nodes)) {
    const pointColumns: ColumnDef[] = [
      { key: '0', label: 'X', type: 'number' },
      { key: '1', label: 'Y', type: 'number' },
    ];
    // Convert [x,y][] to {0:x, 1:y}[]
    const pointRows = (el.points as [number, number][]).map(([x, y]) => ({ '0': x, '1': y }));
    sections.push(
      <InspectorSection key="polygon" title="Polygon">
        <ArrayEditor
          columns={pointColumns}
          rows={pointRows}
          onChange={rows => onChange('points', rows.map(r => [r['0'], r['1']]))}
          newRowTemplate={{ '0': 0, '1': 0 }}
        />
        {'closed' in el && <TextField label="Closed" value={String(el.closed ?? true)} onChange={v => onChange('closed', v === 'true')} />}
      </InspectorSection>
    );
  }

  return sections.length > 0 ? <>{sections}</> : null;
}
