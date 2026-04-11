import type { RawTask } from './gantt';

export interface ParseWarning {
  message: string;
  severity?: 'warning' | 'error';
}

export interface ParsedSection {
  name: string;
  capacity: number | null; // 0–100 if explicitly set; null = inherit defaultCapacity
  tasks: RawTask[];
}

export interface ParsedHoliday {
  dateStr: string;
}

export interface ParsedMilestone {
  name: string;
  explicitId: string | null;
  dateStr: string;
}

export interface ParsedQuarter {
  name: string;
  startDateStr: string;
  endDateStr: string;
}

export interface ParseResult {
  title: string;
  defaultCapacity: number; // 0–100, set via "availability N%" directive, default 100
  workingPeriod: { startDateStr: string; endDateStr: string } | null;
  sections: ParsedSection[];
  holidays: ParsedHoliday[];
  milestones: ParsedMilestone[];
  quarters: ParsedQuarter[];
  warnings: ParseWarning[];
}
