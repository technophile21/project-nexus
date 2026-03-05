// Re-exports from the new split parser files.
// Kept for backward compatibility during the migration — will be removed in Phase 3.
export type { ParsedMilestone, ParsedQuarter, ParseResult } from './types/parser';
export { parseGanttText } from './lib/parser/parseGanttText';
