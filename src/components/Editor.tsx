interface EditorProps {
  value: string;
  onChange: (text: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-indigo-400">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 6h8M4 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-300 tracking-wide">Chart Definition</span>
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
