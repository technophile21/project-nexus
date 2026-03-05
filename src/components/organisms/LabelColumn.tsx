import type { RowInfo } from '../../lib/layoutEngine';
import { LAYOUT } from '../../lib/layoutEngine';

interface LabelColumnProps {
  rows: RowInfo[];
  totalHeight: number;
  headerHeight: number;
  weekRowY: number;
  hoveredId: string | null;
  svgRef?: React.RefObject<SVGSVGElement>;
}

export function LabelColumn({ rows, totalHeight, headerHeight, weekRowY, hoveredId, svgRef }: LabelColumnProps) {
  const { LABEL_WIDTH, WEEK_HEADER_HEIGHT, SECTION_HEADER_HEIGHT, ROW_HEIGHT } = LAYOUT;

  return (
    <div className="shrink-0 overflow-hidden" style={{ width: LABEL_WIDTH }}>
      <svg
        ref={svgRef}
        width={LABEL_WIDTH}
        height={totalHeight}
        style={{ fontFamily: 'system-ui, sans-serif', display: 'block' }}
      >
        <rect width={LABEL_WIDTH} height={totalHeight} fill="#0f172a" />
        <rect width={LABEL_WIDTH} height={headerHeight} fill="#1e293b" />
        <text x={14} y={weekRowY + WEEK_HEADER_HEIGHT / 2 + 5} fill="#64748b" fontSize={12} fontWeight="600">
          Section
        </text>
        <line x1={0} y1={headerHeight} x2={LABEL_WIDTH} y2={headerHeight} stroke="#334155" strokeWidth={1} />

        {rows.map((row) => {
          if (row.type === 'section') {
            const color = row.sectionColor!;
            return (
              <g key={`lbl-s-${row.sectionIdx}`}>
                <rect x={0} y={row.y} width={LABEL_WIDTH} height={SECTION_HEADER_HEIGHT} fill={color} fillOpacity={0.18} />
                <rect x={0} y={row.y} width={4} height={SECTION_HEADER_HEIGHT} fill={color} fillOpacity={0.9} />
                <text x={14} y={row.y + SECTION_HEADER_HEIGHT / 2 + 5} fill={color} fontSize={12} fontWeight="700" letterSpacing="0.4">
                  {row.sectionName}
                </text>
                <line x1={0} y1={row.y + SECTION_HEADER_HEIGHT} x2={LABEL_WIDTH} y2={row.y + SECTION_HEADER_HEIGHT} stroke="#1e293b" strokeWidth={1} />
              </g>
            );
          }

          const laneHovered = hoveredId !== null && row.tasks!.some(t => t.id === hoveredId);
          const dimmed = hoveredId !== null && !laneHovered;
          return (
            <g key={`lbl-l-${row.sectionIdx}-${row.laneIdx}`}>
              <rect x={0} y={row.y} width={LABEL_WIDTH} height={ROW_HEIGHT} fill={laneHovered ? '#1e293b' : 'transparent'} fillOpacity={dimmed ? 0.4 : 1} />
              <line x1={0} y1={row.y + ROW_HEIGHT} x2={LABEL_WIDTH} y2={row.y + ROW_HEIGHT} stroke="#1e293b" strokeWidth={1} />
            </g>
          );
        })}

        <line x1={LABEL_WIDTH - 1} y1={0} x2={LABEL_WIDTH - 1} y2={totalHeight} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  );
}
