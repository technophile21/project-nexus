import type { RawTask } from './gantt';

export interface ParseWarning {
  message: string;
  severity?: 'warning' | 'error';
}

export interface ParsedSection {
  name: string;
  tasks: RawTask[];
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
  sections: ParsedSection[];
  milestones: ParsedMilestone[];
  quarters: ParsedQuarter[];
  warnings: ParseWarning[];
}
