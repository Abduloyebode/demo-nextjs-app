# Step 6 — Design decisions

## Main problems identified (before)

1. **Default type stack** — Inter/system fonts made the product feel like an unstyled starter.
2. **Flat, repetitive cards** — Every row and form used the same white rounded card + soft shadow, so hierarchy collapsed.
3. **Weak Operate hierarchy** — Large “Welcome” marketing energy competed with the actual work (filters, list, upload).
4. **Document processing clarity** — In-flight extraction needed a stronger pending/processing treatment and clearer completed structure.
5. **Inconsistent chrome** — Header/nav duplicated per page with slight drift risk; loading skeletons didn’t match final structure.
6. **Atmosphere** — Flat `#f8fafc` read as placeholder rather than a deliberate ops surface.

## Alternatives considered

| Direction | Why considered | Why not chosen |
|-----------|----------------|----------------|
| **A. Dense table console** | Maximum scan density for workflows | Too cold; fights the calm Northstar voice |
| **B. Kanban / board for statuses** | Status-first metaphor | Overbuilt for current CRUD scope; backend unchanged |
| **C. Refined teal ops list (chosen)** | Keeps brand; improves hierarchy, type, states | — |

Also rejected generic “AI SaaS” looks: purple gradients, glass panels, cream+terracotta editorial kits.

## Why C won

- Matches PRODUCT.md Operate mode and existing teal mark
- Improves the three Step 6 surfaces (workflow list, upload flow, result rows) without inventing features
- Typography and tokens are intentional and documented in `DESIGN.md`
- States (empty / loading / error / in-flight / success) are explicit and accessible

## Impeccable usage

- Installed via `npx impeccable install` (skills under `.cursor/skills/impeccable` and `.claude/skills/impeccable`)
- Captured durable context in `PRODUCT.md` and visual system in `DESIGN.md`
- Used Impeccable’s Operate guidance and anti-slop constraints; final composition choices were human-directed (list refinement over board/table)

## Screenshots

See `docs/step-6-screenshots/` (before/after for workflows and documents).
