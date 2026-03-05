import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type { GanttData } from './types';
import { addDays, weeksBetween } from './ganttUtils';

// Convert #RRGGBB → FFRRGGBB for ExcelJS ARGB
function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase();
}


function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export async function exportToExcel(data: GanttData): Promise<void> {
  const { title, sections, milestones, chartStart, totalWeeks } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Project Nexus';
  const sheet = workbook.addWorksheet('Gantt Chart');

  const META_COLS = 5; // Name | ID | Start | End | Duration
  const totalCols = META_COLS + totalWeeks;

  // Build week start dates (one Monday per column)
  const weekDates: Date[] = Array.from({ length: totalWeeks }, (_, i) =>
    addDays(chartStart, i * 7)
  );

  // ── Column widths ──────────────────────────────────────────────────────────
  sheet.columns = [
    { width: 30 }, // Name
    { width: 14 }, // ID
    { width: 13 }, // Start
    { width: 13 }, // End
    { width: 10 }, // Duration
    ...weekDates.map(() => ({ width: 8 })),
  ] as Partial<ExcelJS.Column>[];

  // Freeze top row + first META_COLS columns so headers stay visible while scrolling
  sheet.views = [{ state: 'frozen', xSplit: META_COLS, ySplit: 1 }];

  // ── Row 1: Header ──────────────────────────────────────────────────────────
  const HEADER_ARGB = 'FF1E293B'; // slate-800
  const headerRow = sheet.addRow([
    'Task', 'ID', 'Start', 'End', 'Duration',
    ...weekDates.map(d => format(d, 'MMM d')),
  ]);
  headerRow.height = 22;
  for (let c = 1; c <= totalCols; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = solidFill(HEADER_ARGB);
    cell.font = { bold: true, color: { argb: 'FFE2E8F0' }, size: 10 };
    cell.alignment = { horizontal: c <= META_COLS ? 'left' : 'center', vertical: 'middle' };
  }

  // ── Milestone rows ─────────────────────────────────────────────────────────
  const MS_ROW_ARGB = 'FFFEF3C7';     // amber-100
  const MS_MARKER_ARGB = 'FFFBBF24';  // amber-400
  const MS_TEXT_ARGB = 'FF92400E';    // amber-800

  for (const ms of milestones) {
    const weekIdx = weeksBetween(chartStart, ms.date);
    const values: (string | null)[] = [
      `◆ ${ms.name}`,
      ms.id.startsWith('_') ? null : ms.id,
      format(ms.date, 'dd-MM-yyyy'),
      null,
      null,
      ...weekDates.map((_, i) => (i === weekIdx ? '◆' : null)),
    ];
    const msRow = sheet.addRow(values);
    msRow.height = 18;

    // Style all meta cells
    for (let c = 1; c <= META_COLS; c++) {
      const cell = msRow.getCell(c);
      cell.fill = solidFill(MS_ROW_ARGB);
      cell.font = { bold: c === 1, color: { argb: MS_TEXT_ARGB }, size: 10 };
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: c === 1 ? 1 : 0 };
    }

    // Marker cell in week column
    if (weekIdx >= 0 && weekIdx < totalWeeks) {
      const markerCell = msRow.getCell(META_COLS + 1 + weekIdx);
      markerCell.fill = solidFill(MS_MARKER_ARGB);
      markerCell.font = { bold: true, color: { argb: 'FF78350F' }, size: 11 };
      markerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // ── Sections and tasks ─────────────────────────────────────────────────────
  const ROW_BG_ARGB = 'FF0F172A'; // slate-950 (chart background)

  for (const section of sections) {
    const sectionArgb = hexToArgb(section.color);

    // Section header row — merged across all columns
    const sectionRow = sheet.addRow([section.name, ...Array(totalCols - 1).fill(null)]);
    sectionRow.height = 20;
    sheet.mergeCells(sectionRow.number, 1, sectionRow.number, totalCols);
    const sectionCell = sectionRow.getCell(1);
    sectionCell.fill = solidFill(sectionArgb);
    sectionCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    sectionCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Task rows
    for (const task of section.tasks) {
      const isAutoId = task.id.startsWith('_');
      const taskRowValues: (string | null)[] = [
        task.name,
        isAutoId ? null : task.id,
        format(task.resolvedStart, 'dd-MM-yyyy'),
        format(task.resolvedEnd, 'dd-MM-yyyy'),
        `${task.duration}d`,
        ...weekDates.map(() => null), // values filled via cell styling below
      ];
      const taskRow = sheet.addRow(taskRowValues);
      taskRow.height = 18;

      // Style meta columns
      for (let c = 1; c <= META_COLS; c++) {
        const cell = taskRow.getCell(c);
        cell.fill = solidFill(ROW_BG_ARGB);
        cell.font = { color: { argb: 'FFCBd5e1' }, size: 10 }; // slate-300
        cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle', indent: c === 1 ? 2 : 0 };
      }

      // Week cells — colored if task spans that week
      for (let i = 0; i < weekDates.length; i++) {
        const weekDate = weekDates[i];
        const cell = taskRow.getCell(META_COLS + 1 + i);
        const spansWeek = weekDate >= task.resolvedStart && weekDate <= task.resolvedEnd;
        cell.fill = solidFill(spansWeek ? sectionArgb : ROW_BG_ARGB);
        if (!spansWeek) {
          // Subtle grid tint on empty week cells
          cell.fill = solidFill(i % 2 === 0 ? '0F141F28' : ROW_BG_ARGB);
        }
      }
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title || 'gantt'}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
