import { format } from 'date-fns';
import type { BarItem } from '../../features/gantt/types';
import type { ResolvedTask } from '../../types/gantt';
import { LAYOUT } from '../../lib/layoutEngine';

interface BarsProps {
  items: BarItem[];
  chartWidth: number;
  onHover: (task: ResolvedTask, e: React.MouseEvent<SVGRectElement>) => void;
  onLeave: () => void;
}

export function Bars({ items, chartWidth, onHover, onLeave }: BarsProps) {
  const { ROW_HEIGHT, BAR_HEIGHT, BAR_RADIUS, SECTION_HEADER_HEIGHT } = LAYOUT;

  // Group items by whether they're section rows (no task) or task rows
  // Items may also contain section-header placeholder entries from RowInfo
  return (
    <>
      {items.map((item) => {
        const { fill, opacity } = { fill: item.color, opacity: item.opacity };
        const by = item.y;
        const bx = item.x;
        const bw = item.width;

        if (item.height === SECTION_HEADER_HEIGHT) {
          // Section header row
          return (
            <g key={`bar-s-${item.id}`}>
              <rect x={0} y={item.y} width={chartWidth} height={SECTION_HEADER_HEIGHT} fill={item.color} fillOpacity={0.1} />
              <line x1={0} y1={item.y + SECTION_HEADER_HEIGHT} x2={chartWidth} y2={item.y + SECTION_HEADER_HEIGHT} stroke="#1e293b" strokeWidth={1} />
            </g>
          );
        }

        return (
          <g key={`bar-t-${item.id}`}>
            <line x1={0} y1={item.y + ROW_HEIGHT} x2={chartWidth} y2={item.y + ROW_HEIGHT} stroke="#1e293b" strokeWidth={1} />
            <rect
              x={bx} y={by} width={bw} height={BAR_HEIGHT} rx={BAR_RADIUS}
              fill={fill} fillOpacity={opacity}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s, fill 0.12s' }}
              onMouseEnter={e => onHover(item.task, e)}
              onMouseLeave={onLeave}
            />
            {item.isHovered && (
              <rect
                x={bx - 1} y={by - 1} width={bw + 2} height={BAR_HEIGHT + 2}
                rx={BAR_RADIUS + 1} fill="none"
                stroke={fill} strokeWidth={2} strokeOpacity={0.5}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {bw > 50 && (
              <text x={bx + 10} y={by + BAR_HEIGHT / 2 + 4} fill="white" fontSize={11} fontWeight="500"
                fillOpacity={opacity > 0.4 ? 0.9 : 0.4}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {item.task.duration}d
              </text>
            )}
            {bw > 90 && (
              <text x={bx + bw - 8} y={by + BAR_HEIGHT / 2 + 4} fill="white" fontSize={10} textAnchor="end"
                fillOpacity={opacity > 0.4 ? 0.65 : 0.3}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {format(item.task.resolvedEnd, 'MMM d')}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
