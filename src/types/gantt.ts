import type { Milestone, Quarter } from './markers';

export interface RawTask {
  name: string;
  explicitId: string | null;
  startDateStr: string | null;
  dependencies: string[];
  duration: number; // days
  bandwidth: number; // 0–100, default 100
  sectionId: string;
}

export interface ResolvedTask extends RawTask {
  id: string; // explicitId or auto-generated "_s{i}t{j}"
  resolvedStart: Date; // Monday of start week
  resolvedEnd: Date; // Sunday of end week
  dependencyError: string | null; // set when any dep ID is missing or a cycle is detected
}

export interface Section {
  id: string;
  name: string;
  color: string;
  capacity: number; // 0–100, default 100
  plannedDays: number; // sum of raw task durations in this section
  availableDays: number | null; // workingPeriod.workingDays × capacity/100; null if no period
  capacityStatus: 'over' | 'under' | 'balanced' | null; // null if no period or 0% section
  tasks: ResolvedTask[];
}

export interface GanttData {
  title: string;
  workingPeriod: { startDate: Date; endDate: Date; workingDays: number } | null;
  sections: Section[];
  taskMap: Map<string, ResolvedTask>;
  chartStart: Date;
  chartEnd: Date;
  totalWeeks: number;
  milestones: Milestone[];
  quarters: Quarter[];
}
