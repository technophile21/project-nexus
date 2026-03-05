import { IconButton } from '../atoms/IconButton';
import { DirtyIndicator } from '../atoms/DirtyIndicator';

interface FileBarProps {
  fileName: string | null;
  isDirty: boolean;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

const OpenIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8.707 4.7A1 1 0 009.414 5H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
  </svg>
);

const SaveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 13H3a1 1 0 01-1-1V4a1 1 0 011-1h7.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0114 6.414V12a1 1 0 01-1 1z" />
    <rect x="5" y="9" width="6" height="4" rx="0.5" />
    <rect x="5" y="3" width="4" height="3" rx="0.5" />
  </svg>
);

export function FileBar({ fileName, isDirty, onOpen, onSave, onSaveAs }: FileBarProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-700 text-xs text-gray-400 shrink-0">
      <DirtyIndicator isDirty={isDirty} />
      <span className="flex-1 truncate font-mono text-gray-300">{fileName ?? 'untitled'}</span>
      <div className="w-px h-3.5 bg-gray-600 shrink-0" />
      <IconButton icon={<OpenIcon />} label="Open" onClick={onOpen} />
      <IconButton icon={<SaveIcon />} label="Save" onClick={onSave} />
      <IconButton variant="ghost" label="Save As…" icon={<></>} onClick={onSaveAs} />
    </div>
  );
}
