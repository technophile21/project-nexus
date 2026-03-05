import { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';

/**
 * Owns PNG export state and the export handler.
 * Isolated so the export implementation can be swapped (e.g. SVG, PDF)
 * without touching the chart view.
 */
export function useGanttExport(
  exportRef: React.RefObject<HTMLDivElement>,
  title: string
) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const png = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.download = `${title}.png`;
      link.href = png;
      link.click();
    } finally {
      setExporting(false);
    }
  }, [exportRef, title]);

  return { exporting, handleExport };
}
