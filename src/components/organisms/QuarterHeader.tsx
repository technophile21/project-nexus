import type { Quarter } from '../../types/markers';
import { LAYOUT, dateToX } from '../../lib/layoutEngine';

interface QuarterHeaderProps {
  quarters: Quarter[];
  chartStart: Date;
  chartWidth: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function QuarterHeader({ quarters, chartStart, chartWidth }: QuarterHeaderProps) {
  if (quarters.length === 0) return null;
  const { QUARTER_ROW_HEIGHT } = LAYOUT;

  return (
    <>
      {quarters.map((q, qi) => {
        const qx1 = Math.max(0, dateToX(q.startDate, chartStart));
        const qx2 = Math.min(chartWidth, dateToX(new Date(q.endDate.getTime() + MS_PER_DAY), chartStart));
        if (qx2 <= 0 || qx1 >= chartWidth) return null;
        const bandW = qx2 - qx1;
        return (
          <g key={`qhdr-${qi}`}>
            <rect x={qx1} y={0} width={bandW} height={QUARTER_ROW_HEIGHT} fill={q.color} fillOpacity={0.22} />
            <line x1={qx1} y1={0} x2={qx1} y2={QUARTER_ROW_HEIGHT} stroke={q.color} strokeWidth={2} strokeOpacity={0.7} />
            {bandW > 30 && (
              <text
                x={qx1 + bandW / 2} y={QUARTER_ROW_HEIGHT / 2 + 5}
                fill={q.color} fontSize={11} fontWeight="700" textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {q.name}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={QUARTER_ROW_HEIGHT} x2={chartWidth} y2={QUARTER_ROW_HEIGHT} stroke="#334155" strokeWidth={1} />
    </>
  );
}
