import { useState, useCallback } from 'react';
import type { ResolvedTask } from '../../types/gantt';
import type { Milestone } from '../../types/markers';
import type { TooltipData } from '../../components/molecules/Tooltip';

/**
 * Owns all hover interaction state for the chart:
 * - which bar is hovered (drives bar color logic)
 * - tooltip data and position
 */
export function useGanttInteraction(scrollRef: React.RefObject<HTMLDivElement>) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

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
    [scrollRef]
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
    [scrollRef]
  );

  return { hoveredId, tooltip, handleMouseEnter, handleMouseLeave, handleMilestoneEnter };
}
