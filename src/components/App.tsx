import { useState, useMemo, useCallback } from 'react';
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

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT);

  const ganttData = useMemo(() => {
    try {
      const parsed = parseGanttText(text);
      return resolveGanttData(parsed);
    } catch {
      return null;
    }
  }, [text]);

  const handleChange = useCallback((t: string) => setText(t), []);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Left panel: editor */}
      <div className="w-[380px] min-w-[280px] max-w-[520px] shrink-0 flex flex-col h-full">
        <Editor value={text} onChange={handleChange} />
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
