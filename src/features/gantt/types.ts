import type { ResolvedTask } from '../../types/gantt';
import type { Milestone } from '../../types/markers';

// ── Layout constants ───────────────────────────────────────────────────
// Imported from lib/layoutEngine; re-exported here so feature code only
// needs one import path.
export { LAYOUT } from '../../lib/layoutEngine';
export type { RowInfo } from '../../lib/layoutEngine';

// ── Tooltip ────────────────────────────────────────────────────────────
export type { TooltipData } from '../../components/molecules/Tooltip';

// ── Marker union ───────────────────────────────────────────────────────
// All vertical marker types rendered by MarkerLayer.
// Add a new union member + a case in MarkerLayer to extend.
export type Marker =
  | { type: 'today'; x: number; totalHeight: number; headerHeight: number }
  | {
      type: 'milestone';
      x: number;
      totalHeight: number;
      headerHeight: number;
      weekRowY: number;
      ms: Milestone;
    };

// ── Bar item ───────────────────────────────────────────────────────────
// Generic bar primitive passed to the Bars organism.
export interface BarItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  label: string;
  endLabel?: string;
  isHovered: boolean;
  task: ResolvedTask; // retained so interaction handlers can reference it
}

// ── Chart props ────────────────────────────────────────────────────────
export interface GanttChartProps {
  data: import('../../types/gantt').GanttData | null;
}
