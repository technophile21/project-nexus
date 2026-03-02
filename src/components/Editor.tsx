interface EditorProps {
  value: string;
  onChange: (text: string) => void;
  fileName: string | null;
  isDirty: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export default function Editor({ value, onChange, fileName, isDirty, onOpen, onSave, onSaveAs }: EditorProps) {
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

      {/* File action row */}
      <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2">
        {/* Filename + dirty indicator */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-gray-500 shrink-0">
            <path d="M2 2h6l2 2h4v10H2V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <span className="text-xs text-gray-400 truncate">
            {fileName ? `${fileName}.txt` : 'untitled'}
          </span>
          {isDirty && (
            <span className="text-orange-400 text-xs shrink-0" title="Unsaved changes">●</span>
          )}
        </div>

        {/* Buttons */}
        <button
          onClick={onOpen}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-gray-100 hover:bg-gray-700 transition-colors"
          title="Open file"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h5l1.5 1.5H14V13H2V4z" />
          </svg>
          Open
        </button>

        <div className="w-px h-4 bg-gray-700" />

        <button
          onClick={onSave}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-gray-100 hover:bg-gray-700 transition-colors"
          title="Save (Ctrl+S)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2h8l3 3v9H2V2h1z" />
            <rect x="5" y="9" width="6" height="5" />
            <rect x="5" y="2" width="5" height="4" />
          </svg>
          Save
        </button>

        <button
          onClick={onSaveAs}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 hover:text-gray-100 hover:bg-gray-700 transition-colors"
          title="Save As…"
        >
          Save As…
        </button>
      </div>

      <textarea
        className="flex-1 w-full bg-transparent text-gray-100 font-mono text-sm p-4 resize-none outline-none leading-relaxed placeholder-gray-600"
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        placeholder={`title My Project\ndateFormat DD-MM-YYYY\nsection Phase 1\nTask A :T1, 01-01-2026, 14d\nTask B :after T1, 10d`}
      />
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 space-y-0.5">
        <div><span className="text-indigo-400">Task :ID, DATE, Nd</span> — with explicit id</div>
        <div><span className="text-indigo-400">Task :after ID, Nd</span> — dependent task</div>
        <div><span className="text-indigo-400">Task :DATE, Nd</span> — with start date</div>
        <div><span className="text-indigo-400">Task :Nd</span> — follows previous task</div>
      </div>
    </div>
  );
}
