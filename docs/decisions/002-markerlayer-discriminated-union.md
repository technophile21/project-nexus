# 002 - MarkerLayer with Discriminated Union Over Separate Components

## Status
Accepted

## Context

The chart needed two types of vertical markers:
- **Today marker**: a single red dashed line with a "Today" label badge
- **Milestone markers**: many markers per chart, each with a diamond, dashed line, label
  pill, and hover interaction

The initial decomposition had these as two separate SVG organisms:
`TodayMarker.tsx` and `MilestoneLayer.tsx`.

The question was whether to keep them separate or unify them.

## Decision

Merge into a single **`MarkerLayer`** organism that accepts `Marker[]` where `Marker` is
a TypeScript discriminated union:

```typescript
type Marker =
  | { type: 'today';     x: number; height: number }
  | { type: 'milestone'; x: number; height: number;
      label: string; date: string; color: string; id: string }
```

The component renders all markers in a single `markers.map()` using a `switch` on
`marker.type`. Both today and milestones are vertical lines with labels — they are
the same conceptual element with different visual styles.

## Consequences

**Easier:**
- Adding new marker types (e.g. `checkpoint`, `sprint-boundary`) requires only:
  1. Adding a new union member to the `Marker` type
  2. Adding a `case` in `MarkerLayer`'s switch statement
  No other files change.
- Single render loop = consistent z-ordering and positioning logic for all markers.
- `GanttController` assembles all markers into one array and passes it once — simpler
  than wiring two separate layer components.

**Harder / Trade-offs:**
- The switch statement branches on `type`, which adds internal complexity to one file.
  Today's marker (1 SVG element) and a milestone (4 SVG elements) render differently,
  but the branching is well-contained and the external API stays stable.
- If marker types diverge dramatically in the future (e.g. a marker that spans multiple
  rows), the switch may become unwieldy. At that point, extract the rendering per type
  into separate render functions or sub-components called from within the switch.

## When to Reconsider

Split `MarkerLayer` into separate components if:
- A marker type requires fundamentally different positioning logic (e.g. it spans rows
  rather than spanning height)
- The switch exceeds ~4 cases and each case has 20+ lines of SVG
