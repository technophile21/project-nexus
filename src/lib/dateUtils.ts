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

// Adjusts an explicit start date to the nearest working day (Mon–Fri).
// Mon–Fri: unchanged. Saturday → next Monday. Sunday → next Monday.
// Never snaps backward — ensures the bar never appears before the specified date.
export function snapToWorkingStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2); // Sat → Mon
  else if (day === 0) d.setDate(d.getDate() + 1); // Sun → Mon
  return d;
}

// Returns the date of the nth working day counting from `date` as day 1.
// Skips Saturday and Sunday. duration=1 returns date itself, duration=5 from
// Monday returns Friday.
export function addWorkingDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  let remaining = n - 1; // start date counts as day 1
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}
