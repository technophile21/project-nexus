# 001 - Custom Hooks Over Redux for State Management

## Status
Accepted

## Context

The app needed a state management strategy for three concerns:
- **Editor state**: raw text content, file name, dirty flag
- **Chart data**: parsed and resolved `GanttData`, parse warnings
- **File errors**: errors surfaced by file I/O operations

The user proposed Redux Toolkit. The question was whether Redux's benefits justified
adding its complexity for this app's current scale and structure.

## Decision

Use **custom React hooks + React Context** instead of Redux Toolkit.

- `useFileIO(adapter)` — owns editor state (text, fileName, isDirty, fileErrors)
- `useGanttData(text)` — owns parse+resolve pipeline via `useMemo`
- `useWarnings(parseWarnings, fileErrors)` — aggregates warnings, owns dismissal state
- `WarningsContext` — provides aggregated warnings to `ErrorBanner` without prop drilling

## Consequences

**Easier:**
- Testing hooks is straightforward: `renderHook(() => useFileIO(mockAdapter))` with a
  mock adapter injected — no test store setup required.
- Reading the code: state and the logic that mutates it live in the same file.
- Migrating later: if Redux is genuinely needed (undo/redo, multiple chart views), a
  `useGanttData` hook can be replaced with a Redux slice in one file without touching
  any component.

**Harder / Trade-offs:**
- Redux DevTools time-travel debugging is not available.
- If the component tree grows deep (many nested consumers of the same state), prop
  drilling or context proliferation becomes a concern. The current flat tree
  (App → EditorController, GanttController, ErrorBanner) makes this a non-issue today.

## When to Reconsider

Introduce Redux if any of these arrive:
- Undo/redo history for the editor
- Multiple simultaneous chart views sharing the same parsed data
- Real-time collaboration requiring optimistic updates
- More than ~3 levels of prop drilling for the same piece of state
