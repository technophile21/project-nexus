import { FileBar } from '../../components/molecules/FileBar';

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
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      {/* Title row */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-400">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-300 tracking-wide">Chart Definition</span>
      </div>

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
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 space-y-0.5">
        <div><span className="text-indigo-400">Task :ID, DATE, Nd</span> — id, start date, duration</div>
        <div><span className="text-indigo-400">Task :ID, after ID1 ID2, Nd</span> — id, one or more dependencies, duration</div>
        <div><span className="text-indigo-400">Task :ID, after ID1 ID2, DATE, Nd</span> — deps + earliest start</div>
        <div><span className="text-indigo-400">Task :ID, Nd</span> — id, duration (follows previous)</div>
      </div>
    </div>
  );
}
