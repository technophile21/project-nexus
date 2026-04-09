import { EditorController } from '../features/editor/EditorController';
import { GanttController } from '../features/gantt/GanttController';
import { ErrorBanner } from './organisms/ErrorBanner';
import { useFileIO } from '../hooks/useFileIO';
import { useGanttData } from '../hooks/useGanttData';
import { useWarnings } from '../hooks/useWarnings';
import { WarningsContext } from '../context/WarningsContext';
import { textFileAdapter } from '../adapters/textFileAdapter';

const DEFAULT_TEXT = `title Product Launch — 2026
dateFormat DD-MM-YYYY
defaultAvailability 80%

quarter Q1 :01-01-2026, 31-03-2026
quarter Q2 :01-04-2026, 30-06-2026

milestone Design Sign-off :M1, 30-01-2026
milestone Beta Release :M2, 15-04-2026
milestone GA Release :01-06-2026

section Core Backend
Environment Setup :T0, 05-01-2026, 3d
Auth Service :T1, 10d
User API :T2, after T1, 8d
Payment Gateway :T3, after T1, 12d
Data Pipeline :T4, after T2 T3, 10d

section Frontend [100%]
Design System :T5, 05-01-2026, 8d
Dashboard [50%] :T6, after T5, 10d
Checkout Flow :T7, after T5 T3, 8d
Analytics View :T8, after T6 T7, 6d

section QA & Release [60%]
Integration Tests :T9, after T4 T8, 10d
Performance Audit [50%] :T10, after T4, 01-04-2026, 8d
Release Prep :T11, after T9 T10, 5d

section On Hold [0%]
Legacy Migration :T12, 05-01-2026, 20d`;

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
