import type { ResolvedTask, Section } from '../types/gantt';

// ── Layout constants ───────────────────────────────────────────────────
export const LAYOUT = {
  LABEL_WIDTH: 220,
  WEEK_WIDTH: 96,
  ROW_HEIGHT: 40,
  SECTION_HEADER_HEIGHT: 34,
  WEEK_HEADER_HEIGHT: 52,
  QUARTER_ROW_HEIGHT: 28,
  BAR_HEIGHT: 24,
  BAR_RADIUS: 5,
  BAR_PADDING_TOP: 8, // (ROW_HEIGHT - BAR_HEIGHT) / 2
  MILESTONE_COLOR: '#eab308', // amber-500
  MS_DIAMOND: 5,             // milestone diamond half-size
} as const;

// ── Row info ───────────────────────────────────────────────────────────
export interface RowInfo {
  type: 'section' | 'lane';
  sectionIdx: number;
  laneIdx?: number;
  y: number;
  tasks?: ResolvedTask[];
  sectionName?: string;
  sectionColor?: string;
}

/** Assign tasks to lanes so non-overlapping tasks share a row. */
function assignLanes(tasks: ResolvedTask[]): ResolvedTask[][] {
  const sorted = [...tasks].sort(
    (a, b) => a.resolvedStart.getTime() - b.resolvedStart.getTime()
  );
  const lanes: ResolvedTask[][] = [];
  const laneEnd: Date[] = [];
  for (const task of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (laneEnd[i].getTime() < task.resolvedStart.getTime()) {
        lanes[i].push(task);
        laneEnd[i] = task.resolvedEnd;
        placed = true;
        break;
      }
    }
    if (!placed) { lanes.push([task]); laneEnd.push(task.resolvedEnd); }
  }
  return lanes;
}

/** Build the flat list of rows (section headers + lane rows) with y positions. */
export function buildRows(sections: Section[], startY: number): { rows: RowInfo[]; totalHeight: number } {
  let totalHeight = startY;
  const rows: RowInfo[] = [];

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    rows.push({
      type: 'section',
      sectionIdx: si,
      y: totalHeight,
      sectionName: section.name,
      sectionColor: section.color,
    });
    totalHeight += LAYOUT.SECTION_HEADER_HEIGHT;

    const lanes = assignLanes(section.tasks);
    for (let li = 0; li < lanes.length; li++) {
      rows.push({
        type: 'lane',
        sectionIdx: si,
        laneIdx: li,
        y: totalHeight,
        tasks: lanes[li],
        sectionColor: section.color,
      });
      totalHeight += LAYOUT.ROW_HEIGHT;
    }
  }

  return { rows, totalHeight };
}

// ── Coordinate helpers ─────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of calendar days between two dates (UTC-based, DST-safe). */
function daysBetween(start: Date, end: Date): number {
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return (e - s) / MS_PER_DAY;
}

/** Convert a date to an x pixel position relative to chart start (day-precise, DST-safe). */
export function dateToX(date: Date, chartStart: Date, weekWidth: number = LAYOUT.WEEK_WIDTH): number {
  return (daysBetween(chartStart, date) / 7) * weekWidth;
}

/** Left edge of a task bar in pixels (day-precise so mid-week starts render correctly). */
export function barX(task: ResolvedTask, chartStart: Date, weekWidth: number = LAYOUT.WEEK_WIDTH): number {
  return dateToX(task.resolvedStart, chartStart, weekWidth);
}

/** Width of a task bar in pixels (from start day to end of last day, inclusive). */
export function barWidth(task: ResolvedTask, weekWidth: number = LAYOUT.WEEK_WIDTH): number {
  const dayWidth = weekWidth / 7;
  return (daysBetween(task.resolvedStart, task.resolvedEnd) + 1) * dayWidth;
}

// ── Bar color logic ────────────────────────────────────────────────────

/** Compute fill color and opacity for a bar given hover state. */
export function getBarColor(
  task: ResolvedTask,
  sectionColor: string,
  hoveredId: string | null,
  taskMap: Map<string, ResolvedTask>
): { fill: string; opacity: number } {
  if (hoveredId === null) return { fill: sectionColor, opacity: 0.85 };
  if (task.id === hoveredId) return { fill: sectionColor, opacity: 1 };
  const hovered = taskMap.get(hoveredId);
  if (!hovered) return { fill: sectionColor, opacity: 0.3 };
  if (hovered.dependency === task.id) return { fill: '#f97316', opacity: 1 };
  if (task.dependency === hoveredId) return { fill: '#22c55e', opacity: 1 };
  return { fill: sectionColor, opacity: 0.2 };
}
