/**
 * Contract for all data source adapters.
 *
 * To add a new data source (CSV, Excel, clipboard, etc.):
 * 1. Create a new file implementing this interface (e.g. csvAdapter.ts)
 * 2. Inject it into useFileIO in EditorController.tsx
 * No other files need to change.
 */
export interface DataSourceAdapter {
  /** Unique identifier for this adapter (e.g. 'text-file', 'csv'). */
  readonly id: string;

  /**
   * Prompt the user to open a file and return its content + display name.
   * Returns null if the user cancels.
   */
  open(): Promise<{ content: string; name: string } | null>;

  /**
   * Save content to the current file (no dialog if possible).
   * Returns the saved file name, or null if the user cancels.
   */
  save(content: string, name: string | null): Promise<{ name: string } | null>;

  /**
   * Always prompt for a new save location.
   * Returns the saved file name, or null if the user cancels.
   */
  saveAs(content: string, suggestedName: string): Promise<{ name: string } | null>;
}
