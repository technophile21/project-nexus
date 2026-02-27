import { useRef, useState, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { format, addWeeks } from 'date-fns';
import type { GanttData, ResolvedTask, Milestone } from '../types';
import { weeksBetween, snapToWeekStart } from '../ganttUtils';

// ── Layout constants ──────────────────────────────────────────────────
const LABEL_WIDTH = 220;
const WEEK_WIDTH = 96;
const ROW_HEIGHT = 40;
const SECTION_HEADER_HEIGHT = 34;
const WEEK_HEADER_HEIGHT = 52; // week-labels row
const QUARTER_ROW_HEIGHT = 28; // extra row above weeks when quarters exist
const BAR_HEIGHT = 24;
const BAR_RADIUS = 5;
const BAR_PADDING_TOP = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const MILESTONE_COLOR = '#eab308'; // amber-500
const MS_DIAMOND = 5; // milestone diamond half-size

// ── Helpers ────────────────────────────────────────────────────────────
interface RowInfo {
  type: 'section' | 'task';
  sectionIdx: number;
  taskIdx?: number;
  y: number;
  task?: ResolvedTask;
  sectionName?: string;
  sectionColor?: string;
}

interface TooltipData {
  type: 'task' | 'milestone';
  task?: ResolvedTask;
  milestone?: Milestone;
  x: number;
  y: number;
}

interface GanttChartProps {
  data: GanttData | null;
}

function getBarColor(
  task: ResolvedTask,
  sectionColor: string,
  hoveredId: string | null,
  taskMap: Map<string, ResolvedTask>
): { fill: string; opacity: number } {
  if (hoveredId === null) return { fill: sectionColor, opacity: 0.85 };
  if (task.id === hoveredId) return { fill: sectionColor, opacity: 1 };
  const hovered = taskMap.get(hoveredId);
  if (!hovered) return { fill: sectionColor, opacity: 0.3 };
  if (hovered.dependency === task.id) return { fill: '#f97316', opacity: 1 };
  if (task.dependency === hoveredId) return { fill: '#22c55e', opacity: 1 };
  return { fill: sectionColor, opacity: 0.2 };
}

export default function GanttChart({ data }: GanttChartProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<SVGSVGElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const noop = () => {};
    scrollEl.addEventListener('scroll', noop);
    return () => scrollEl.removeEventListener('scroll', noop);
  }, []);

  const handleMouseEnter = useCallback(
    (task: ResolvedTask, e: React.MouseEvent<SVGRectElement>) => {
      setHoveredId(task.id);
      const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
      const containerRect = scrollRef.current?.getBoundingClientRect();
      if (containerRect) {
        setTooltip({
          type: 'task',
          task,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 8,
        });
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const handleMilestoneEnter = useCallback(
    (ms: Milestone, e: React.MouseEvent<SVGElement>) => {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      const containerRect = scrollRef.current?.getBoundingClientRect();
      if (containerRect) {
        setTooltip({
          type: 'milestone',
          milestone: ms,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 8,
        });
      }
    },
    []
  );

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const png = await toPng(exportRef.current, { pixelRatio: 2, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.download = `${data?.title ?? 'gantt'}.png`;
      link.href = png;
      link.click();
    } finally {
      setExporting(false);
    }
  }, [data]);

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

  const { sections, taskMap, chartStart, totalWeeks, title, milestones, quarters } = data;

  const hasQuarters = quarters.length > 0;
  const headerHeight = hasQuarters ? QUARTER_ROW_HEIGHT + WEEK_HEADER_HEIGHT : WEEK_HEADER_HEIGHT;
  // y-offset where the week labels row starts (inside the header)
  const weekRowY = hasQuarters ? QUARTER_ROW_HEIGHT : 0;

  // ── Row layout ────────────────────────────────────────────────────────
  let totalHeight = headerHeight;
  const rows: RowInfo[] = [];

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    rows.push({ type: 'section', sectionIdx: si, y: totalHeight, sectionName: section.name, sectionColor: section.color });
    totalHeight += SECTION_HEADER_HEIGHT;
    for (let ti = 0; ti < section.tasks.length; ti++) {
      rows.push({ type: 'task', sectionIdx: si, taskIdx: ti, y: totalHeight, task: section.tasks[ti], sectionColor: section.color });
      totalHeight += ROW_HEIGHT;
    }
  }

  const chartWidth = totalWeeks * WEEK_WIDTH;

  // ── Date → x helpers ─────────────────────────────────────────────────
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function dateX(date: Date): number {
    return ((date.getTime() - chartStart.getTime()) / MS_PER_DAY / 7) * WEEK_WIDTH;
  }

  function barX(task: ResolvedTask): number {
    return weeksBetween(chartStart, task.resolvedStart) * WEEK_WIDTH;
  }

  function barWidth(task: ResolvedTask): number {
    const startCol = weeksBetween(chartStart, task.resolvedStart);
    const endCol = weeksBetween(chartStart, task.resolvedEnd);
    return (endCol - startCol + 1) * WEEK_WIDTH;
  }

  // ── Today marker ─────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWeekStart = snapToWeekStart(today);
  const todayWeeksFromStart = weeksBetween(chartStart, todayWeekStart);
  const todayDayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayX = (todayWeeksFromStart + todayDayOfWeek / 7) * WEEK_WIDTH;
  const isToday = todayWeeksFromStart >= 0 && todayWeeksFromStart < totalWeeks;

  // ── Milestone pill dimensions ─────────────────────────────────────────
  const PILL_H = 14;
  const PILL_MAX_W = WEEK_WIDTH * 1.8;
  // Stick connects bottom of pill to top of diamond
  const pillY = weekRowY + 4;
  const diamondCY = headerHeight - MS_DIAMOND - 1; // diamond center y

  return (
    <div className="flex flex-col h-full bg-gray-950" ref={exportRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0 bg-gray-900">
        <h1 className="text-base font-semibold text-gray-100 tracking-wide">{title}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
            <span>Hovered</span>
            <span className="inline-block w-3 h-3 rounded-sm bg-orange-500 ml-1" />
            <span>Depends on</span>
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500 ml-1" />
            <span>Dependent</span>
            <span className="inline-block w-3 h-3 rounded-sm ml-1" style={{ backgroundColor: MILESTONE_COLOR }} />
            <span>Milestone</span>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M8 1v9M5 7l3 3 3-3M2 12v1a2 2 0 002 2h8a2 2 0 002-2v-1" />
            </svg>
            {exporting ? 'Exporting…' : 'Export PNG'}
          </button>
        </div>
      </div>

      {/* Chart: fixed labels + scrollable timeline */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Fixed label column ── */}
        <div className="shrink-0 overflow-hidden" style={{ width: LABEL_WIDTH }}>
          <svg
            ref={labelRef}
            width={LABEL_WIDTH}
            height={totalHeight}
            style={{ fontFamily: 'system-ui, sans-serif', display: 'block' }}
          >
            <rect width={LABEL_WIDTH} height={totalHeight} fill="#0f172a" />

            {/* Header background (full height matches timeline) */}
            <rect width={LABEL_WIDTH} height={headerHeight} fill="#1e293b" />

            {/* "Task" label centered in the week row part */}
            <text
              x={14}
              y={weekRowY + WEEK_HEADER_HEIGHT / 2 + 5}
              fill="#64748b"
              fontSize={12}
              fontWeight="600"
            >
              Task
            </text>
            <line x1={0} y1={headerHeight} x2={LABEL_WIDTH} y2={headerHeight} stroke="#334155" strokeWidth={1} />

            {/* Label rows */}
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
              const task = row.task!;
              const isHovered = task.id === hoveredId;
              const dimmed = hoveredId !== null && !isHovered;
              return (
                <g key={`lbl-t-${task.id}`}>
                  <rect x={0} y={row.y} width={LABEL_WIDTH} height={ROW_HEIGHT} fill={isHovered ? '#1e293b' : 'transparent'} />
                  <line x1={0} y1={row.y + ROW_HEIGHT} x2={LABEL_WIDTH} y2={row.y + ROW_HEIGHT} stroke="#1e293b" strokeWidth={1} />
                  <text
                    x={14}
                    y={row.y + ROW_HEIGHT / 2 + 5}
                    fill={dimmed ? '#374151' : '#d1d5db'}
                    fontSize={12}
                    fontWeight={isHovered ? '600' : '400'}
                  >
                    {task.name}
                  </text>
                  {task.dependency && (
                    <circle
                      cx={LABEL_WIDTH - 14}
                      cy={row.y + ROW_HEIGHT / 2}
                      r={3.5}
                      fill={isHovered ? '#f97316' : dimmed ? '#1f2937' : '#475569'}
                    />
                  )}
                </g>
              );
            })}

            <line x1={LABEL_WIDTH - 1} y1={0} x2={LABEL_WIDTH - 1} y2={totalHeight} stroke="#334155" strokeWidth={1} />
          </svg>
        </div>

        {/* ── Scrollable timeline ── */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative min-w-0">
          <svg
            width={chartWidth}
            height={totalHeight}
            style={{ fontFamily: 'system-ui, sans-serif', display: 'block' }}
          >
            <rect width={chartWidth} height={totalHeight} fill="#0f172a" />

            {/* ── Quarter body bands (render first, behind everything) ── */}
            {quarters.map((q, qi) => {
              const qx1 = Math.max(0, dateX(q.startDate));
              const qx2 = Math.min(chartWidth, dateX(new Date(q.endDate.getTime() + MS_PER_DAY)));
              if (qx2 <= 0 || qx1 >= chartWidth) return null;
              return (
                <rect
                  key={`qbody-${qi}`}
                  x={qx1}
                  y={headerHeight}
                  width={qx2 - qx1}
                  height={totalHeight - headerHeight}
                  fill={q.color}
                  fillOpacity={0.07}
                />
              );
            })}

            {/* ── Alternating week backgrounds ── */}
            {Array.from({ length: totalWeeks }).map((_, wi) =>
              wi % 2 === 0 ? (
                <rect key={wi} x={wi * WEEK_WIDTH} y={headerHeight} width={WEEK_WIDTH} height={totalHeight - headerHeight} fill="#ffffff05" />
              ) : null
            )}

            {/* ── Vertical week grid lines ── */}
            {Array.from({ length: totalWeeks + 1 }).map((_, wi) => (
              <line key={wi} x1={wi * WEEK_WIDTH} y1={0} x2={wi * WEEK_WIDTH} y2={totalHeight} stroke="#1e293b" strokeWidth={1} />
            ))}

            {/* ── Quarter vertical boundary lines (over grid) ── */}
            {quarters.map((q, qi) => {
              const qx1 = dateX(q.startDate);
              const qx2 = dateX(new Date(q.endDate.getTime() + MS_PER_DAY));
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

            {/* ── Header background ── */}
            <rect width={chartWidth} height={headerHeight} fill="#1e293b" />

            {/* ── Quarter header row ── */}
            {hasQuarters && quarters.map((q, qi) => {
              const qx1 = Math.max(0, dateX(q.startDate));
              const qx2 = Math.min(chartWidth, dateX(new Date(q.endDate.getTime() + MS_PER_DAY)));
              if (qx2 <= 0 || qx1 >= chartWidth) return null;
              const bandW = qx2 - qx1;
              return (
                <g key={`qhdr-${qi}`}>
                  {/* Colored band */}
                  <rect x={qx1} y={0} width={bandW} height={QUARTER_ROW_HEIGHT} fill={q.color} fillOpacity={0.22} />
                  {/* Left border */}
                  <line x1={qx1} y1={0} x2={qx1} y2={QUARTER_ROW_HEIGHT} stroke={q.color} strokeWidth={2} strokeOpacity={0.7} />
                  {/* Quarter label — only show if band is wide enough */}
                  {bandW > 30 && (
                    <text
                      x={qx1 + bandW / 2}
                      y={QUARTER_ROW_HEIGHT / 2 + 5}
                      fill={q.color}
                      fontSize={11}
                      fontWeight="700"
                      textAnchor="middle"
                      style={{ userSelect: 'none' }}
                    >
                      {q.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Quarter row / week row divider */}
            {hasQuarters && (
              <line x1={0} y1={QUARTER_ROW_HEIGHT} x2={chartWidth} y2={QUARTER_ROW_HEIGHT} stroke="#334155" strokeWidth={1} />
            )}

            {/* ── Week date labels ── */}
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

            {/* ── Task rows ── */}
            {rows.map((row) => {
              if (row.type === 'section') {
                const color = row.sectionColor!;
                return (
                  <g key={`bar-s-${row.sectionIdx}`}>
                    <rect x={0} y={row.y} width={chartWidth} height={SECTION_HEADER_HEIGHT} fill={color} fillOpacity={0.1} />
                    <line x1={0} y1={row.y + SECTION_HEADER_HEIGHT} x2={chartWidth} y2={row.y + SECTION_HEADER_HEIGHT} stroke="#1e293b" strokeWidth={1} />
                  </g>
                );
              }

              const task = row.task!;
              const color = row.sectionColor!;
              const { fill, opacity } = getBarColor(task, color, hoveredId, taskMap);
              const bx = barX(task);
              const bw = barWidth(task);
              const by = row.y + BAR_PADDING_TOP;
              const isHovered = task.id === hoveredId;

              return (
                <g key={`bar-t-${task.id}`}>
                  <line x1={0} y1={row.y + ROW_HEIGHT} x2={chartWidth} y2={row.y + ROW_HEIGHT} stroke="#1e293b" strokeWidth={1} />

                  <rect
                    x={bx} y={by} width={bw} height={BAR_HEIGHT} rx={BAR_RADIUS}
                    fill={fill} fillOpacity={opacity}
                    style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s, fill 0.12s' }}
                    onMouseEnter={e => handleMouseEnter(task, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                  {isHovered && (
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
                      {task.duration}d
                    </text>
                  )}
                  {bw > 90 && (
                    <text x={bx + bw - 8} y={by + BAR_HEIGHT / 2 + 4} fill="white" fontSize={10} textAnchor="end"
                      fillOpacity={opacity > 0.4 ? 0.65 : 0.3}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {format(task.resolvedEnd, 'MMM d')}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Today line ── */}
            {isToday && (
              <g>
                <line x1={todayX} y1={headerHeight} x2={todayX} y2={totalHeight} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" />
                <rect x={todayX - 18} y={weekRowY + WEEK_HEADER_HEIGHT - 18} width={36} height={16} rx={3} fill="#ef4444" />
                <text x={todayX} y={weekRowY + WEEK_HEADER_HEIGHT - 7} fill="white" fontSize={10} fontWeight="600" textAnchor="middle">Today</text>
              </g>
            )}

            {/* ── Milestones ── */}
            {milestones.map((ms) => {
              const mx = dateX(ms.date);
              if (mx < -WEEK_WIDTH || mx > chartWidth + WEEK_WIDTH) return null;

              const label = ms.name.length > 13 ? ms.name.slice(0, 12) + '…' : ms.name;
              const pillW = Math.min(PILL_MAX_W, Math.max(40, label.length * 7 + 16));

              return (
                <g
                  key={`ms-${ms.id}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => handleMilestoneEnter(ms, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Dashed vertical line through chart body */}
                  <line
                    x1={mx} y1={headerHeight}
                    x2={mx} y2={totalHeight}
                    stroke={MILESTONE_COLOR} strokeWidth={1.2}
                    strokeDasharray="5 4" strokeOpacity={0.65}
                  />

                  {/* Thin stick from pill bottom to diamond */}
                  <line
                    x1={mx} y1={pillY + PILL_H + 2}
                    x2={mx} y2={diamondCY - MS_DIAMOND}
                    stroke={MILESTONE_COLOR} strokeWidth={1} strokeOpacity={0.5}
                  />

                  {/* Label pill */}
                  <rect
                    x={mx - pillW / 2} y={pillY}
                    width={pillW} height={PILL_H}
                    rx={4}
                    fill={MILESTONE_COLOR} fillOpacity={0.18}
                    stroke={MILESTONE_COLOR} strokeWidth={1} strokeOpacity={0.6}
                  />
                  <text
                    x={mx} y={pillY + PILL_H / 2 + 4}
                    fill={MILESTONE_COLOR} fontSize={9} fontWeight="700"
                    textAnchor="middle"
                    style={{ userSelect: 'none' }}
                  >
                    {label}
                  </text>

                  {/* Diamond marker at header-body boundary */}
                  <polygon
                    points={`${mx},${diamondCY - MS_DIAMOND} ${mx + MS_DIAMOND},${diamondCY} ${mx},${diamondCY + MS_DIAMOND} ${mx - MS_DIAMOND},${diamondCY}`}
                    fill={MILESTONE_COLOR}
                    stroke={MILESTONE_COLOR}
                    strokeWidth={1}
                  />

                  {/* Wide invisible hit area for easy hover */}
                  <rect
                    x={mx - 8} y={headerHeight}
                    width={16} height={totalHeight - headerHeight}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>

          {/* ── Tooltip ── */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-3 py-2.5 text-xs"
              style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)', minWidth: '190px' }}
            >
              {tooltip.type === 'task' && tooltip.task && (
                <>
                  <div className="font-semibold text-gray-100 mb-1.5">{tooltip.task.name}</div>
                  <div className="text-gray-400 space-y-0.5">
                    <div className="flex justify-between gap-4"><span>Start</span><span className="text-gray-200">{format(tooltip.task.resolvedStart, 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between gap-4"><span>End</span><span className="text-gray-200">{format(tooltip.task.resolvedEnd, 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between gap-4"><span>Duration</span><span className="text-gray-200">{tooltip.task.duration}d</span></div>
                    {tooltip.task.dependency && (
                      <div className="flex justify-between gap-4"><span>Depends on</span><span className="text-orange-400">{tooltip.task.dependency}</span></div>
                    )}
                    {tooltip.task.explicitId && (
                      <div className="flex justify-between gap-4"><span>ID</span><span className="text-indigo-400">{tooltip.task.explicitId}</span></div>
                    )}
                  </div>
                </>
              )}
              {tooltip.type === 'milestone' && tooltip.milestone && (
                <>
                  <div className="flex items-center gap-1.5 font-semibold mb-1.5">
                    <span style={{ color: MILESTONE_COLOR }}>◆</span>
                    <span className="text-gray-100">{tooltip.milestone.name}</span>
                  </div>
                  <div className="text-gray-400 space-y-0.5">
                    <div className="flex justify-between gap-4"><span>Date</span><span className="text-gray-200">{format(tooltip.milestone.date, 'dd MMM yyyy')}</span></div>
                    {tooltip.milestone.id && !tooltip.milestone.id.startsWith('_') && (
                      <div className="flex justify-between gap-4"><span>ID</span><span style={{ color: MILESTONE_COLOR }}>{tooltip.milestone.id}</span></div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
