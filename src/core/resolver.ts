import type { RawTask, ResolvedTask, Section, GanttData } from '../types/gantt';
import type { Milestone, Quarter } from '../types/markers';
import type { ParseResult, ParseWarning } from '../types/parser';
import { SECTION_COLORS, QUARTER_COLORS } from '../lib/colors';
import {
  parseDateStr,
  snapToWeekStart,
  snapToWeekEnd,
  snapToWorkingStart,
  addDays,
  addWorkingDays,
  weeksBetween,
} from '../lib/dateUtils';

/**
 * Detect cycles in the dependency graph using DFS.
 * Returns the set of task IDs that are part of a cycle.
 */
function detectCycles(idToRaw: Map<string, RawTask>): Set<string> {
  const cycleIds = new Set<string>();
  // visited: 0 = unvisited, 1 = in current path, 2 = fully visited
  const state = new Map<string, number>();

  function dfs(id: string, path: string[]): boolean {
    const s = state.get(id) ?? 0;
    if (s === 1) {
      // Found a cycle — mark all IDs in the current path that form the cycle
      const cycleStart = path.indexOf(id);
      for (let i = cycleStart; i < path.length; i++) cycleIds.add(path[i]);
      cycleIds.add(id);
      return true;
    }
    if (s === 2) return false;
    state.set(id, 1);
    const raw = idToRaw.get(id);
    if (raw) {
      for (const depId of raw.dependencies) {
        dfs(depId, [...path, id]);
      }
    }
    state.set(id, 2);
    return false;
  }

  for (const id of idToRaw.keys()) {
    if (!state.get(id)) dfs(id, []);
  }
  return cycleIds;
}

/**
 * Pure function — resolves raw parsed data into fully-positioned GanttData.
 * Computes task start/end dates, section colors, milestone positions, quarter
 * bounds, and overall chart dimensions.
 * Never calls console.warn; all issues are returned in the warnings array.
 */
