import { useMemo } from 'react';
import type { GanttData } from '../types/gantt';
import type { ParseWarning } from '../types/parser';
import { parseGanttText } from '../lib/parser/parseGanttText';
import { resolveGanttData } from '../core/resolver';

interface UseGanttDataReturn {
  ganttData: GanttData | null;
  parseWarnings: ParseWarning[];
}

/**
 * Parses and resolves raw gantt text into GanttData.
 * Memoized: only re-runs when text changes.
 * All validation issues appear in parseWarnings — never throws.
 */
export function useGanttData(text: string): UseGanttDataReturn {
  return useMemo(() => {
    try {
      const parsed = parseGanttText(text);
      const { data, warnings: resolveWarnings } = resolveGanttData(parsed);
      return {
        ganttData: data,
        parseWarnings: [...parsed.warnings, ...resolveWarnings],
      };
    } catch (err) {
      console.error('[useGanttData] Failed to parse/resolve gantt data:', err);
      return { ganttData: null, parseWarnings: [] };
    }
  }, [text]);
}
