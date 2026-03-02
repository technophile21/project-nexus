import type { RawTask, ResolvedTask, Section, GanttData, Milestone, Quarter, ParseWarning } from './types';
import type { ParseResult } from './parser';

export const SECTION_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
];

// Distinct colors cycled per quarter
export const QUARTER_COLORS = [
  '#3b82f6', // blue   – Q1
  '#10b981', // emerald – Q2
  '#f59e0b', // amber   – Q3
  '#a855f7', // purple  – Q4
  '#06b6d4', // cyan    – Q5+
  '#f43f5e', // rose
];

// Returns Monday of the week containing `date`
export function snapToWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns Sunday of the week containing `date`
export function snapToWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Adds N calendar days to a date
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Parse "DD-MM-YYYY" into a Date.
// Round-trip validation rejects overflowing values like 31-02-2026 or 99-99-9999.
function parseDateStr(s: string): Date | null {
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

// Week column index: how many complete weeks from start to end
// Uses floor so a Monday→Sunday span returns the correct column index
export function weeksBetween(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerWeek);
}

export function resolveGanttData(parsed: ParseResult): { data: GanttData; warnings: ParseWarning[] } {
  const taskMap = new Map<string, ResolvedTask>();
  const resolvedSections: Section[] = [];
  const warnings: ParseWarning[] = [];

  // First pass: assign IDs and collect all raw tasks
  const allRawTasks: Array<{ raw: RawTask; id: string; sectionIdx: number; taskIdx: number }> = [];

  for (let si = 0; si < parsed.sections.length; si++) {
    const section = parsed.sections[si];
    for (let ti = 0; ti < section.tasks.length; ti++) {
      const raw = section.tasks[ti];
      const id = raw.explicitId ?? `_s${si}t${ti}`;
      allRawTasks.push({ raw, id, sectionIdx: si, taskIdx: ti });
    }
  }

  // Second pass: resolve dates in document order
  // Track prevEnd per section for orphan tasks
  const prevEndBySectionIdx = new Map<number, Date | null>();

  for (const { raw, id, sectionIdx } of allRawTasks) {
    let resolvedStart: Date;
    const prevEnd = prevEndBySectionIdx.get(sectionIdx) ?? null;

    if (raw.dependency) {
      const parent = taskMap.get(raw.dependency);
      if (parent) {
        // Default: start the Monday after the dependency ends (resolvedEnd is always a Sunday)
        resolvedStart = addDays(parent.resolvedEnd, 1);

        // If an explicit start date is also provided (Case 3 extended syntax), validate it
        if (raw.startDateStr) {
          const explicitDate = parseDateStr(raw.startDateStr);
          if (!explicitDate) {
            warnings.push({ message: `Task "${raw.name}" has an invalid start date "${raw.startDateStr}" — use DD-MM-YYYY format with a valid calendar date.` });
            // Keep: start after dependency
          } else if (explicitDate.getTime() <= parent.resolvedEnd.getTime()) {
            warnings.push({ message: `Task "${raw.name}" start date ${raw.startDateStr} falls on or before dependency "${raw.dependency}" end — starting after dependency instead.` });
            // Keep: start after dependency
          } else {
            // Valid constraint: explicit date is after dependency end, use it
            resolvedStart = snapToWeekStart(explicitDate);
          }
        }
      } else {
        // Dependency not yet resolved (forward reference or typo) — fall back to prevEnd or explicit date
        console.warn('[ganttUtils] Unresolved dependency "%s" for task "%s" — falling back to previous task end', raw.dependency, raw.name);
        warnings.push({ message: `Task "${raw.name}" depends on "${raw.dependency}" which was not found — check for typos.` });
        if (raw.startDateStr) {
          const explicitDate = parseDateStr(raw.startDateStr);
          resolvedStart = explicitDate ? snapToWeekStart(explicitDate) : (prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date()));
        } else {
          resolvedStart = prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date());
        }
      }
    } else if (raw.startDateStr) {
      const parsedDate = parseDateStr(raw.startDateStr);
      if (!parsedDate) {
        warnings.push({ message: `Task "${raw.name}" has an invalid start date "${raw.startDateStr}" — use DD-MM-YYYY format with a valid calendar date.` });
      }
      resolvedStart = parsedDate ? snapToWeekStart(parsedDate) : snapToWeekStart(new Date());
    } else {
      // Orphan: start after previous task in section (or today if first)
      resolvedStart = prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date());
    }

    // Ensure resolvedStart is a Monday (snap)
    resolvedStart = snapToWeekStart(resolvedStart);

    // End = Sunday of the week containing (start + duration - 1)
    const rawEnd = addDays(resolvedStart, raw.duration - 1);
    const resolvedEnd = snapToWeekEnd(rawEnd);

    const resolved: ResolvedTask = {
      ...raw,
      id,
      resolvedStart,
      resolvedEnd,
    };

    taskMap.set(id, resolved);
    prevEndBySectionIdx.set(sectionIdx, resolvedEnd);
  }

  // Build sections with resolved tasks
  for (let si = 0; si < parsed.sections.length; si++) {
    const section = parsed.sections[si];
    const color = SECTION_COLORS[si % SECTION_COLORS.length];
    const resolvedTasks: ResolvedTask[] = [];

    for (let ti = 0; ti < section.tasks.length; ti++) {
      const raw = section.tasks[ti];
      const id = raw.explicitId ?? `_s${si}t${ti}`;
      const resolved = taskMap.get(id);
      if (resolved) resolvedTasks.push(resolved);
    }

    resolvedSections.push({
      id: `s${si}`,
      name: section.name,
      color,
      tasks: resolvedTasks,
    });
  }

  // Resolve milestones
  const milestones: Milestone[] = [];
  for (let mi = 0; mi < parsed.milestones.length; mi++) {
    const pm = parsed.milestones[mi];
    const date = parseDateStr(pm.dateStr);
    if (!date) {
      console.warn('[ganttUtils] Invalid milestone date "%s" for "%s" — skipping', pm.dateStr, pm.name);
      warnings.push({ message: `Milestone "${pm.name}" has an invalid date "${pm.dateStr}" — use DD-MM-YYYY format.` });
      continue;
    }
    milestones.push({
      id: pm.explicitId ?? `_m${mi}`,
      name: pm.name,
      date,
    });
  }

  // Resolve quarters
  const quarters: Quarter[] = [];
  for (let qi = 0; qi < parsed.quarters.length; qi++) {
    const pq = parsed.quarters[qi];
    const startDate = parseDateStr(pq.startDateStr);
    const endDate = parseDateStr(pq.endDateStr);
    if (!startDate || !endDate) {
      console.warn('[ganttUtils] Invalid quarter dates "%s"/"%s" for "%s" — skipping', pq.startDateStr, pq.endDateStr, pq.name);
      warnings.push({ message: `Quarter "${pq.name}" has invalid dates — use DD-MM-YYYY format.` });
      continue;
    }
    quarters.push({
      name: pq.name,
      startDate,
      endDate,
      color: QUARTER_COLORS[qi % QUARTER_COLORS.length],
    });
  }

  // Compute chart bounds from tasks
  let chartStart = new Date(9999, 0, 1);
  let chartEnd = new Date(0, 0, 1);

  for (const task of taskMap.values()) {
    if (task.resolvedStart < chartStart) chartStart = task.resolvedStart;
    if (task.resolvedEnd > chartEnd) chartEnd = task.resolvedEnd;
  }

  // Expand bounds to include milestones
  for (const m of milestones) {
    if (m.date < chartStart) chartStart = m.date;
    if (m.date > chartEnd) chartEnd = m.date;
  }

  // Expand bounds to include quarters
  for (const q of quarters) {
    if (q.startDate < chartStart) chartStart = q.startDate;
    if (q.endDate > chartEnd) chartEnd = q.endDate;
  }

  // Fallback if nothing at all
  if (taskMap.size === 0 && milestones.length === 0 && quarters.length === 0) {
    chartStart = snapToWeekStart(new Date());
    chartEnd = addDays(chartStart, 13 * 7);
  }

  // Pad one week on each side
  chartStart = snapToWeekStart(addDays(chartStart, -7));
  chartEnd = snapToWeekEnd(addDays(chartEnd, 7));

  const totalWeeks = weeksBetween(chartStart, chartEnd) + 1;

  return {
    data: {
      title: parsed.title,
      sections: resolvedSections,
      taskMap,
      chartStart,
      chartEnd,
      totalWeeks,
      milestones,
      quarters,
    },
    warnings,
  };
}
