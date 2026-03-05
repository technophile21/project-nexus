import type { Marker } from '../../features/gantt/types';
import { LAYOUT } from '../../lib/layoutEngine';
import type { Milestone } from '../../types/markers';

interface MarkerLayerProps {
  markers: Marker[];
  onMilestoneHover: (ms: Milestone, e: React.MouseEvent<SVGElement>) => void;
  onMilestoneLeave: () => void;
}

const MILESTONE_COLOR = LAYOUT.MILESTONE_COLOR;
const MS_DIAMOND = LAYOUT.MS_DIAMOND;

export function MarkerLayer({ markers, onMilestoneHover, onMilestoneLeave }: MarkerLayerProps) {
  return (
    <>
      {markers.map((marker, i) => {
        switch (marker.type) {
          case 'today':
            return (
              <g key={`marker-today-${i}`}>
                <line
                  x1={marker.x} y1={marker.headerHeight}
                  x2={marker.x} y2={marker.totalHeight}
                  stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3"
                />
                <rect
                  x={marker.x - 18} y={marker.totalHeight - marker.totalHeight + marker.headerHeight - LAYOUT.WEEK_HEADER_HEIGHT + 2}
                  width={36} height={16} rx={3} fill="#ef4444"
                />
                <text
                  x={marker.x} y={marker.totalHeight - marker.totalHeight + marker.headerHeight - LAYOUT.WEEK_HEADER_HEIGHT + 13}
                  fill="white" fontSize={10} fontWeight="600" textAnchor="middle"
                >
                  Today
                </text>
              </g>
            );

          case 'milestone': {
            const { ms, x: mx, totalHeight, headerHeight, weekRowY } = marker;
            const label = ms.name.length > 13 ? ms.name.slice(0, 12) + '…' : ms.name;
            const pillH = 14;
            const pillMaxW = LAYOUT.WEEK_WIDTH * 1.8;
            const pillW = Math.min(pillMaxW, Math.max(40, label.length * 7 + 16));
            const pillY = weekRowY + 4;
            const diamondCY = headerHeight - MS_DIAMOND - 1;

            return (
              <g
                key={`marker-ms-${ms.id}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => onMilestoneHover(ms, e)}
                onMouseLeave={onMilestoneLeave}
              >
                {/* Dashed vertical line through chart body */}
                <line
                  x1={mx} y1={headerHeight} x2={mx} y2={totalHeight}
                  stroke={MILESTONE_COLOR} strokeWidth={1.2} strokeDasharray="5 4" strokeOpacity={0.65}
                />
                {/* Thin stick from pill to diamond */}
                <line
                  x1={mx} y1={pillY + pillH + 2} x2={mx} y2={diamondCY - MS_DIAMOND}
                  stroke={MILESTONE_COLOR} strokeWidth={1} strokeOpacity={0.5}
                />
                {/* Label pill */}
                <rect
                  x={mx - pillW / 2} y={pillY} width={pillW} height={pillH} rx={4}
                  fill={MILESTONE_COLOR} fillOpacity={0.18}
                  stroke={MILESTONE_COLOR} strokeWidth={1} strokeOpacity={0.6}
                />
                <text
                  x={mx} y={pillY + pillH / 2 + 4}
                  fill={MILESTONE_COLOR} fontSize={9} fontWeight="700" textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  {label}
                </text>
                {/* Diamond at header/body boundary */}
                <polygon
                  points={`${mx},${diamondCY - MS_DIAMOND} ${mx + MS_DIAMOND},${diamondCY} ${mx},${diamondCY + MS_DIAMOND} ${mx - MS_DIAMOND},${diamondCY}`}
                  fill={MILESTONE_COLOR} stroke={MILESTONE_COLOR} strokeWidth={1}
                />
                {/* Wide invisible hit area */}
                <rect x={mx - 8} y={headerHeight} width={16} height={totalHeight - headerHeight} fill="transparent" />
              </g>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
