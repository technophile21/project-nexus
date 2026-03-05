import { format, addWeeks } from 'date-fns';
import type { Quarter } from '../../types/markers';
import { LAYOUT } from '../../lib/layoutEngine';
import { dateToX } from '../../lib/layoutEngine';

interface TimelineGridProps {
  chartStart: Date;
  totalWeeks: number;
  chartWidth: number;
  totalHeight: number;
  headerHeight: number;
  weekRowY: number;
  quarters: Quarter[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function TimelineGrid({
  chartStart,
  totalWeeks,
  chartWidth,
  totalHeight,
  headerHeight,
  weekRowY,
  quarters,
}: TimelineGridProps) {
  const { WEEK_WIDTH, WEEK_HEADER_HEIGHT } = LAYOUT;

  return (
    <>
      {/* Quarter body bands (render first, behind everything) */}
      {quarters.map((q, qi) => {
        const qx1 = Math.max(0, dateToX(q.startDate, chartStart));
        const qx2 = Math.min(chartWidth, dateToX(new Date(q.endDate.getTime() + MS_PER_DAY), chartStart));
        if (qx2 <= 0 || qx1 >= chartWidth) return null;
        return (
          <rect
            key={`qbody-${qi}`}
            x={qx1} y={headerHeight}
            width={qx2 - qx1} height={totalHeight - headerHeight}
            fill={q.color} fillOpacity={0.07}
          />
        );
      })}

      {/* Alternating week backgrounds */}
      {Array.from({ length: totalWeeks }).map((_, wi) =>
        wi % 2 === 0 ? (
          <rect key={wi} x={wi * WEEK_WIDTH} y={headerHeight} width={WEEK_WIDTH} height={totalHeight - headerHeight} fill="#ffffff05" />
        ) : null
      )}

      {/* Vertical week grid lines */}
      {Array.from({ length: totalWeeks + 1 }).map((_, wi) => (
        <line key={wi} x1={wi * WEEK_WIDTH} y1={0} x2={wi * WEEK_WIDTH} y2={totalHeight} stroke="#1e293b" strokeWidth={1} />
      ))}

      {/* Quarter vertical boundary lines */}
      {quarters.map((q, qi) => {
        const qx1 = dateToX(q.startDate, chartStart);
        const qx2 = dateToX(new Date(q.endDate.getTime() + MS_PER_DAY), chartStart);
        return (
          <g key={`qline-${qi}`}>
            {qx1 > 0 && qx1 < chartWidth && (
              <line x1={qx1} y1={0} x2={qx1} y2={totalHeight} stroke={q.color} strokeWidth={1.5} strokeOpacity={0.35} />
            )}
            {qx2 > 0 && qx2 < chartWidth && (
              <line x1={qx2} y1={0} x2={qx2} y2={totalHeight} stroke={q.color} strokeWidth={1.5} strokeOpacity={0.35} />
            )}
          </g>
        );
      })}

      {/* Header background */}
      <rect width={chartWidth} height={headerHeight} fill="#1e293b" />

      {/* Week date labels */}
      {Array.from({ length: totalWeeks }).map((_, wi) => {
        const weekDate = addWeeks(chartStart, wi);
        return (
          <text key={wi} x={wi * WEEK_WIDTH + 8} y={weekRowY + WEEK_HEADER_HEIGHT / 2 + 5} fill="#64748b" fontSize={11} fontWeight="500">
            {format(weekDate, 'MMM d')}
          </text>
        );
      })}

      {/* Header bottom border */}
      <line x1={0} y1={headerHeight} x2={chartWidth} y2={headerHeight} stroke="#334155" strokeWidth={1} />
    </>
  );
}
