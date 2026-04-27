import { useState, useEffect } from 'react';
import type { ParseWarning } from '../types/parser';

interface UseWarningsReturn {
  allWarnings: ParseWarning[];
  warningsDismissed: boolean;
  dismissWarnings: () => void;
}

/**
 * Aggregates warnings from multiple sources and manages the dismissed state.
 * Resets dismissal whenever the set of parse warnings changes.
 */
export function useWarnings(
  parseWarnings: ParseWarning[],
  fileErrors: ParseWarning[]
): UseWarningsReturn {
  const [warningsDismissed, setWarningsDismissed] = useState(false);

  // Reset dismissal when parse warnings change (new issues in the text)
  const warningsKey = parseWarnings.map(w => w.message).join('\n');
  useEffect(() => {
    setWarningsDismissed(false);
  }, [warningsKey]);

  return {
    allWarnings: [...parseWarnings, ...fileErrors],
    warningsDismissed,
    dismissWarnings: () => setWarningsDismissed(true),
  };
}
