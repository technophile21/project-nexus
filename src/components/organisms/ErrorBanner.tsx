import { useWarningsContext } from '../../context/WarningsContext';

const MAX_VISIBLE = 3;

/**
 * Reads warnings directly from WarningsContext — no props needed.
 * Renders nothing when warnings are empty or dismissed.
 */
export function ErrorBanner() {
  const { allWarnings, warningsDismissed, dismissWarnings } = useWarningsContext();

  if (allWarnings.length === 0 || warningsDismissed) return null;

  const hasError = allWarnings.some(w => w.severity === 'error');
  const visible = allWarnings.slice(0, MAX_VISIBLE);
  const overflow = allWarnings.length - MAX_VISIBLE;

  const colors = hasError
    ? {
        bg: 'bg-red-950/95',
        border: 'border-red-800/60',
        icon: 'text-red-400',
        text: 'text-red-200',
        muted: 'text-red-400',
        btn: 'text-red-400 hover:text-red-200 hover:bg-red-900/60',
      }
    : {
        bg: 'bg-amber-950/95',
        border: 'border-amber-800/60',
        icon: 'text-amber-400',
        text: 'text-amber-200',
        muted: 'text-amber-500',
        btn: 'text-amber-400 hover:text-amber-200 hover:bg-amber-900/60',
      };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${colors.bg} backdrop-blur-sm border-b ${colors.border} px-4 py-2.5`}>
      <div className="flex items-start gap-3 max-w-full">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`${colors.icon} shrink-0 mt-0.5`} aria-hidden="true">
          <path d="M8 1.5L1 14h14L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
        </svg>

        <div className="flex-1 min-w-0">
          {visible.map((w, i) => (
            <p key={i} className={`text-xs leading-5 ${colors.text}`}>{w.message}</p>
          ))}
          {overflow > 0 && (
            <p className={`text-xs leading-5 ${colors.muted}`}>+{overflow} more {overflow === 1 ? 'warning' : 'warnings'}</p>
          )}
        </div>

        <button onClick={dismissWarnings} className={`${colors.btn} shrink-0 rounded p-0.5 transition-colors`} aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
