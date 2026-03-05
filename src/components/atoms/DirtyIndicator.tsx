interface DirtyIndicatorProps {
  isDirty: boolean;
}

export function DirtyIndicator({ isDirty }: DirtyIndicatorProps) {
  if (!isDirty) return null;
  return (
    <span
      className="w-2 h-2 rounded-full bg-orange-400 shrink-0"
      title="Unsaved changes"
      aria-label="Unsaved changes"
    />
  );
}
