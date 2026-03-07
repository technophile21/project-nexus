import { format } from 'date-fns';
import type { ResolvedTask } from '../../types/gantt';
import type { Milestone } from '../../types/markers';

const MILESTONE_COLOR = '#eab308';

export interface TooltipData {
  type: 'task' | 'milestone';
  task?: ResolvedTask;
  milestone?: Milestone;
  x: number;
  y: number;
}

interface TooltipProps {
  tooltip: TooltipData | null;
}

export function Tooltip({ tooltip }: TooltipProps) {
  if (!tooltip) return null;

  return (
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
            {tooltip.task.dependencies.length > 0 && (
              <div className="flex justify-between gap-4"><span>Depends on</span><span className="text-orange-400">{tooltip.task.dependencies.join(', ')}</span></div>
            )}
            {tooltip.task.dependencyError && (
              <div className="flex justify-between gap-4"><span className="text-red-400">Error</span><span className="text-red-300">{tooltip.task.dependencyError}</span></div>
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
  );
}
