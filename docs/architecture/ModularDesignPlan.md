# Project Nexus: Modular Architecture Plan

## Context

The current codebase has two core problems:

1. **Monolithic components**: `App.tsx` (232 lines) mixes file I/O, parsing, warning aggregation,
   and layout into one place. `GanttChart.tsx` (578 lines) does SVG layout math, interaction state,
   export logic, and rendering all inline — with no component hierarchy.
2. **Mixed concerns in utilities**: `ganttUtils.ts` bundles date math, color constants, resolution
   logic, and `console.warn` calls together. `parser.ts` similarly calls `console.warn` directly
   (a side effect in business logic). `parseDateStr` is duplicated across both files.

---

## State Management: Custom Hooks + React Context

**Decision: custom hooks, not Redux.** See `docs/decisions/001-custom-hooks-over-redux.md`.

- `useFileIO(adapter)` — all file I/O state and callbacks
- `useGanttData(text)` — parse + resolve pipeline, returns `ganttData` + `parseWarnings`
- `useWarnings(parseWarnings, fileErrors)` — aggregation + dismissal
- `WarningsContext` — makes warnings available to `ErrorBanner` without prop drilling

---

## Folder Structure

```
src/
├── types/
│   ├── gantt.ts          # RawTask, ResolvedTask, Section, GanttData
│   ├── markers.ts        # Milestone, Quarter
│   ├── parser.ts         # ParseWarning, ParseResult, ParsedMilestone, ParsedQuarter
│   └── index.ts          # Re-exports all public types
│
├── adapters/
│   ├── DataSourceAdapter.ts   # Interface only
│   ├── textFileAdapter.ts     # FSA + fallback (extracted from App.tsx)
│   └── index.ts
│
├── lib/
│   ├── dateUtils.ts      # parseDateStr, snapToWeek*, addDays, weeksBetween
│   ├── colors.ts         # SECTION_COLORS, QUARTER_COLORS constants
│   ├── layoutEngine.ts   # buildRows, dateToX, barX, barWidth, getBarColor (pure functions)
│   └── parser/
│       ├── parseParams.ts     # Pure: the 6-case params function, no console.warn
│       └── parseGanttText.ts  # Pure: main parser loop, no console.warn
│
├── core/
│   └── resolver.ts       # resolveGanttData() — pure, no console.warn
│
├── hooks/                # App-wide hooks
│   ├── useFileIO.ts
│   ├── useGanttData.ts
│   └── useWarnings.ts
│
├── context/
│   └── WarningsContext.tsx
│
├── features/
│   ├── gantt/
│   │   ├── GanttController.tsx    # Calls hooks, passes results to GanttView
│   │   ├── GanttView.tsx          # Assembles organisms (~60 lines, no inline math)
│   │   ├── useGanttLayout.ts      # Calls lib/layoutEngine, returns rows/heights/todayX
│   │   ├── useGanttInteraction.ts # hoveredId, tooltip, event handlers
│   │   ├── useGanttExport.ts      # exporting state, handleExport
│   │   └── types.ts               # GanttChartProps, RowInfo, TooltipData, LAYOUT constants
│   │
│   └── editor/
│       ├── EditorController.tsx   # Calls useFileIO, passes to EditorView
│       └── EditorView.tsx         # Presentational editor panel
│
├── components/
│   ├── atoms/
│   │   ├── IconButton.tsx         # icon + optional label + variant + size
│   │   ├── DirtyIndicator.tsx     # The orange "●" unsaved dot
│   │   └── Divider.tsx            # 1px separator
│   │
│   ├── molecules/
│   │   ├── FileBar.tsx            # fileName + dirty dot + Open/Save/SaveAs buttons
│   │   ├── ChartLegend.tsx        # Colored squares + legend labels
│   │   └── Tooltip.tsx            # Floating hover card (task or milestone)
│   │
│   └── organisms/
│       ├── ChartToolbar.tsx       # Title + ChartLegend + Export button
│       ├── LabelColumn.tsx        # Fixed left SVG: section headers + task labels
│       ├── TimelineGrid.tsx       # Scrollable SVG: week grid + quarter bands
│       ├── QuarterHeader.tsx      # SVG: quarter row in header area
│       ├── Bars.tsx               # SVG: generic bar primitive (used for tasks)
│       ├── MarkerLayer.tsx        # SVG: today + milestone markers via discriminated union
│       └── ErrorBanner.tsx        # Moved here, zero code changes
│
├── App.tsx               # Thin root: Providers + EditorController + GanttController
├── main.tsx              # Unchanged
└── index.css             # Unchanged
```

---

## Layer Architecture

Strict downward dependency — lower layers never import from higher layers.

| Layer | Location | Role |
|---|---|---|
| 0 | `types/` | Domain types only. No imports from project. |
| 1 | `adapters/` | `DataSourceAdapter` interface + implementations. |
| 2 | `lib/` | Pure functions: date math, colors, layout geometry, parser. No React. |
| 3 | `core/` | `resolveGanttData()` pure function. Imports lib/ and types/. |
| 4–5 | `hooks/`, `context/` | React hooks bridging logic to state. |
| 6 | `components/` | Stateless presentational atoms/molecules/organisms. |
| 7 | `features/` | Feature controllers + views. Imports hooks + components. |
| 8 | `App.tsx` | Thin root composition only. |

