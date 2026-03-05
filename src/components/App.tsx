import { EditorController } from '../features/editor/EditorController';
import { GanttController } from '../features/gantt/GanttController';
import { ErrorBanner } from './organisms/ErrorBanner';
import { useFileIO } from '../hooks/useFileIO';
import { useGanttData } from '../hooks/useGanttData';
import { useWarnings } from '../hooks/useWarnings';
import { WarningsContext } from '../context/WarningsContext';
import { textFileAdapter } from '../adapters/textFileAdapter';

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
Task 4 :T4, after T3, 14d
section QA
Task 5 :T5, 01-05-2026, 21d
Task 6 :T6, 14d`;

export default function App() {
  const { text, fileName, isDirty, fileErrors, handleChange, handleOpen, handleSave, handleSaveAs, handleFileInputChange, fileInputRef } =
    useFileIO(textFileAdapter, DEFAULT_TEXT);

  const { ganttData, parseWarnings } = useGanttData(text);
  const warningsCtx = useWarnings(parseWarnings, fileErrors);

  return (
    <WarningsContext.Provider value={warningsCtx}>
      <div className="flex h-screen bg-gray-950 overflow-hidden">
        <ErrorBanner />
        <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileInputChange} />

        {/* Left panel: editor */}
        <div className="w-[380px] min-w-[280px] max-w-[520px] shrink-0 flex flex-col h-full">
          <EditorController
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
          <GanttController data={ganttData} />
        </div>
      </div>
    </WarningsContext.Provider>
  );
}
