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
// Uses floor so a Monday→Sunday span returns the correct column index.
export function weeksBetween(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerWeek);
}
