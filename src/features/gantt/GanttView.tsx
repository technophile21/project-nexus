import { useRef } from 'react';
import type { GanttData } from '../../types/gantt';
import type { BarItem, Marker } from './types';
import type { TooltipData } from '../../components/molecules/Tooltip';
import type { GanttLayout } from './useGanttLayout';
import { LabelColumn } from '../../components/organisms/LabelColumn';
import { TimelineGrid } from '../../components/organisms/TimelineGrid';
import { QuarterHeader } from '../../components/organisms/QuarterHeader';
import { Bars } from '../../components/organisms/Bars';
import { MarkerLayer } from '../../components/organisms/MarkerLayer';
import { Tooltip } from '../../components/molecules/Tooltip';
import type { ResolvedTask } from '../../types/gantt';
import type { Milestone } from '../../types/markers';

interface GanttViewProps {
  data: GanttData;
  layout: GanttLayout;
  barItems: BarItem[];
  markers: Marker[];
  hoveredId: string | null;
  tooltip: TooltipData | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  onBarHover: (task: ResolvedTask, e: React.MouseEvent<SVGRectElement>) => void;
  onBarLeave: () => void;
  onMilestoneHover: (ms: Milestone, e: React.MouseEvent<SVGElement>) => void;
  onMilestoneLeave: () => void;
}

export function GanttView({
  data,
  layout,
  barItems,
  markers,
  hoveredId,
  tooltip,
  scrollRef,
  onBarHover,
  onBarLeave,
  onMilestoneHover,
  onMilestoneLeave,
}: GanttViewProps) {
  const labelRef = useRef<SVGSVGElement>(null);
  const { rows, totalHeight, chartWidth, headerHeight, weekRowY, hasQuarters } = layout;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Fixed label column */}
      <LabelColumn
        rows={rows}
        totalHeight={totalHeight}
        headerHeight={headerHeight}
        weekRowY={weekRowY}
        hoveredId={hoveredId}
        svgRef={labelRef}
      />

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative min-w-0">
        <svg
          width={chartWidth}
          height={totalHeight}
          style={{ fontFamily: 'system-ui, sans-serif', display: 'block' }}
        >
          <rect width={chartWidth} height={totalHeight} fill="#0f172a" />

          <TimelineGrid
            chartStart={data.chartStart}
            totalWeeks={data.totalWeeks}
            chartWidth={chartWidth}
            totalHeight={totalHeight}
            headerHeight={headerHeight}
            weekRowY={weekRowY}
            quarters={data.quarters}
          />

          {hasQuarters && (
            <QuarterHeader
              quarters={data.quarters}
              chartStart={data.chartStart}
              chartWidth={chartWidth}
            />
          )}

          <Bars
            items={barItems}
            chartWidth={chartWidth}
            onHover={onBarHover}
            onLeave={onBarLeave}
          />

          <MarkerLayer
            markers={markers}
            onMilestoneHover={onMilestoneHover}
            onMilestoneLeave={onMilestoneLeave}
          />
        </svg>

        <Tooltip tooltip={tooltip} />
      </div>
    </div>
  );
}
