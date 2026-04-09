# Project Nexus — Agent Context Summary

## What It Is

Project Nexus is a **text-based Gantt chart editor and visualizer**. Users write project plans in a simple custom DSL (plain text) and instantly see them rendered as an interactive SVG Gantt chart. It ships as both a **web app** (Vite/React) and a **cross-platform desktop app** (Electron).

Key features: sections, tasks with IDs, milestones, quarters, dependency chains (`after T1 T2`), circular dependency detection, working-day durations (Mon–Fri), week-snapped bar rendering, hover dependency visualization, PNG export.

---

## Tech Stack

- **React 18 + TypeScript** (strict mode), **Vite 5**, **Tailwind CSS 3.4**, **PostCSS**
- **date-fns 3.6** (minimal usage; most date logic is custom)
- **html-to-image 1.11** (PNG export)
- **Electron 40 + electron-builder 26.8** (desktop packaging)
- **Concurrently + wait-on** (dev: run Vite + Electron in parallel)

---

## Architecture: Controller-View-Hook Pattern

| Layer | Role |
|---|---|
| **App.tsx** | Root orchestrator — wires all hooks, context, and controllers |
| **Controllers** (`EditorController`, `GanttController`) | Thin bridges; derive props from hooks and pass to views |
| **Views** (`EditorView`, `GanttView`) | Pure presentational; no hooks, no state |
| **Organisms** (`Bars`, `TimelineGrid`, `MarkerLayer`, `LabelColumn`, `QuarterHeader`) | SVG layer components used inside GanttView |
| **Hooks** | Stateful logic (see below) |
| **Core/lib** | Pure functions — no side effects, no state |

---

## Data Flow

```
App.tsx
  → useFileIO          (text content, fileName, isDirty — via DataSourceAdapter)
  → useGanttData       (parseGanttText → resolveGanttData, memoized)
  → useWarnings        (aggregate + dismiss warnings/errors)
  → WarningsContext    (shares warning state to ErrorBanner)
  → EditorController → EditorView (textarea + file buttons)
  → GanttController
      → useGanttLayout      (row positions, bar geometry, grid dims — memoized)
      → useGanttInteraction (hovered bar ID, tooltip position, parent/child sets)
      → useGanttExport      (PNG export via html-to-image)
      → GanttView → SVG organisms
```

---

## Two-Stage Processing Pipeline

1. **Parser** (`src/lib/parser/parseGanttText.ts` + `parseParams.ts`)
   - Input: raw DSL text
   - Output: `ParseResult` — sections, raw tasks, milestones, quarters, warnings[]
   - Never throws; all issues go into `warnings[]`

2. **Resolver** (`src/core/resolver.ts` — `resolveGanttData`)
   - Input: `ParseResult`
   - Output: `GanttData` — dates fully resolved, dependencies validated, cycles detected, colors assigned, chart bounds computed
   - DFS-based cycle detection marks cyclic tasks for red rendering

---

## Key Directories

```
src/
  features/
    editor/       EditorController.tsx, EditorView.tsx
    gantt/        GanttController.tsx, GanttView.tsx, useGanttLayout.ts,
                  useGanttInteraction.ts, useGanttExport.ts, types.ts
  lib/
    parser/       parseGanttText.ts, parseParams.ts
    layoutEngine.ts   lane assignment, barX/barWidth, LAYOUT constants
    dateUtils.ts      snapToWeek, parseDateStr, weeksBetween, addWorkingDays
    colors.ts         SECTION_COLORS, QUARTER_COLORS palettes
  core/
    resolver.ts   resolveGanttData (dependency resolution + cycle detection)
  adapters/
    DataSourceAdapter.ts   interface (open/save/saveAs)
    textFileAdapter.ts     File System Access API + <input> fallback
    csvAdapter.ts          stub (future use)
  hooks/
    useFileIO.ts      file open/save/saveAs, dirty flag
    useGanttData.ts   parser → resolver pipeline, memoized
    useWarnings.ts    aggregates + manages warning dismissal
  context/
    WarningsContext.tsx
  types/
    gantt.ts      RawTask, ResolvedTask, Section, GanttData
    parser.ts     ParseResult, ParseWarning, ParsedSection, etc.
    markers.ts    Milestone, Quarter
  components/
    atoms/        IconButton, DirtyIndicator
    molecules/    FileBar, Tooltip, ChartLegend
    organisms/    Bars, TimelineGrid, MarkerLayer, LabelColumn, QuarterHeader, ChartToolbar
    ErrorBanner.tsx, App.tsx
electron/
  main.ts         window creation, app:// protocol (ASAR-aware)
  preload.cts     minimal preload
```

---

## Critical Algorithms

- **Working-day duration**: `10d` = 10 Mon–Fri days (skips weekends)
- **Week snapping**: bars snap to Monday (start) and Sunday (end) of their respective weeks
- **Dependency resolution**: tasks with `after T1 T2` get start = max(end of T1, end of T2)
- **Cycle detection**: DFS on dependency graph; cyclic tasks rendered red
- **Lane assignment**: non-overlapping tasks in same section share a row; multiple lanes per section possible
- **Hover visualization**: hovering a task highlights parent tasks (orange) and dependent tasks (green)

---

## Dev & Build Commands

```bash
npm run dev                      # Vite web dev server → http://127.0.0.1:5173
npm run electron:dev             # Electron + Vite (hot-reload)
npm run build                    # TSC + Vite → dist/
npm run electron:build:mac       # macOS .dmg → release/
npm run electron:build:win       # Windows .exe → release/
npm run electron:build:linux     # Linux .AppImage + .deb → release/
```

Entry points: **Web** → `index.html` → `src/main.tsx`; **Electron** → `electron/main.ts`

---

## Ongoing Refactor (Active)

The codebase is migrating from a monolithic `GanttChart.tsx` to feature modules. Three backward-compat re-export files exist temporarily and will be removed when the migration is complete:
- `src/parser.ts` → re-exports from `src/lib/parser/`
- `src/ganttUtils.ts` → re-exports from `src/lib/layoutEngine.ts`
- `src/types.ts` → re-exports from `src/types/`

Do not add new imports from these files; import from the canonical paths directly.

---

## Design Documentation

| File | Contents |
|---|---|
| `README.md` | Project overview, install options (desktop/browser), local dev setup |
| `docs/architecture/Design.md` | Layer dependency diagram, atomic design pattern, component hierarchy |
| `docs/architecture/ModularDesignPlan.md` | Modular architecture plan, state management approach, planned folder structure |
| `docs/decisions/001-custom-hooks-over-redux.md` | ADR: custom hooks + React Context chosen over Redux Toolkit |
| `docs/decisions/002-markerlayer-discriminated-union.md` | ADR: single `MarkerLayer` with discriminated union over separate milestone/today components |