---

## DataSource Adapter Interface

```typescript
// src/adapters/DataSourceAdapter.ts
export interface DataSourceAdapter {
  readonly id: string;   // e.g. 'text-file', 'csv', 'clipboard'
  open(): Promise<{ content: string; name: string } | null>;
  save(content: string, name: string | null): Promise<{ name: string } | null>;
  saveAs(content: string, suggestedName: string): Promise<{ name: string } | null>;
}
```

To add CSV/Excel support: write one new adapter file, change one line in `EditorController.tsx`.

---

## GanttChart Decomposition

| Current `GanttChart.tsx` content | New location |
|---|---|
| Layout constants | `features/gantt/types.ts` as `LAYOUT` object |
| `RowInfo`, `TooltipData` types | `features/gantt/types.ts` |
| `getBarColor` helper | `lib/layoutEngine.ts` (pure) |
| State: `hoveredId`, `tooltip`, `exporting` | `useGanttInteraction.ts`, `useGanttExport.ts` |
| Event handlers | `useGanttInteraction.ts`, `useGanttExport.ts` |
| Row layout computation | `useGanttLayout.ts` → `lib/layoutEngine.ts` |
| Date-to-x helpers | `lib/layoutEngine.ts` |
| Toolbar JSX | `components/organisms/ChartToolbar.tsx` |
| Fixed label column SVG | `components/organisms/LabelColumn.tsx` |
| Grid + week headers + quarters | `components/organisms/TimelineGrid.tsx` + `QuarterHeader.tsx` |
| Task bars SVG | `components/organisms/Bars.tsx` |
| Today + milestone SVG | `components/organisms/MarkerLayer.tsx` |
| Tooltip JSX | `components/molecules/Tooltip.tsx` |
| Scroll container + assembly | `features/gantt/GanttView.tsx` |

---

## Extensibility: Adding a New Concept

To add a concept like "Checkpoint" (similar to Milestone):

1. `src/types/checkpoint.ts` (new) — type definition
2. `src/types/gantt.ts` — add field to `GanttData`
3. `src/lib/parser/parseGanttText.ts` — add keyword branch
4. `src/core/resolver.ts` — add resolution loop
5. `src/components/organisms/MarkerLayer.tsx` — add `case 'checkpoint'` in switch
6. `src/features/gantt/GanttController.tsx` — map to `Marker[]`

Zero changes to: App.tsx, hooks, adapters, Editor, ErrorBanner, other organisms.

---

## Testability

| Target | Type | Property |
|---|---|---|
| `lib/dateUtils` | Unit | Pure functions, no setup needed |
| `lib/parser/parseParams` | Unit | Pure: `(params, name, []) => RawTask` |
| `lib/parser/parseGanttText` | Unit | Pure: `(text) => ParseResult` |
| `core/resolver` | Unit | Pure: `(ParseResult) => { data, warnings }` |
| `lib/layoutEngine` | Unit | Pure geometry functions |
| `hooks/useFileIO` | Hook test | Mock adapter injected |
| `hooks/useGanttData` | Hook test | `renderHook(() => useGanttData(text))` |
| `organisms/Bars` | Component | Static props, no hooks |
| `organisms/MarkerLayer` | Component | Static `Marker[]` prop |

---

## Implementation Phases

### Phase 0 — Documentation
Create `docs/` structure with design plan, diagrams, and ADRs.

### Phase 1 — Types + Lib Layer
Split `types.ts`, `parser.ts`, `ganttUtils.ts` into focused files. Remove all `console.warn`.
**Verify**: `tsc --noEmit` passes, app runs identically.

### Phase 2 — Adapters + Hooks
Extract file I/O into adapter + `useFileIO`. Create `useGanttData`, `useWarnings`, `WarningsContext`.
Slim `App.tsx` to under 60 lines.
**Verify**: File operations, chart render, warnings all work.

### Phase 3 — Component Decomposition
Create atoms, molecules, organisms. Decompose `GanttChart.tsx` into feature hooks + `GanttView`.
**Verify**: Visual parity, hover/tooltip/export all work.

### Phase 4 — Adapter Validation
Write stub `csvAdapter.ts` to confirm the interface contract is correct.

---

## Verification Checklist

- [ ] `tsc --noEmit` passes with zero errors
- [ ] Default sample renders: sections, milestones, quarter bands visible
- [ ] Typing updates chart in real-time
- [ ] Open/Save/SaveAs work in Chrome
- [ ] Invalid task IDs show in ErrorBanner; dismissal hides it
- [ ] Export PNG downloads correctly
- [ ] Hover dims unrelated tasks, shows dependency arrows
- [ ] Milestone tooltip shows date on hover
- [ ] `console.warn` count in `src/lib/` and `src/core/` is zero
