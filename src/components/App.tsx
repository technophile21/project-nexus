import { useState, useMemo, useCallback, useRef } from 'react';
import Editor from './Editor';
import GanttChart from './GanttChart';
import { parseGanttText } from '../parser';
import { resolveGanttData } from '../ganttUtils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ganttData = useMemo(() => {
    try {
      const parsed = parseGanttText(text);
      return resolveGanttData(parsed);
    } catch {
      return null;
    }
  }, [text]);

  const handleChange = useCallback((t: string) => {
    setText(t);
    setIsDirty(true);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      setFileName(file.name.replace(/\.txt$/, ''));
      setIsDirty(false);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }, []);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSave = useCallback(() => {
    const name = fileName ?? 'untitled';
    downloadTxt(text, name);
    setFileName(name);
    setIsDirty(false);
  }, [text, fileName]);

  const handleSaveAs = useCallback(() => {
    downloadTxt(text, fileName ?? 'untitled');
    setIsDirty(false);
  }, [text, fileName]);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
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
