import { createContext, useContext } from 'react';
import type { ParseWarning } from '../types/parser';

interface WarningsContextValue {
  allWarnings: ParseWarning[];
  warningsDismissed: boolean;
  dismissWarnings: () => void;
}

export const WarningsContext = createContext<WarningsContextValue>({
  allWarnings: [],
  warningsDismissed: false,
  dismissWarnings: () => {},
});

export function useWarningsContext(): WarningsContextValue {
  return useContext(WarningsContext);
}
