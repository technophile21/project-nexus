# Project Nexus: Design Diagrams

## 1. Layer Dependency

What can import what. Lower layers never import from higher.

```
┌─────────────────────────────────────────────────────────┐
│  App.tsx                                                │  Layer 8
└────────────────────┬────────────────────────────────────┘
                     │ imports
┌────────────────────▼────────────────────────────────────┐
│  features/  (GanttController, EditorController,         │  Layer 7
│             GanttView, EditorView, feature hooks)       │
└──────┬───────────────────────┬──────────────────────────┘
       │                       │
┌──────▼───────┐    ┌──────────▼──────────────────────────┐
│  context/    │    │  components/  (atoms, molecules,    │  Layer 6
│  Warnings    │    │               organisms)             │
└──────┬───────┘    └──────────┬──────────────────────────┘
       │                       │
┌──────▼───────────────────────▼──────────────────────────┐
│  hooks/  (useFileIO, useGanttData, useWarnings)         │  Layer 4-5
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│  core/resolver.ts                                       │  Layer 3
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│  lib/  (dateUtils, colors, layoutEngine, parser/*)      │  Layer 2
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│  adapters/  (DataSourceAdapter, textFileAdapter)        │  Layer 1
└──────┬──────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│  types/  (gantt.ts, markers.ts, parser.ts)              │  Layer 0
│  No imports from inside project                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Hierarchy (Atomic Design)

```
App.tsx
├── WarningsContext.Provider
├── EditorController              [feature controller]
│   └── EditorView                [feature view]
│       ├── FileBar               [molecule]
│       │   ├── DirtyIndicator    [atom]
│       │   ├── IconButton (Open) [atom]
│       │   ├── IconButton (Save) [atom]
│       │   └── IconButton (SaveAs) [atom]
│       └── <textarea>            [native element]
│
└── GanttController               [feature controller]
    ├── ChartToolbar              [organism]
    │   ├── ChartLegend           [molecule]
    │   └── IconButton (Export)   [atom]
    │
    └── GanttView                 [feature view]
        ├── LabelColumn           [organism — SVG, fixed left]
        ├── <scrollable div>
        │   ├── TimelineGrid      [organism — SVG layer]
        │   ├── QuarterHeader     [organism — SVG layer]
        │   ├── Bars              [organism — SVG layer, generic bars]
        │   └── MarkerLayer       [organism — SVG layer]
        │       ├── (today)       [rendered by switch on marker.type]
        │       └── (milestones)  [rendered by switch on marker.type]
        └── Tooltip               [molecule — floating overlay]

ErrorBanner                       [organism, reads WarningsContext]
└── IconButton (Dismiss)          [atom]
```

---

## 3. Data Flow

```
  ┌──────────────────────────────────────────────────────────────┐
  │  USER TYPES TEXT IN EDITOR                                   │
  └──────────────────────────┬───────────────────────────────────┘
                             │ onChange(text)
                             ▼
                    ┌─────────────────┐
                    │  useFileIO      │ state: text, fileName,
                    │  (EditorCtrl)   │        isDirty, fileErrors
                    └────────┬────────┘
                             │ text
                             ▼
                    ┌─────────────────┐
                    │ useGanttData    │ [useMemo — reruns on text change]
                    │  (App.tsx)      │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │  lib/parser/                │
              │  parseGanttText(text)       │──► ParseResult + ParseWarning[]
              │  (pure function)            │
              └──────────────┬──────────────┘
                             │ ParseResult
              ┌──────────────▼──────────────┐
              │  core/resolver.ts           │
              │  resolveGanttData(parsed)   │──► GanttData + ParseWarning[]
              │  (pure function)            │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  useWarnings (App.tsx)      │
              │  + WarningsContext          │──► ErrorBanner
              └──────────────┬──────────────┘
                             │ GanttData
              ┌──────────────▼──────────────┐
              │  GanttController            │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼──────────────────────┐
         ▼                   ▼                       ▼
  useGanttLayout      useGanttInteraction      useGanttExport
  (rows, heights,     (hoveredId, tooltip,     (exporting,
   todayX, etc.)      event handlers)           handleExport)
         │
         ▼
  lib/layoutEngine.*  ◄── pure geometry functions
         │
         ▼
  GanttView
  ├── Bars (BarItem[] derived from tasks)
  ├── MarkerLayer (Marker[] = today + milestones)
  ├── LabelColumn, TimelineGrid, QuarterHeader
  └── Tooltip
```

---

## 4. Adapter Interface (Data Source Swap)

```
           DataSourceAdapter (interface)
           ┌────────────────────────────┐
           │ open()  → {content, name}  │
           │ save()  → {name}           │
           │ saveAs() → {name}          │
           └─────────┬──────────────────┘
                     │ implements
        ┌────────────┴──────────────┐
        │                           │
 textFileAdapter           csvAdapter (future)
 (FSA API + fallback)      (reads CSV → content)
        │
        └── injected into useFileIO(adapter)

  To add CSV support:
  1. Write csvAdapter.ts implementing DataSourceAdapter
  2. Change one line in EditorController.tsx
  ─────────────────────────────────────────
  Zero other files change.
```

---

## 5. MarkerLayer Type Dispatch

```
MarkerLayer receives: Marker[]

  Marker = today | milestone | (future: checkpoint, sprintBoundary, ...)

  ┌─────────────────────────────────────────────┐
  │  markers.map(marker => {                    │
  │    switch (marker.type) {                   │
  │                                             │
  │      case 'today':                          │
  │        → red dashed vertical line           │
  │          + "Today" label                    │
  │                                             │
  │      case 'milestone':                      │
  │        → diamond ◆ at top                  │
  │          + dashed vertical line             │
  │          + date label at bottom             │
  │          + hover interaction                │
  │                                             │
  │      case 'checkpoint': (future)            │
  │        → flag icon                          │
  │          + section-scoped line              │
  │    }                                        │
  │  })                                         │
  └─────────────────────────────────────────────┘

  Adding a new marker type:
  1. Add union member to Marker type in features/gantt/types.ts
  2. Add case in MarkerLayer's switch
  ──────────────────────────────────────────────
  Zero other files change.
```
