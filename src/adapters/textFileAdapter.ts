import type { DataSourceAdapter } from './DataSourceAdapter';

// Minimal types for File System Access API (not in default TS DOM lib)
type FSWritable = { write(data: string): Promise<void>; close(): Promise<void> };
type FSFileHandle = { name: string; createWritable(): Promise<FSWritable>; getFile(): Promise<File> };

const hasFSA = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
const hasSaveFilePicker = typeof window !== 'undefined' && 'showSaveFilePicker' in window;

/** Triggers a browser download dialog as a fallback when FSA API is unavailable. */
function downloadTxt(content: string, name: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.endsWith('.txt') ? name : name + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function writeToHandle(handle: FSFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Text file adapter using the File System Access API with a FileReader fallback.
 *
 * The file handle is owned by this adapter so it can save to the same file
 * without prompting. The hook (useFileIO) owns React state; this adapter
 * owns the imperative file system handle.
 */
export function createTextFileAdapter(): DataSourceAdapter & {
  /** Returns the current file handle, used by useFileIO to trigger legacy fallback open. */
  getLegacyInputTrigger(): (() => void) | null;
  setLegacyInputTrigger(fn: () => void): void;
} {
  let fileHandle: FSFileHandle | null = null;
  let legacyInputTrigger: (() => void) | null = null;

  return {
    id: 'text-file',

    getLegacyInputTrigger() {
      return legacyInputTrigger;
    },

    setLegacyInputTrigger(fn: () => void) {
      legacyInputTrigger = fn;
    },

    async open() {
      if (hasFSA) {
        try {
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Text files', accept: { 'text/plain': ['.txt'] } }],
          }) as FSFileHandle[];
          const file = await handle.getFile();
          const content = await file.text();
          fileHandle = handle;
          console.log('[textFileAdapter] Opened file:', handle.name);
          return { content, name: handle.name.replace(/\.txt$/, '') };
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.log('[textFileAdapter] Open file dialog cancelled by user');
            return null;
          }
          throw err;
        }
      } else {
        // Trigger the hidden <input type="file"> managed by useFileIO
        console.warn('[textFileAdapter] File System Access API not supported — using <input> fallback');
        legacyInputTrigger?.();
        return null; // useFileIO handles the result via onChange
      }
    },

    async save(content, name) {
      if (fileHandle) {
        try {
          await writeToHandle(fileHandle, content);
          const savedName = fileHandle.name.replace(/\.txt$/, '');
          console.log('[textFileAdapter] Saved:', fileHandle.name);
          return { name: savedName };
        } catch (err: any) {
          throw err;
        }
      } else {
        // No handle — delegate to saveAs
        return this.saveAs(content, name ?? 'untitled');
      }
    },

    async saveAs(content, suggestedName) {
      if (hasSaveFilePicker) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: suggestedName + '.txt',
            types: [{ description: 'Text files', accept: { 'text/plain': ['.txt'] } }],
          }) as FSFileHandle;
          await writeToHandle(handle, content);
          fileHandle = handle;
          const savedName = handle.name.replace(/\.txt$/, '');
          console.log('[textFileAdapter] Saved As:', handle.name);
          return { name: savedName };
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.log('[textFileAdapter] Save As dialog cancelled by user');
            return null;
          }
          throw err;
        }
      } else {
        // Fallback: browser download
        console.warn('[textFileAdapter] showSaveFilePicker not supported — using download fallback');
        downloadTxt(content, suggestedName);
        console.log('[textFileAdapter] Saved As (download fallback):', suggestedName + '.txt');
        return { name: suggestedName };
      }
    },
  };
}

/** Singleton adapter instance for the app. */
export const textFileAdapter = createTextFileAdapter();
