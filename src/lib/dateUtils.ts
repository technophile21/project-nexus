// Convert a Date to a "YYYY-MM-DD" key for holiday Set lookups.
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns Monday of the week containing `date`
export function snapToWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Returns Sunday of the week containing `date`
export function snapToWeekEnd(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Adds N calendar days to a date
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Parse "DD-MM-YYYY" into a Date.
// Round-trip validation rejects overflowing values like 31-02-2026 or 99-99-9999.
export function parseDateStr(s: string): Date | null {
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

// Week column index: how many complete weeks from start to end.
// Uses UTC midnight values to avoid DST-induced rounding errors.
export function weeksBetween(start: Date, end: Date): number {
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((e - s) / (7 * 24 * 60 * 60 * 1000));
}

// Adjusts a date to the nearest working day (Mon–Fri, non-holiday).
// Never snaps backward. Skips consecutive weekends and holidays.
export function snapToWorkingStart(date: Date, holidays?: Set<string>): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Advance forward until we land on a Mon–Fri non-holiday
  while (true) {
    const dow = d.getDay();
    if (dow === 6) { d.setDate(d.getDate() + 2); continue; } // Sat → Mon
    if (dow === 0) { d.setDate(d.getDate() + 1); continue; } // Sun → Mon
    if (holidays?.has(toDateKey(d))) { d.setDate(d.getDate() + 1); continue; } // Holiday → next day
    break;
  }
  return d;
}

// Count Mon–Fri non-holiday working days from start to end, inclusive.
export function countWorkingDays(start: Date, end: Date, holidays?: Set<string>): number {
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d.getTime() <= e.getTime()) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !holidays?.has(toDateKey(d))) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// Returns the date of the nth working day (Mon–Fri, non-holiday) counting from
// `date` as day 1. duration=1 returns date itself (if it is a working day).
export function addWorkingDays(date: Date, n: number, holidays?: Set<string>): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  let remaining = n - 1; // start date counts as day 1
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !holidays?.has(toDateKey(d))) remaining--;
  }
  return d;
}
