import React, { useCallback } from 'react';
import { v } from '../theme/tokens';

export interface ColumnDef {
  key: string;
  label: string;
  type: 'number' | 'string' | 'color';
  width?: number;
}

export interface ArrayEditorProps {
  columns: ColumnDef[];
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
  maxRows?: number;
  /** Template for a new row. Defaults to column defaults. */
  newRowTemplate?: Record<string, any>;
}

/**
 * Generic table editor for arrays of objects.
 * Used by BarChart (bars), Graph (nodes, edges), Polygon (points).
 */
export function ArrayEditor({ columns, rows, onChange, maxRows = 20, newRowTemplate }: ArrayEditorProps) {
  const handleCellChange = useCallback((rowIdx: number, key: string, value: any) => {
    const newRows = rows.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r);
    onChange(newRows);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    if (rows.length >= maxRows) return;
    const template = newRowTemplate ?? Object.fromEntries(
      columns.map(c => [c.key, c.type === 'number' ? 0 : c.type === 'color' ? '#4fc3f7' : ''])
    );
    onChange([...rows, template]);
  }, [rows, onChange, columns, maxRows, newRowTemplate]);

  const removeRow = useCallback((idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  }, [rows, onChange]);

  const moveRow = useCallback((from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const newRows = [...rows];
    const [removed] = newRows.splice(from, 1);
    newRows.splice(to, 0, removed);
    onChange(newRows);
  }, [rows, onChange]);

  return (
    <div style={{ fontSize: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 2, padding: '2px 0', borderBottom: `1px solid ${v('--elucim-editor-border-subtle')}` }}>
        <div style={{ width: 20 }} />
        {columns.map(col => (
          <div key={col.key} style={{
            flex: col.width ? `0 0 ${col.width}px` : 1,
            color: v('--elucim-editor-text-muted'),
            fontSize: 9,
            padding: '0 2px',
          }}>
            {col.label}
          </div>
        ))}
        <div style={{ width: 20 }} />
      </div>

      {/* Rows */}
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: 2, alignItems: 'center', padding: '1px 0' }}>
          {/* Row index / reorder */}
          <div style={{ width: 20, fontSize: 8, color: v('--elucim-editor-text-disabled'), textAlign: 'center', cursor: 'ns-resize' }}
            title="Drag to reorder"
            draggable
            onDragStart={e => e.dataTransfer.setData('text/plain', String(rowIdx))}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { const from = parseInt(e.dataTransfer.getData('text/plain')); moveRow(from, rowIdx); }}
          >
            {rowIdx}
          </div>
          {columns.map(col => (
            <div key={col.key} style={{ flex: col.width ? `0 0 ${col.width}px` : 1 }}>
              {col.type === 'color' ? (
                <input
                  type="color"
                  value={row[col.key] ?? '#000000'}
                  onChange={e => handleCellChange(rowIdx, col.key, e.target.value)}
                  style={{ width: '100%', height: 18, padding: 0, border: 'none', cursor: 'pointer' }}
                />
              ) : (
                <input
                  type={col.type === 'number' ? 'number' : 'text'}
                  value={row[col.key] ?? (col.type === 'number' ? 0 : '')}
                  onChange={e => handleCellChange(rowIdx, col.key, col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  style={{
                    width: '100%',
                    height: 18,
                    fontSize: 10,
                    padding: '1px 3px',
                    border: `1px solid ${v('--elucim-editor-border-subtle')}`,
                    borderRadius: 2,
                    background: v('--elucim-editor-input-bg'),
                    color: v('--elucim-editor-fg'),
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </div>
          ))}
          {/* Remove button */}
          <button
            onClick={() => removeRow(rowIdx)}
            title="Remove row"
            style={{
              width: 20,
              height: 18,
              fontSize: 10,
              border: 'none',
              borderRadius: 2,
              background: 'transparent',
              color: v('--elucim-editor-text-muted'),
              cursor: 'pointer',
              padding: 0,
              lineHeight: '18px',
            }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add row */}
      {rows.length < maxRows && (
        <button
          onClick={addRow}
          style={{
            width: '100%',
            padding: '3px 0',
            marginTop: 2,
            fontSize: 10,
            border: `1px dashed ${v('--elucim-editor-border-subtle')}`,
            borderRadius: 2,
            background: 'transparent',
            color: v('--elucim-editor-text-muted'),
            cursor: 'pointer',
          }}
        >
          + Add Row
        </button>
      )}
    </div>
  );
}

export interface MatrixEditorProps {
  values: number[][];
  onChange: (values: number[][]) => void;
}

/**
 * Grid editor for matrix values (rows × cols).
 */
export function MatrixEditor({ values, onChange }: MatrixEditorProps) {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;

  const handleCellChange = useCallback((r: number, c: number, val: number) => {
    const newValues = values.map((row, ri) =>
      ri === r ? row.map((cell, ci) => ci === c ? val : cell) : [...row]
    );
    onChange(newValues);
  }, [values, onChange]);

  const addRow = useCallback(() => {
    onChange([...values, new Array(cols).fill(0)]);
  }, [values, cols, onChange]);

  const removeRow = useCallback(() => {
    if (rows <= 1) return;
    onChange(values.slice(0, -1));
  }, [values, rows, onChange]);

  const addCol = useCallback(() => {
    onChange(values.map(row => [...row, 0]));
  }, [values, onChange]);

  const removeCol = useCallback(() => {
    if (cols <= 1) return;
    onChange(values.map(row => row.slice(0, -1)));
  }, [values, cols, onChange]);

  return (
    <div style={{ fontSize: 10 }}>
      {/* Grid */}
      <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${cols}, 40px)`, gap: 2 }}>
        {values.map((row, ri) =>
          row.map((cell, ci) => (
            <input
              key={`${ri}-${ci}`}
              type="number"
              value={cell}
              onChange={e => handleCellChange(ri, ci, parseFloat(e.target.value) || 0)}
              style={{
                width: 40,
                height: 20,
                fontSize: 10,
                padding: '1px 2px',
                border: `1px solid ${v('--elucim-editor-border-subtle')}`,
                borderRadius: 2,
                background: v('--elucim-editor-input-bg'),
                color: v('--elucim-editor-fg'),
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          ))
        )}
      </div>

      {/* Dimension controls */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
        <span style={{ color: v('--elucim-editor-text-muted'), fontSize: 9 }}>{rows}×{cols}</span>
        <button onClick={addRow} style={dimBtnStyle} title="Add row">+R</button>
        <button onClick={removeRow} style={dimBtnStyle} title="Remove row">−R</button>
        <button onClick={addCol} style={dimBtnStyle} title="Add column">+C</button>
        <button onClick={removeCol} style={dimBtnStyle} title="Remove column">−C</button>
      </div>
    </div>
  );
}

const dimBtnStyle: React.CSSProperties = {
  fontSize: 9,
  padding: '1px 4px',
  border: 'none',
  borderRadius: 2,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};
