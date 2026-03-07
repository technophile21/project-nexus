import type { Milestone, Quarter } from './markers';

export interface RawTask {
  name: string;
  explicitId: string | null;
  startDateStr: string | null;
  dependencies: string[];
  duration: number; // days
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
  tasks: ResolvedTask[];
}

export interface GanttData {
  title: string;
  sections: Section[];
  taskMap: Map<string, ResolvedTask>;
  chartStart: Date;
  chartEnd: Date;
  totalWeeks: number;
  milestones: Milestone[];
  quarters: Quarter[];
}
