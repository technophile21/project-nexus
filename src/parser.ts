import type { RawTask, ParseWarning } from './types';

interface ParsedSection {
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

const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const DURATION_PATTERN = /^(\d+)d$/;
const WORD_PATTERN = /^\w+$/;

function parseParams(params: string, taskName: string, warnings: ParseWarning[]): Omit<RawTask, 'name' | 'sectionId'> {
  const trimmed = params.trim();

  // Case 1: "after <id> [,] <N>d"
  if (trimmed.toLowerCase().startsWith('after ')) {
    const rest = trimmed.slice(6).trim();
    const parts = rest.split(',').map(p => p.trim());
    const depId = parts[0].trim();
    const durationStr = parts[1]?.trim() ?? '';
    const dMatch = DURATION_PATTERN.exec(durationStr);
    return {
      explicitId: null,
      startDateStr: null,
      dependency: depId || null,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    // No params at all — orphan with default 7d
    return { explicitId: null, startDateStr: null, dependency: null, duration: 7 };
  }

  // Case 2: "<ID>, <DATE>, <N>d"
  if (
    parts.length >= 3 &&
    WORD_PATTERN.test(parts[0]) &&
    !DATE_PATTERN.test(parts[0]) &&
    DATE_PATTERN.test(parts[1])
  ) {
    const dMatch = DURATION_PATTERN.exec(parts[2]);
    return {
      explicitId: parts[0],
      startDateStr: parts[1],
      dependency: null,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 3: "<ID>, after <depId>, <N>d"
  if (
    parts.length >= 2 &&
    WORD_PATTERN.test(parts[0]) &&
    !DATE_PATTERN.test(parts[0]) &&
    parts[1].toLowerCase().startsWith('after ')
  ) {
    const depId = parts[1].slice(6).trim();
    const dMatch = parts[2] ? DURATION_PATTERN.exec(parts[2]) : null;
    return {
      explicitId: parts[0],
      startDateStr: null,
      dependency: depId,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 4: "<DATE>, <N>d"
  if (parts.length >= 2 && DATE_PATTERN.test(parts[0])) {
    const dMatch = DURATION_PATTERN.exec(parts[1]);
    return {
      explicitId: null,
      startDateStr: parts[0],
      dependency: null,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 5: "<N>d" only — orphan
  if (parts.length === 1) {
    const dMatch = DURATION_PATTERN.exec(parts[0]);
    if (dMatch) {
      return { explicitId: null, startDateStr: null, dependency: null, duration: parseInt(dMatch[1]) };
    }
    // Single ID with no duration — treat as id, default duration
    if (WORD_PATTERN.test(parts[0]) && !DATE_PATTERN.test(parts[0])) {
      return { explicitId: parts[0], startDateStr: null, dependency: null, duration: 7 };
    }
  }

  // Fallback: orphan 7d
  console.warn('[parser] Could not parse task params for "%s": "%s"', taskName, params);
  warnings.push({ message: `Task "${taskName}" parameters could not be parsed — check the syntax guide.` });
  return { explicitId: null, startDateStr: null, dependency: null, duration: 7 };
}

export function parseGanttText(text: string): ParseResult {
  const lines = text.split('\n');
  let title = 'Gantt Chart';
  const sections: ParsedSection[] = [];
  const milestones: ParsedMilestone[] = [];
  const quarters: ParsedQuarter[] = [];
  const warnings: ParseWarning[] = [];
  let currentSection: ParsedSection | null = null;
  let sectionIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // title
    if (line.toLowerCase().startsWith('title ')) {
      title = line.slice(6).trim();
      continue;
    }

    // dateFormat — accepted but not used
    if (line.toLowerCase().startsWith('dateformat ')) {
      continue;
    }

    // quarter  "quarter <name> :<startDate>, <endDate>"
    if (line.toLowerCase().startsWith('quarter ')) {
      const rest = line.slice(8).trim();
      const ci = rest.indexOf(':');
      if (ci === -1) {
        console.warn('[parser] Malformed quarter line — missing ":" separator: "%s"', line);
        warnings.push({ message: `Quarter definition is missing a ":" separator — expected: quarter <name> :DD-MM-YYYY, DD-MM-YYYY` });
      } else {
        const name = rest.slice(0, ci).trim();
        const parts = rest.slice(ci + 1).split(',').map(p => p.trim());
        if (parts.length >= 2) {
          quarters.push({ name, startDateStr: parts[0], endDateStr: parts[1] });
        } else {
          console.warn('[parser] Quarter "%s" missing start or end date', name);
          warnings.push({ message: `Quarter "${name}" requires both a start and end date.` });
        }
      }
      continue;
    }

    // milestone  "milestone <name> :<id>, <date>"  OR  "milestone <name> :<date>"
    if (line.toLowerCase().startsWith('milestone ')) {
      const rest = line.slice(10).trim();
      const ci = rest.indexOf(':');
      if (ci === -1) {
        console.warn('[parser] Malformed milestone line — missing ":" separator: "%s"', line);
        warnings.push({ message: `Milestone definition is missing a ":" separator — expected: milestone <name> :DD-MM-YYYY` });
      } else {
        const name = rest.slice(0, ci).trim();
        const params = rest.slice(ci + 1).trim();
        const parts = params.split(',').map(p => p.trim());
        if (parts.length >= 2 && WORD_PATTERN.test(parts[0]) && !DATE_PATTERN.test(parts[0])) {
          // <id>, <date>
          milestones.push({ name, explicitId: parts[0], dateStr: parts[1] });
        } else if (parts.length >= 1 && DATE_PATTERN.test(parts[0])) {
          // <date> only
          milestones.push({ name, explicitId: null, dateStr: parts[0] });
        } else {
          console.warn('[parser] Could not parse milestone params for "%s": "%s"', name, params);
          warnings.push({ message: `Milestone "${name}" has an unrecognised parameter format — expected: :DD-MM-YYYY or :ID, DD-MM-YYYY` });
        }
      }
      continue;
    }

    // section
    if (line.toLowerCase().startsWith('section ')) {
      const name = line.slice(8).trim();
      currentSection = { name, tasks: [] };
      sections.push(currentSection);
      sectionIndex++;
      continue;
    }

    // task line: "Task Name :params"
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const taskName = line.slice(0, colonIdx).trim();
    if (!taskName) continue;

    const params = line.slice(colonIdx + 1);

    if (!currentSection) {
      currentSection = { name: 'Tasks', tasks: [] };
      sections.push(currentSection);
      sectionIndex++;
    }

    const sectionId = `s${sectionIndex}`;
    const taskFields = parseParams(params, taskName, warnings);

    currentSection.tasks.push({
      name: taskName,
      sectionId,
      ...taskFields,
    });
  }

  return { title, sections, milestones, quarters, warnings };
}
