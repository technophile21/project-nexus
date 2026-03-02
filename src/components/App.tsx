import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Editor from './Editor';
import GanttChart from './GanttChart';
import ErrorBanner from './ErrorBanner';
import { parseGanttText } from '../parser';
import { resolveGanttData } from '../ganttUtils';
import type { ParseWarning } from '../types';

const DEFAULT_TEXT = `title Tasks Planner
dateFormat DD-MM-YYYY
quarter Q1 :01-01-2026, 31-03-2026
quarter Q2 :01-04-2026, 30-06-2026
milestone Sprint Review :M1, 14-03-2026
milestone Release :01-06-2026
section Frontend
Task 1 :T1, 01-03-2026, 15d
Task 2 :T2, after T1, 20d
section Backend
Task 3 :T3, 01-03-2026, 20d
Task 4 :after T3, 14d
section QA
Task 5 :01-05-2026, 21d
Task 6 :14d`;

// Minimal types for File System Access API (not in default TS DOM lib)
type FSWritable = { write(data: string): Promise<void>; close(): Promise<void> };
type FSFileHandle = { name: string; createWritable(): Promise<FSWritable>; getFile(): Promise<File> };

const hasFSA = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

/** Legacy fallback: triggers a browser download dialog. */
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

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Holds the File System Access API handle for the currently open/saved file.
  // When set, Save writes directly to this handle without showing a dialog.
  const fileHandleRef = useRef<FSFileHandle | null>(null);

  // Fallback <input> for browsers without File System Access API.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { ganttData, parseWarnings } = useMemo(() => {
    try {
      const parsed = parseGanttText(text);
      const { data, warnings: rw } = resolveGanttData(parsed);
      return { ganttData: data, parseWarnings: [...parsed.warnings, ...rw] };
    } catch (err) {
      console.error('[App] Failed to parse/resolve gantt data:', err);
      return { ganttData: null, parseWarnings: [] };
    }
  }, [text]);

  const [fileErrors, setFileErrors] = useState<ParseWarning[]>([]);
  const [warningsDismissed, setWarningsDismissed] = useState(false);

  const warningsKey = parseWarnings.map(w => w.message).join('\n');
  useEffect(() => { setWarningsDismissed(false); }, [warningsKey]);

  const allWarnings = [...parseWarnings, ...fileErrors];

  const handleChange = useCallback((t: string) => {
    setText(t);
    setIsDirty(true);
  }, []);

  /** Write content to a file handle directly (no dialog). */
  const writeToHandle = useCallback(async (handle: FSFileHandle, content: string): Promise<void> => {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }, []);

  /** Open file using File System Access API (preferred) or <input> fallback. */
  const handleOpen = useCallback(async () => {
    if (hasFSA) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Text files', accept: { 'text/plain': ['.txt'] } }],
        }) as FSFileHandle[];
        const file = await handle.getFile();
        const content = await file.text();
        fileHandleRef.current = handle;
        setText(content);
        setFileName(handle.name.replace(/\.txt$/, ''));
        setIsDirty(false);
        setFileErrors([]);
        console.log('[App] Opened file:', handle.name);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.log('[App] Open file dialog cancelled by user');
        } else {
          console.error('[App] Failed to open file:', err);
          setFileErrors([{ message: `Failed to open file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
        }
      }
    } else {
      console.warn('[App] File System Access API not supported — using <input> fallback');
      fileInputRef.current?.click();
    }
  }, []);

  /** Fallback open handler for browsers without File System Access API. */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      fileHandleRef.current = null; // No handle available in legacy fallback mode
      setText(content);
      setFileName(file.name.replace(/\.txt$/, ''));
      setIsDirty(false);
      console.log('[App] Opened file (legacy fallback):', file.name);
    };
    reader.onerror = () => {
      console.error('[App] FileReader failed to read file:', file.name);
      setFileErrors([{ message: `Failed to read file "${file.name}".`, severity: 'error' }]);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, []);

  /**
   * Save As: always shows a picker (or download fallback).
   * Updates the file handle and fileName on success — fixes issue 1.
   * Defined before handleSave so handleSave can delegate to it.
   */
  const handleSaveAs = useCallback(async () => {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: (fileName ?? 'untitled') + '.txt',
          types: [{ description: 'Text files', accept: { 'text/plain': ['.txt'] } }],
        }) as FSFileHandle;
        await writeToHandle(handle, text);
        fileHandleRef.current = handle;
        const name = handle.name.replace(/\.txt$/, '');
        setFileName(name);
        setIsDirty(false);
        setFileErrors([]);
        console.log('[App] Saved As:', handle.name);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.log('[App] Save As dialog cancelled by user');
        } else {
          console.error('[App] Failed to Save As:', err);
          setFileErrors([{ message: `Failed to save file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
        }
      }
    } else {
      // Fallback: trigger a browser download
      const name = fileName ?? 'untitled';
      console.warn('[App] showSaveFilePicker not supported — using download fallback');
      downloadTxt(text, name);
      setFileName(name);
      setIsDirty(false);
      console.log('[App] Saved As (download fallback):', name + '.txt');
    }
  }, [text, fileName, writeToHandle]);

  /**
   * Save: overwrites the existing file directly if a handle is available (no dialog).
   * Falls back to Save As (shows picker) when no handle is set — fixes issue 2.
   */
  const handleSave = useCallback(async () => {
    if (fileHandleRef.current) {
      try {
        await writeToHandle(fileHandleRef.current, text);
        const name = fileHandleRef.current.name.replace(/\.txt$/, '');
        setFileName(name);
        setIsDirty(false);
        setFileErrors([]);
        console.log('[App] Saved:', fileHandleRef.current.name);
      } catch (err: any) {
        console.error('[App] Failed to save file:', err);
        setFileErrors([{ message: `Failed to save file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
      }
    } else {
      console.log('[App] No file handle — delegating to Save As');
      await handleSaveAs();
    }
  }, [text, writeToHandle, handleSaveAs]);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {allWarnings.length > 0 && !warningsDismissed && (
        <ErrorBanner warnings={allWarnings} onDismiss={() => setWarningsDismissed(true)} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={handleFileInputChange}
      />
      {/* Left panel: editor */}
      <div className="w-[380px] min-w-[280px] max-w-[520px] shrink-0 flex flex-col h-full">
        <Editor
          value={text}
          onChange={handleChange}
          fileName={fileName}
          isDirty={isDirty}
          onOpen={handleOpen}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
        />
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-700 shrink-0" />

      {/* Right panel: chart */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <GanttChart data={ganttData} />
      </div>
    </div>
  );
}
