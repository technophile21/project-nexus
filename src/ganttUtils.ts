// Re-exports from the new split utility files.
// Kept for backward compatibility during the migration — will be removed in Phase 3.
export { SECTION_COLORS, QUARTER_COLORS } from './lib/colors';
export { snapToWeekStart, snapToWeekEnd, addDays, weeksBetween } from './lib/dateUtils';
export { resolveGanttData } from './core/resolver';
