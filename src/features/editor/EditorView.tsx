import { useState, useEffect, useRef } from 'react';
import { FileBar } from '../../components/molecules/FileBar';
import { DEFAULT_TEXT } from '../../lib/defaultText';

interface EditorViewProps {
  value: string;
  onChange: (text: string) => void;
  fileName: string | null;
  isDirty: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export function EditorView({ value, onChange, fileName, isDirty, onOpen, onSave, onSaveAs }: EditorViewProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside or Escape
  useEffect(() => {
    if (!showInfo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowInfo(false); };
    const onMouse = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouse);
    };
  }, [showInfo]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700 relative">

      {/* Title row */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-400" aria-hidden>
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-300 tracking-wide">Chart Definition</span>

        {/* Info button */}
        <button
          onClick={() => setShowInfo(v => !v)}
          className={`ml-auto p-1 rounded transition-colors ${showInfo ? 'text-indigo-400' : 'text-gray-500 hover:text-indigo-400'}`}
          title="Show syntax reference & sample"
          aria-label="Show syntax reference and sample chart definition"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7" cy="4.25" r="0.75" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Info popup */}
      {showInfo && (
        <div
          ref={popupRef}
          className="absolute top-12 right-0 z-50 w-[370px] max-h-[75vh] flex flex-col bg-gray-800 border border-gray-600 rounded-lg shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 shrink-0">
            <span className="text-xs font-semibold text-gray-300 tracking-wide">Sample Chart Definition</span>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors text-base leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <pre className="overflow-y-auto p-4 text-xs font-mono text-gray-300 whitespace-pre leading-relaxed">
            {DEFAULT_TEXT}
          </pre>
        </div>
      )}

      <FileBar
        fileName={fileName}
        isDirty={isDirty}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
      />

      <textarea
        className="flex-1 w-full bg-transparent text-gray-100 font-mono text-sm p-4 resize-none outline-none leading-relaxed placeholder-gray-600"
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        placeholder={`title My Project\ndateFormat DD-MM-YYYY\nsection Phase 1\nTask A :T1, 01-01-2026, 14d\nTask B :T2, after T1, 10d`}
      />

      {/* Collapsible syntax reference */}
      <div className="border-t border-gray-700 shrink-0">
        <button
          onClick={() => setHintsOpen(v => !v)}
          className="w-full px-4 py-2 text-xs text-gray-500 flex items-center justify-between hover:text-gray-400 transition-colors"
        >
          <span className="font-medium">Syntax Reference</span>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`transition-transform duration-150 ${hintsOpen ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {hintsOpen && (
          <div className="px-4 pb-3 text-xs text-gray-500 space-y-2.5">

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Global Directives</div>
              <div><span className="text-indigo-400">title</span> My Project</div>
              <div><span className="text-indigo-400">dateFormat</span> DD-MM-YYYY</div>
              <div><span className="text-indigo-400">defaultAvailability</span> 80% — default capacity for all sections</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Markers</div>
              <div><span className="text-indigo-400">quarter</span> Q1 :DD-MM-YYYY, DD-MM-YYYY</div>
              <div><span className="text-indigo-400">milestone</span> Name :ID, DD-MM-YYYY — with explicit ID</div>
              <div><span className="text-indigo-400">milestone</span> Name :DD-MM-YYYY — auto ID</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Sections</div>
              <div><span className="text-indigo-400">section</span> Name — inherits defaultAvailability</div>
              <div><span className="text-indigo-400">section</span> Name [N%] — explicit capacity override</div>
              <div><span className="text-indigo-400">section</span> Name [0%] — on hold, bar suppressed</div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">Tasks</div>
              <div><span className="text-indigo-400">Task :ID, DATE, Nd</span> — id, start date, duration</div>
              <div><span className="text-indigo-400">Task :ID, Nd</span> — follows previous task in section</div>
              <div><span className="text-indigo-400">Task :ID, after ID1 ID2, Nd</span> — one or more dependencies</div>
              <div><span className="text-indigo-400">Task :ID, after ID1, DATE, Nd</span> — deps + earliest start</div>
              <div><span className="text-indigo-400">Task [N%] :ID, ...</span> — task-level bandwidth (stacks with section)</div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
