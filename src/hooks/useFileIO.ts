import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataSourceAdapter } from '../adapters/DataSourceAdapter';
import type { ParseWarning } from '../types/parser';

interface FileIOState {
  text: string;
  fileName: string | null;
  isDirty: boolean;
  fileErrors: ParseWarning[];
}

interface FileIOActions {
  handleChange: (t: string) => void;
  handleOpen: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  /** Callback for the legacy <input type="file"> element (non-FSA browsers). */
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Ref to attach to the hidden <input type="file"> element. */
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export type UseFileIOReturn = FileIOState & FileIOActions;

/**
 * Encapsulates all file I/O state and operations.
 * Accepts a DataSourceAdapter so the hook can be tested with a mock adapter.
 */
export function useFileIO(
  adapter: DataSourceAdapter & {
    setLegacyInputTrigger?: (fn: () => void) => void;
  },
  initialText: string
): UseFileIOReturn {
  const [text, setText] = useState(initialText);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [fileErrors, setFileErrors] = useState<ParseWarning[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Register the legacy input trigger with the adapter so it can call it when FSA is unavailable
  useEffect(() => {
    adapter.setLegacyInputTrigger?.(() => fileInputRef.current?.click());
  }, [adapter]);

  const handleChange = useCallback((t: string) => {
    setText(t);
    setIsDirty(true);
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const result = await adapter.open();
      if (result) {
        setText(result.content);
        setFileName(result.name);
        setIsDirty(false);
        setFileErrors([]);
      }
    } catch (err: any) {
      console.error('[useFileIO] Failed to open file:', err);
      setFileErrors([{ message: `Failed to open file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
    }
  }, [adapter]);

  const handleSaveAs = useCallback(async () => {
    try {
      const result = await adapter.saveAs(text, fileName ?? 'untitled');
      if (result) {
        setFileName(result.name);
        setIsDirty(false);
        setFileErrors([]);
      }
    } catch (err: any) {
      console.error('[useFileIO] Failed to save as:', err);
      setFileErrors([{ message: `Failed to save file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
    }
  }, [adapter, text, fileName]);

  const handleSave = useCallback(async () => {
    try {
      const result = await adapter.save(text, fileName);
      if (result) {
        setFileName(result.name);
        setIsDirty(false);
        setFileErrors([]);
      }
    } catch (err: any) {
      console.error('[useFileIO] Failed to save file:', err);
      setFileErrors([{ message: `Failed to save file: ${err?.message ?? 'unknown error'}`, severity: 'error' }]);
    }
  }, [adapter, text, fileName]);

  /** Handles the legacy <input type="file"> fallback for non-FSA browsers. */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      setFileName(file.name.replace(/\.txt$/, ''));
      setIsDirty(false);
      console.log('[useFileIO] Opened file (legacy fallback):', file.name);
    };
    reader.onerror = () => {
      console.error('[useFileIO] FileReader failed to read file:', file.name);
      setFileErrors([{ message: `Failed to read file "${file.name}".`, severity: 'error' }]);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, []);

  return {
    text,
    fileName,
    isDirty,
    fileErrors,
    handleChange,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleFileInputChange,
    fileInputRef,
  };
}