export function resolveGanttData(parsed: ParseResult): { data: GanttData; warnings: ParseWarning[] } {
  const taskMap = new Map<string, ResolvedTask>();
  const resolvedSections: Section[] = [];
  const warnings: ParseWarning[] = [];

  // First pass: assign IDs and collect all raw tasks
  const allRawTasks: Array<{ raw: RawTask; id: string; sectionIdx: number; taskIdx: number }> = [];
  const idToRaw = new Map<string, RawTask>();

  for (let si = 0; si < parsed.sections.length; si++) {
    const section = parsed.sections[si];
    for (let ti = 0; ti < section.tasks.length; ti++) {
      const raw = section.tasks[ti];
      const id = raw.explicitId ?? `_s${si}t${ti}`;
      allRawTasks.push({ raw, id, sectionIdx: si, taskIdx: ti });
      idToRaw.set(id, raw);
    }
  }

  // Detect cycles before resolving dates
  const cycleTaskIds = detectCycles(idToRaw);
  if (cycleTaskIds.size > 0) {
    warnings.push({ message: `Circular dependency detected among tasks: ${[...cycleTaskIds].join(', ')} — affected tasks are highlighted in red.` });
  }

  // Second pass: resolve dates in document order
  // Track prevEnd per section for orphan tasks
  const prevEndBySectionIdx = new Map<number, Date | null>();

  for (const { raw, id, sectionIdx } of allRawTasks) {
    let resolvedStart: Date;
    let dependencyError: string | null = null;
    const prevEnd = prevEndBySectionIdx.get(sectionIdx) ?? null;

    if (cycleTaskIds.has(id)) {
      dependencyError = 'Circular dependency detected';
    }

    if (raw.dependencies.length > 0) {
      const missingIds: string[] = [];
      let latestParentEnd: Date | null = null;

      for (const depId of raw.dependencies) {
        const parent = taskMap.get(depId);
        if (parent) {
          if (!latestParentEnd || parent.resolvedEnd > latestParentEnd) {
            latestParentEnd = parent.resolvedEnd;
          }
        } else if (!cycleTaskIds.has(id)) {
          // Only report missing if not already flagged as a cycle member
          missingIds.push(depId);
        }
      }

      if (missingIds.length > 0) {
        const msg = `Unknown ${missingIds.length === 1 ? 'dependency' : 'dependencies'}: ${missingIds.join(', ')}`;
        warnings.push({ message: `Task "${raw.name}" — ${msg} — check for typos or forward references.` });
        if (!dependencyError) dependencyError = msg;
      }

      if (latestParentEnd) {
        // Default: start the Monday after the latest dependency ends (resolvedEnd is always a Sunday)
        resolvedStart = addDays(latestParentEnd, 1);

        // If an explicit start date is also provided, validate it
        if (raw.startDateStr) {
          const explicitDate = parseDateStr(raw.startDateStr);
          if (!explicitDate) {
            warnings.push({ message: `Task "${raw.name}" has an invalid start date "${raw.startDateStr}" — use DD-MM-YYYY format with a valid calendar date.` });
          } else if (explicitDate.getTime() <= latestParentEnd.getTime()) {
            warnings.push({ message: `Task "${raw.name}" start date ${raw.startDateStr} falls on or before the latest dependency end — starting after dependency instead.` });
          } else {
            resolvedStart = snapToWorkingStart(explicitDate);
          }
        }
      } else {
        // All deps missing or cycle — fall back to section sequencing
        if (raw.startDateStr) {
          const explicitDate = parseDateStr(raw.startDateStr);
          resolvedStart = explicitDate
            ? snapToWorkingStart(explicitDate)
            : (prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date()));
        } else {
          resolvedStart = prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date());
        }
      }
    } else if (raw.startDateStr) {
      const parsedDate = parseDateStr(raw.startDateStr);
      if (!parsedDate) {
        warnings.push({ message: `Task "${raw.name}" has an invalid start date "${raw.startDateStr}" — use DD-MM-YYYY format with a valid calendar date.` });
      }
      resolvedStart = parsedDate ? snapToWorkingStart(parsedDate) : snapToWeekStart(new Date());
    } else {
      // Orphan: start after previous task in section (or today if first)
      resolvedStart = prevEnd ? addDays(prevEnd, 1) : snapToWeekStart(new Date());
    }

    // End = Sunday of the week containing the last working day of this task
    const rawEnd = addWorkingDays(resolvedStart, raw.duration);
    const resolvedEnd = snapToWeekEnd(rawEnd);

    const resolved: ResolvedTask = { ...raw, id, resolvedStart, resolvedEnd, dependencyError };
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

    resolvedSections.push({ id: `s${si}`, name: section.name, color, tasks: resolvedTasks });
  }

  // Resolve milestones
  const milestones: Milestone[] = [];
  for (let mi = 0; mi < parsed.milestones.length; mi++) {
    const pm = parsed.milestones[mi];
    const date = parseDateStr(pm.dateStr);
    if (!date) {
      warnings.push({ message: `Milestone "${pm.name}" has an invalid date "${pm.dateStr}" — use DD-MM-YYYY format.` });
      continue;
    }
    milestones.push({ id: pm.explicitId ?? `_m${mi}`, name: pm.name, date });
  }

  // Resolve quarters
  const quarters: Quarter[] = [];
  for (let qi = 0; qi < parsed.quarters.length; qi++) {
    const pq = parsed.quarters[qi];
    const startDate = parseDateStr(pq.startDateStr);
    const endDate = parseDateStr(pq.endDateStr);
    if (!startDate || !endDate) {
      warnings.push({ message: `Quarter "${pq.name}" has invalid dates — use DD-MM-YYYY format.` });
      continue;
    }
    quarters.push({ name: pq.name, startDate, endDate, color: QUARTER_COLORS[qi % QUARTER_COLORS.length] });
  }

  // Compute chart bounds from tasks
  let chartStart = new Date(9999, 0, 1);
  let chartEnd = new Date(0, 0, 1);

  for (const task of taskMap.values()) {
    if (task.resolvedStart < chartStart) chartStart = task.resolvedStart;
    if (task.resolvedEnd > chartEnd) chartEnd = task.resolvedEnd;
  }

  for (const m of milestones) {
    if (m.date < chartStart) chartStart = m.date;
    if (m.date > chartEnd) chartEnd = m.date;
  }

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
