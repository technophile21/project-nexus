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
// Task / milestone IDs must start with a letter, then letters/digits/underscores only.
const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

function parseParams(params: string, taskName: string, warnings: ParseWarning[]): Omit<RawTask, 'name' | 'sectionId'> {
  const trimmed = params.trim();

  // Case 1: "after <depId> [,] <N>d"  — no explicit task ID
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
    ID_PATTERN.test(parts[0]) &&
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

  // Case 3: "<ID>, after <depId>[, <DATE>], <N>d"
  // The optional <DATE> allows specifying an earliest-start constraint alongside a dependency.
  if (
    parts.length >= 2 &&
    ID_PATTERN.test(parts[0]) &&
    parts[1].toLowerCase().startsWith('after ')
  ) {
    const depId = parts[1].slice(6).trim();
    let startDateStr: string | null = null;
    let durationStr: string | undefined;

    if (parts.length >= 4 && DATE_PATTERN.test(parts[2])) {
      // <ID>, after <depId>, <DATE>, <Nd>
      startDateStr = parts[2];
      durationStr = parts[3];
    } else {
      // <ID>, after <depId>, <Nd>
      durationStr = parts[2];
    }

    const dMatch = durationStr ? DURATION_PATTERN.exec(durationStr) : null;
    return {
      explicitId: parts[0],
      startDateStr,
      dependency: depId,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 4: "<ID>, <N>d" — explicit id + duration only, no date/dependency
  // Task starts after the previous task in the same section (or today if first).
  if (parts.length >= 2 && ID_PATTERN.test(parts[0]) && DURATION_PATTERN.exec(parts[1])) {
    const dMatch = DURATION_PATTERN.exec(parts[1])!;
    return {
      explicitId: parts[0],
      startDateStr: null,
      dependency: null,
      duration: parseInt(dMatch[1]),
    };
  }

  // Case 5: "<DATE>, <N>d"  — no explicit task ID
  if (parts.length >= 2 && DATE_PATTERN.test(parts[0])) {
    const dMatch = DURATION_PATTERN.exec(parts[1]);
    return {
      explicitId: null,
      startDateStr: parts[0],
      dependency: null,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 6: "<N>d" only — orphan duration, OR single valid ID with default duration
  if (parts.length === 1) {
    const dMatch = DURATION_PATTERN.exec(parts[0]);
    if (dMatch) {
      return { explicitId: null, startDateStr: null, dependency: null, duration: parseInt(dMatch[1]) };
    }
    if (ID_PATTERN.test(parts[0])) {
      return { explicitId: parts[0], startDateStr: null, dependency: null, duration: 7 };
    }
  }

  // Fallback: could not parse. Try to give a more specific reason.
  console.warn('[parser] Could not parse task params for "%s": "%s"', taskName, params);
  const firstPart = parts[0];
  // Detect an invalid ID: has letters (looks like an ID attempt) but fails ID_PATTERN
  if (
    firstPart &&
    !DATE_PATTERN.test(firstPart) &&
    !DURATION_PATTERN.exec(firstPart) &&
    /[A-Za-z]/.test(firstPart) &&
    !ID_PATTERN.test(firstPart)
  ) {
    warnings.push({
      message: `Task "${taskName}" has an invalid ID "${firstPart}" — IDs must start with a letter and contain only letters, digits, or underscores (e.g. T1, myTask).`,
    });
  } else {
    warnings.push({ message: `Task "${taskName}" parameters could not be parsed — check the syntax guide.` });
  }
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
          const [startStr, endStr] = [parts[0], parts[1]];
          if (!DATE_PATTERN.test(startStr) || !DATE_PATTERN.test(endStr)) {
            console.warn('[parser] Quarter "%s" has invalid date format', name);
            warnings.push({ message: `Quarter "${name}" has an invalid date format — use DD-MM-YYYY (e.g., 01-03-2026).` });
          } else {
            quarters.push({ name, startDateStr: startStr, endDateStr: endStr });
          }
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
        if (parts.length >= 2 && ID_PATTERN.test(parts[0]) && DATE_PATTERN.test(parts[1])) {
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

    // Req: task IDs are mandatory — warn if none was parsed
    if (!taskFields.explicitId) {
      warnings.push({ message: `Task "${taskName}" is missing a required ID — add an explicit ID (e.g. :T1, ...).` });
    }

    currentSection.tasks.push({
      name: taskName,
      sectionId,
      ...taskFields,
    });
  }

  return { title, sections, milestones, quarters, warnings };
}
