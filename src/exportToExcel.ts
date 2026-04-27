import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type { GanttData } from './types/gantt';
import { addDays, weeksBetween } from './lib/dateUtils';

// Convert #RRGGBB → FFRRGGBB for ExcelJS ARGB
function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export async function exportToExcel(data: GanttData): Promise<void> {
  const { title, sections, milestones, quarters, holidays, workingPeriod, chartStart, totalWeeks } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Project Nexus';
  const sheet = workbook.addWorksheet('Gantt Chart');

  // Name | ID | Start | End | Duration | BW% | After
  const META_COLS = 7;
  const totalCols = META_COLS + totalWeeks;

  // Build week start dates (one Monday per column)
  const weekDates: Date[] = Array.from({ length: totalWeeks }, (_, i) =>
    addDays(chartStart, i * 7)
  );

  // Holiday week indices (0-based) for quick lookup
  const holidayWeekSet = new Set<number>(
    holidays
      .map(h => weeksBetween(chartStart, h.date))
      .filter(i => i >= 0 && i < totalWeeks)
  );

  // ── Column widths ──────────────────────────────────────────────────────────
  sheet.columns = [
    { width: 30 }, // Name
    { width: 14 }, // ID
    { width: 13 }, // Start
    { width: 13 }, // End
    { width: 10 }, // Duration
    { width: 7  }, // BW%
    { width: 22 }, // After
    ...weekDates.map(() => ({ width: 8 })),
  ] as Partial<ExcelJS.Column>[];

  let headerRowCount = 0;

  // ── Working period row ─────────────────────────────────────────────────────
  if (workingPeriod) {
    const { startDate, endDate, workingDays } = workingPeriod;
    const label = `Working Period: ${format(startDate, 'dd MMM yyyy')} – ${format(endDate, 'dd MMM yyyy')}  |  ${workingDays} working days`;
    const wpRow = sheet.addRow([label, ...Array(totalCols - 1).fill(null)]);
    wpRow.height = 17;
    sheet.mergeCells(wpRow.number, 1, wpRow.number, totalCols);
    const cell = wpRow.getCell(1);
    cell.fill = solidFill('FFE0E7FF'); // indigo-100
    cell.font = { color: { argb: 'FF3730A3' }, size: 9 }; // indigo-800
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    headerRowCount++;
  }

  // ── Quarter header row ─────────────────────────────────────────────────────
  if (quarters.length > 0) {
    const qRow = sheet.addRow(Array(totalCols).fill(null));
    qRow.height = 18;

    // Default background for meta + uncovered timeline cells
    for (let c = 1; c <= totalCols; c++) {
      qRow.getCell(c).fill = solidFill('FFF1F5F9'); // slate-100
    }

    // Sort quarters chronologically so we can cap each one before the next starts
    const sortedQuarters = [...quarters].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    for (let qi = 0; qi < sortedQuarters.length; qi++) {
      const q = sortedQuarters[qi];
      const startIdx = Math.max(0, weeksBetween(chartStart, q.startDate));
      const rawEndIdx = Math.min(totalWeeks - 1, weeksBetween(chartStart, q.endDate));

      // Adjacent quarters can share the same week column — give it to the later quarter
      const nextQ = sortedQuarters[qi + 1];
      const nextStartIdx = nextQ ? Math.max(0, weeksBetween(chartStart, nextQ.startDate)) : Infinity;
      const endIdx = Math.min(rawEndIdx, nextStartIdx - 1);

      if (startIdx > endIdx) continue;

      const startCol = META_COLS + 1 + startIdx;
      const endCol   = META_COLS + 1 + endIdx;
      if (startCol < endCol) sheet.mergeCells(qRow.number, startCol, qRow.number, endCol);

      const qCell = qRow.getCell(startCol);
      qCell.value = q.name;
      qCell.fill = solidFill(hexToArgb(q.color));
      qCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      qCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    headerRowCount++;
  }

  // ── Week date header row ───────────────────────────────────────────────────
  const HEADER_ARGB = 'FF1E293B'; // slate-800
  const headerRow = sheet.addRow([
    'Task', 'ID', 'Start', 'End', 'Duration', 'BW%', 'After',
    ...weekDates.map(d => format(d, 'MMM d')),
  ]);
  headerRow.height = 22;
  headerRowCount++;

  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c);
    const wi = c - META_COLS - 1;
    const isHoliday = wi >= 0 && holidayWeekSet.has(wi);
    cell.fill   = solidFill(isHoliday ? 'FFFECACA' : HEADER_ARGB); // red-100 vs slate-800
    cell.font   = { bold: true, color: { argb: isHoliday ? 'FF991B1B' : 'FFE2E8F0' }, size: 10 };
    cell.alignment = { horizontal: c <= META_COLS ? 'left' : 'center', vertical: 'middle' };
  }

  // Freeze all header rows + meta columns
  sheet.views = [{ state: 'frozen', xSplit: META_COLS, ySplit: headerRowCount }];

  // ── Milestone rows ─────────────────────────────────────────────────────────
  const MS_ROW_ARGB    = 'FFFEF3C7'; // amber-100
  const MS_MARKER_ARGB = 'FFFBBF24'; // amber-400
  const MS_TEXT_ARGB   = 'FF92400E'; // amber-800

  for (const ms of milestones) {
    const weekIdx = weeksBetween(chartStart, ms.date);
    const values: (string | null)[] = [
      `◆ ${ms.name}`,
      ms.id.startsWith('_') ? null : ms.id,
      format(ms.date, 'dd-MM-yyyy'),
      null, null, null, null, // End, Duration, BW%, After
      ...weekDates.map((_, i) => (i === weekIdx ? '◆' : null)),
    ];
    const msRow = sheet.addRow(values);
    msRow.height = 18;

    for (let c = 1; c <= totalCols; c++) {
      const cell = msRow.getCell(c);
      const wi = c - META_COLS - 1;
      if (c <= META_COLS) {
        cell.fill = solidFill(MS_ROW_ARGB);
        cell.font = { bold: c === 1, color: { argb: MS_TEXT_ARGB }, size: 10 };
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: c === 1 ? 1 : 0 };
      } else {
        cell.fill = solidFill(holidayWeekSet.has(wi) ? 'FFFFD5D5' : 'FFFFFFFF');
      }
    }

    if (weekIdx >= 0 && weekIdx < totalWeeks) {
      const markerCell = msRow.getCell(META_COLS + 1 + weekIdx);
      markerCell.fill = solidFill(MS_MARKER_ARGB);
      markerCell.font = { bold: true, color: { argb: 'FF78350F' }, size: 11 };
      markerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // ── Sections and tasks ─────────────────────────────────────────────────────
  const ROW_BG_ARGB = 'FFFFFFFF';

  for (const section of sections) {
    const sectionArgb = hexToArgb(section.color);

    // Section header: embed capacity info in the label
    let sectionLabel = section.name;
    if (section.availableDays !== null) {
      const status =
        section.capacityStatus === 'over'     ? '⚠ Over' :
        section.capacityStatus === 'under'    ? '✓ Under' :
        section.capacityStatus === 'balanced' ? '✓ Balanced' : '';
      sectionLabel += `  |  Planned: ${section.plannedDays}d  |  Available: ${section.availableDays}d  |  ${status}`;
    } else if (section.plannedDays > 0) {
      sectionLabel += `  |  Planned: ${section.plannedDays}d`;
    }

    const sectionRow = sheet.addRow([sectionLabel, ...Array(totalCols - 1).fill(null)]);
    sectionRow.height = 20;
    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, totalCols);
    const sectionCell = sectionRow.getCell(1);
    sectionCell.fill = solidFill(sectionArgb);
    sectionCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    sectionCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Task rows
    for (const task of section.tasks) {
      const isAutoId = task.id.startsWith('_');
      const depsStr  = task.dependencies.length > 0 ? task.dependencies.join(', ') : null;
      const bwStr    = `${task.bandwidth}%`;

      const taskRowValues: (string | null)[] = [
        task.name,
        isAutoId ? null : task.id,
        format(task.resolvedStart, 'dd-MM-yyyy'),
        format(task.resolvedEnd, 'dd-MM-yyyy'),
        `${task.duration}d`,
        bwStr,
        depsStr,
        ...weekDates.map(() => null),
      ];
      const taskRow = sheet.addRow(taskRowValues);
      taskRow.height = 18;

      // Meta columns — white background
      for (let c = 1; c <= META_COLS; c++) {
        const cell = taskRow.getCell(c);
        cell.fill = solidFill(ROW_BG_ARGB);
        cell.font = { color: { argb: 'FF1E293B' }, size: 10 };
        cell.alignment = {
          horizontal: c === 1 || c === META_COLS ? 'left' : 'center',
          vertical: 'middle',
          indent: c === 1 ? 2 : 0,
        };
      }

      // Timeline week cells — holiday tint for empty cells
      for (let wi = 0; wi < totalWeeks; wi++) {
        taskRow.getCell(META_COLS + 1 + wi).fill =
          solidFill(holidayWeekSet.has(wi) ? 'FFFFF0F0' : ROW_BG_ARGB);
      }

      // Task bar: merge spanning week cells and display task name inside
      const startWeekIdx = Math.max(0, weeksBetween(chartStart, task.resolvedStart));
      const endWeekIdx   = Math.min(totalWeeks - 1, weeksBetween(chartStart, task.resolvedEnd));

      if (startWeekIdx <= endWeekIdx) {
        const startCol = META_COLS + 1 + startWeekIdx;
        const endCol   = META_COLS + 1 + endWeekIdx;
        if (startCol < endCol) sheet.mergeCells(taskRow.number, startCol, taskRow.number, endCol);

        const barCell = taskRow.getCell(startCol);
        barCell.value = task.name;
        barCell.fill  = solidFill(sectionArgb);
        barCell.font  = { color: { argb: 'FFFFFFFF' }, size: 9 };
        barCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      }
    }
  }

  // ── Holidays legend at the bottom ──────────────────────────────────────────
  if (holidays.length > 0) {
    sheet.addRow([]); // blank separator

    const legendHeaderRow = sheet.addRow(['Holidays', ...Array(totalCols - 1).fill(null)]);
    legendHeaderRow.height = 18;
    sheet.mergeCells(legendHeaderRow.number, 1, legendHeaderRow.number, totalCols);
    const lhCell = legendHeaderRow.getCell(1);
    lhCell.fill = solidFill('FFFECACA'); // red-100
    lhCell.font = { bold: true, color: { argb: 'FF991B1B' }, size: 10 };
    lhCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    for (const h of holidays) {
      const hRow = sheet.addRow([
        h.name ?? '(unnamed)',
        format(h.date, 'dd-MM-yyyy'),
        ...Array(totalCols - 2).fill(null),
      ]);
      hRow.height = 16;
      for (let c = 1; c <= totalCols; c++) {
        hRow.getCell(c).fill = solidFill('FFFFF0F0'); // very light red
      }
      hRow.getCell(1).font = { size: 10, color: { argb: 'FF7F1D1D' } };
      hRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
      hRow.getCell(2).font = { size: 10, color: { argb: 'FF7F1D1D' } };
      hRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `${title || 'gantt'}_${timestamp}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Excel Workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // user cancelled the dialog
      throw err;
    }
  } else {
    // Fallback for browsers without File System Access API (Firefox, Safari)
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
}
