import { useMemo } from 'react';
import type { GanttData } from '../../types/gantt';
import { LAYOUT, buildRows } from '../../lib/layoutEngine';
import { snapToWeekStart, weeksBetween } from '../../lib/dateUtils';

/**
 * Computes all layout geometry for the chart from GanttData.
 * Pure derivation — no side effects or state.
 */
export function useGanttLayout(data: GanttData | null) {
  return useMemo(() => {
    if (!data) return null;

    const { sections, chartStart, totalWeeks, quarters } = data;

    const hasQuarters = quarters.length > 0;
    const headerHeight = hasQuarters
      ? LAYOUT.QUARTER_ROW_HEIGHT + LAYOUT.WEEK_HEADER_HEIGHT
      : LAYOUT.WEEK_HEADER_HEIGHT;
    const weekRowY = hasQuarters ? LAYOUT.QUARTER_ROW_HEIGHT : 0;

    const { rows, totalHeight } = buildRows(sections, headerHeight);
    const chartWidth = totalWeeks * LAYOUT.WEEK_WIDTH;

    // Today marker position
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayWeekStart = snapToWeekStart(today);
    const todayWeeksFromStart = weeksBetween(chartStart, todayWeekStart);
    const todayDayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const todayX = (todayWeeksFromStart + todayDayOfWeek / 7) * LAYOUT.WEEK_WIDTH;
    const isToday = todayWeeksFromStart >= 0 && todayWeeksFromStart < totalWeeks;

    // Milestone pill dimensions
    const pillH = 14;
    const pillMaxW = LAYOUT.WEEK_WIDTH * 1.8;
    const pillY = weekRowY + 4;
    const diamondCY = headerHeight - LAYOUT.MS_DIAMOND - 1;

    return {
      rows,
      totalHeight,
      chartWidth,
      headerHeight,
      weekRowY,
      hasQuarters,
      todayX,
      isToday,
      pillH,
      pillMaxW,
      pillY,
      diamondCY,
    };
  }, [data]);
}

export type GanttLayout = NonNullable<ReturnType<typeof useGanttLayout>>;
