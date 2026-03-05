import type { DataSourceAdapter } from './DataSourceAdapter';

/**
 * Stub CSV adapter — validates the DataSourceAdapter interface contract.
 *
 * A real implementation would:
 * - open():   read a .csv file and convert rows to Gantt text syntax
 * - save():   serialise current GanttData back to CSV rows
 * - saveAs(): same as save() but always prompts for a new path
 *
 * This stub intentionally leaves those conversions unimplemented so that
 * TypeScript confirms the shape is correct without shipping dead code.
 */
export const csvAdapter: DataSourceAdapter = {
  id: 'csv',

  open(): Promise<{ content: string; name: string } | null> {
    // TODO: open a .csv file via FSA / FileReader and convert to Gantt text
    return Promise.resolve(null);
  },

  save(_content: string, _name: string | null): Promise<{ name: string } | null> {
    // TODO: serialise GanttData to CSV and write to the current file handle
    return Promise.resolve(null);
  },

  saveAs(_content: string, suggestedName: string): Promise<{ name: string } | null> {
    // TODO: serialise GanttData to CSV and prompt for a new save location
    void suggestedName;
    return Promise.resolve(null);
  },
};
