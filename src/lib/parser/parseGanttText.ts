import type { ParseResult, ParseWarning } from '../../types/parser';
import { parseParams } from './parseParams';

const DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Pure function — converts raw gantt text into a ParseResult.
 * All validation issues are collected into ParseResult.warnings.
 * Never calls console.warn.
 */
export function parseGanttText(text: string): ParseResult {
  const lines = text.split('\n');
  let title = 'Gantt Chart';
  const sections: ParseResult['sections'] = [];
  const milestones: ParseResult['milestones'] = [];
  const quarters: ParseResult['quarters'] = [];
  const warnings: ParseWarning[] = [];
  let currentSection: ParseResult['sections'][number] | null = null;
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
        warnings.push({ message: `Quarter definition is missing a ":" separator — expected: quarter <name> :DD-MM-YYYY, DD-MM-YYYY` });
      } else {
        const name = rest.slice(0, ci).trim();
        const parts = rest.slice(ci + 1).split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const [startStr, endStr] = [parts[0], parts[1]];
          if (!DATE_PATTERN.test(startStr) || !DATE_PATTERN.test(endStr)) {
            warnings.push({ message: `Quarter "${name}" has an invalid date format — use DD-MM-YYYY (e.g., 01-03-2026).` });
          } else {
            quarters.push({ name, startDateStr: startStr, endDateStr: endStr });
          }
        } else {
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
        warnings.push({ message: `Milestone definition is missing a ":" separator — expected: milestone <name> :DD-MM-YYYY` });
      } else {
        const name = rest.slice(0, ci).trim();
        const params = rest.slice(ci + 1).trim();
        const parts = params.split(',').map(p => p.trim());
        if (parts.length >= 2 && ID_PATTERN.test(parts[0]) && DATE_PATTERN.test(parts[1])) {
          milestones.push({ name, explicitId: parts[0], dateStr: parts[1] });
        } else if (parts.length >= 1 && DATE_PATTERN.test(parts[0])) {
          milestones.push({ name, explicitId: null, dateStr: parts[0] });
        } else {
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
