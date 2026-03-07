import type { RawTask } from '../../types/gantt';
import type { ParseWarning } from '../../types/parser';

const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const DURATION_PATTERN = /^(\d+)d$/;
// Task / milestone IDs must start with a letter, then letters/digits/underscores only.
const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Parse the space-separated IDs following the "after" keyword.
 * Validates each token against ID_PATTERN; invalid tokens emit a warning and are skipped.
 */
function parseDepIds(raw: string, taskName: string, warnings: ParseWarning[]): string[] {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const valid: string[] = [];
  for (const token of tokens) {
    if (ID_PATTERN.test(token)) {
      valid.push(token);
    } else {
      warnings.push({
        message: `Task "${taskName}" has an invalid dependency ID "${token}" — IDs must start with a letter and contain only letters, digits, or underscores.`,
      });
    }
  }
  return valid;
}

/**
 * Pure function — parses the colon-separated parameter string of a task line.
 * Pushes warnings into the provided array; never calls console.warn.
 *
 * Multiple dependencies are supported via space-separated IDs after "after":
 *   after dep1 dep2 dep3, 5d
 *   ID, after dep1 dep2, 5d
 */
export function parseParams(
  params: string,
  taskName: string,
  warnings: ParseWarning[]
): Omit<RawTask, 'name' | 'sectionId'> {
  const trimmed = params.trim();

  // Case 1: "after <depId ...> [,] <N>d"  — no explicit task ID
  if (trimmed.toLowerCase().startsWith('after ')) {
    const rest = trimmed.slice(6).trim();
    const parts = rest.split(',').map(p => p.trim());
    const dependencies = parseDepIds(parts[0] ?? '', taskName, warnings);
    const durationStr = parts[1]?.trim() ?? '';
    const dMatch = DURATION_PATTERN.exec(durationStr);
    return {
      explicitId: null,
      startDateStr: null,
      dependencies,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    // No params at all — orphan with default 7d
    return { explicitId: null, startDateStr: null, dependencies: [], duration: 7 };
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
      dependencies: [],
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 3: "<ID>, after <depId ...>[, <DATE>], <N>d"
  // The optional <DATE> allows specifying an earliest-start constraint alongside a dependency.
  if (
    parts.length >= 2 &&
    ID_PATTERN.test(parts[0]) &&
    parts[1].toLowerCase().startsWith('after ')
  ) {
    const dependencies = parseDepIds(parts[1].slice(6), taskName, warnings);
    let startDateStr: string | null = null;
    let durationStr: string | undefined;

    if (parts.length >= 4 && DATE_PATTERN.test(parts[2])) {
      // <ID>, after <depIds...>, <DATE>, <Nd>
      startDateStr = parts[2];
      durationStr = parts[3];
    } else {
      // <ID>, after <depIds...>, <Nd>
      durationStr = parts[2];
    }

    const dMatch = durationStr ? DURATION_PATTERN.exec(durationStr) : null;
    return {
      explicitId: parts[0],
      startDateStr,
      dependencies,
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 4: "<ID>, <N>d" — explicit id + duration only, no date/dependency
  if (parts.length >= 2 && ID_PATTERN.test(parts[0]) && DURATION_PATTERN.exec(parts[1])) {
    const dMatch = DURATION_PATTERN.exec(parts[1])!;
    return {
      explicitId: parts[0],
      startDateStr: null,
      dependencies: [],
      duration: parseInt(dMatch[1]),
    };
  }

  // Case 5: "<DATE>, <N>d"  — no explicit task ID
  if (parts.length >= 2 && DATE_PATTERN.test(parts[0])) {
    const dMatch = DURATION_PATTERN.exec(parts[1]);
    return {
      explicitId: null,
      startDateStr: parts[0],
      dependencies: [],
      duration: dMatch ? parseInt(dMatch[1]) : 7,
    };
  }

  // Case 6: "<N>d" only — orphan duration, OR single valid ID with default duration
  if (parts.length === 1) {
    const dMatch = DURATION_PATTERN.exec(parts[0]);
    if (dMatch) {
      return { explicitId: null, startDateStr: null, dependencies: [], duration: parseInt(dMatch[1]) };
    }
    if (ID_PATTERN.test(parts[0])) {
      return { explicitId: parts[0], startDateStr: null, dependencies: [], duration: 7 };
    }
  }

  // Fallback: could not parse. Give a specific reason when possible.
  const firstPart = parts[0];
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
  return { explicitId: null, startDateStr: null, dependencies: [], duration: 7 };
}
