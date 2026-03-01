import { useState, useCallback, useRef } from 'react';
import { exportWithMediaRecorder, downloadBlob, type ExportOptions } from './videoExport';

export interface UseExportResult {
  /** Whether an export is currently in progress */
  isExporting: boolean;
  /** Export progress (0..1) */
  progress: number;
  /** Current frame being exported */
  currentFrame: number;
  /** Start exporting */
  startExport: (svgRef: SVGSVGElement, setFrame: (f: number) => void, options: ExportOptions) => Promise<void>;
  /** Cancel the current export */
  cancel: () => void;
}

/**
 * React hook for video export with progress tracking.
 *
 * Usage:
 *   const { isExporting, progress, startExport } = useExport();
 *
 *   const handleExport = () => {
 *     const svgEl = svgRef.current;
 *     startExport(svgEl, setFrame, { totalFrames: 180, fps: 60, width: 1920, height: 1080 });
 *   };
 */
export function useExport(): UseExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const cancelledRef = useRef(false);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const startExport = useCallback(async (
    svgElement: SVGSVGElement,
    setFrame: (f: number) => void,
    options: ExportOptions,
  ) => {
    cancelledRef.current = false;
    setIsExporting(true);
    setProgress(0);
    setCurrentFrame(0);

    try {
      const blob = await exportWithMediaRecorder(
        svgElement,
        async (frame) => {
          if (cancelledRef.current) throw new Error('Export cancelled');
          setFrame(frame);
          // Allow React to re-render
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => requestAnimationFrame(r));
        },
        {
          ...options,
          onProgress: (frame, total) => {
            setProgress(frame / total);
            setCurrentFrame(frame);
            options.onProgress?.(frame, total);
          },
        },
      );

      if (!cancelledRef.current) {
        const format = options.format ?? 'webm';
        downloadBlob(blob, `elucim-export.${format}`);
      }
    } catch (err) {
      if ((err as Error).message !== 'Export cancelled') {
        console.error('Export failed:', err);
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentFrame(0);
    }
  }, []);

  return { isExporting, progress, currentFrame, startExport, cancel };
}
