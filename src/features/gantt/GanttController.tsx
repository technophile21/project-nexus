import { useRef, useMemo } from 'react';
import type { GanttData } from '../../types/gantt';
import { LAYOUT, barX, barWidth, getBarColor } from '../../lib/layoutEngine';
import { dateToX } from '../../lib/layoutEngine';
import { useGanttLayout } from './useGanttLayout';
import { useGanttInteraction } from './useGanttInteraction';
import { useGanttExport } from './useGanttExport';
import { GanttView } from './GanttView';
import { ChartToolbar } from '../../components/organisms/ChartToolbar';
import type { BarItem, Marker } from './types';

interface GanttControllerProps {
  data: GanttData | null;
}

export function GanttController({ data }: GanttControllerProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const layout = useGanttLayout(data);
  const interaction = useGanttInteraction(scrollRef);
  const { exporting, handleExport } = useGanttExport(exportRef, data?.title ?? 'gantt');

  // Transform resolved tasks → generic BarItems
  const barItems = useMemo<BarItem[]>(() => {
    if (!data || !layout) return [];
    const { rows } = layout;
    const items: BarItem[] = [];

    for (const row of rows) {
      if (row.type === 'section') {
        // Section header "bar" — uses height sentinel to distinguish in Bars organism
        items.push({
          id: `section-${row.sectionIdx}`,
          x: 0,
          y: row.y,
          width: 0,
          height: LAYOUT.SECTION_HEADER_HEIGHT,
          color: row.sectionColor!,
          opacity: 1,
          label: row.sectionName!,
          isHovered: false,
          task: null as any, // section rows carry no task
        });
        continue;
      }

      for (const task of row.tasks!) {
        const { fill, opacity } = getBarColor(task, row.sectionColor!, interaction.hoveredId, data.taskMap);
        items.push({
          id: task.id,
          x: barX(task, data.chartStart),
          y: row.y + LAYOUT.BAR_PADDING_TOP,
          width: barWidth(task, data.chartStart),
          height: LAYOUT.BAR_HEIGHT,
          color: fill,
          opacity,
          label: task.name,
          isHovered: task.id === interaction.hoveredId,
          task,
        });
      }
    }

    return items;
  }, [data, layout, interaction.hoveredId]);

  // Transform today + milestones → generic Marker[]
  const markers = useMemo<Marker[]>(() => {
    if (!data || !layout) return [];
    const { totalHeight, headerHeight, weekRowY, isToday, todayX } = layout;
    const result: Marker[] = [];

    if (isToday) {
      result.push({ type: 'today', x: todayX, totalHeight, headerHeight });
    }

    for (const ms of data.milestones) {
      const mx = dateToX(ms.date, data.chartStart);
      if (mx < -LAYOUT.WEEK_WIDTH || mx > layout.chartWidth + LAYOUT.WEEK_WIDTH) continue;
      result.push({ type: 'milestone', x: mx, totalHeight, headerHeight, weekRowY, ms });
    }

    return result;
  }, [data, layout]);

  if (!data || data.sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 bg-gray-950 h-full">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 8h4M7 12h8M7 16h5" strokeLinecap="round" />
        </svg>
        <p className="text-sm">Start typing in the editor to generate a chart</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950" ref={exportRef}>
      <ChartToolbar title={data.title} exporting={exporting} onExport={handleExport} />
      <GanttView
        data={data}
        layout={layout!}
        barItems={barItems}
        markers={markers}
        hoveredId={interaction.hoveredId}
        tooltip={interaction.tooltip}
        scrollRef={scrollRef}
        onBarHover={interaction.handleMouseEnter}
        onBarLeave={interaction.handleMouseLeave}
        onMilestoneHover={interaction.handleMilestoneEnter}
        onMilestoneLeave={interaction.handleMouseLeave}
      />
    </div>
  );
}
