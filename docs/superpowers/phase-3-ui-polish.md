# Phase 3 UI Polish — Deferred Frontend-Design Audit Findings

> Locked May 13, 2026 during the retroactive tool-incorporation audit. Stephen flagged that the previous audit cycle hadn't actually applied UI/UX tools (Stitch / Magic / frontend-design / concept-to-image) — this doc captures the audit findings that surfaced when those tools WERE applied + the deferral rationale.

## Audit summary

Current Observatory dashboard (149 lines in `App.tsx` + 6 components) reads as **well-designed and intentional** when scanned against the `frontend-design` skill principles:
- Distinctive typography blend (Geist + Geist Mono + Instrument Serif italic accents)
- Staggered fade-up animations (`animationDelay: 0s, 0.05s, 0.12s, 0.19s, 0.26s, 0.35s`)
- Radial-gradient atmospherics (top-center green tint + bottom-right blue)
- Hairline-only dividers, no shadows
- Mixed-medium effect (telemetry mono + serif italic + sans heading)
- Multi-state event handling (empty / demo / zero / real)
- Color-coded action chips per kind
- Pulse-dot live indicator + grain texture
- Empty-state CTA points at the wiki path
- Demo-data is opt-in (`?demo=1`)

What surfaced from the audit that's worth doing later (NOT now, 14 days from deadline + Phase 3 blocked on Vinh's Phase 1):

## Tier A — Trivial polish, low risk (apply during Phase 3)

1. **Use the unused `pulse-dot` keyframe in `tailwind.config.ts`.** Defined but only `live-dot` class is referenced in `Header.tsx`. If `pulse-dot` was intended for the active-rule indicator on `StatsRow.tsx` "Active rules" card, wire it up.

2. **Replace hardcoded hex in `StatsRow.tsx` Card prop `accent` with token classes.** Lines 27-30 pass `accent="#F5F5F4"`, `#4ADE80`, `#FBBF24` — these are `bone.50`, `signal.ok`, `signal.warn`. Promote to Tailwind utility classes or pass token names.

3. **Sparkline interactivity.** Currently static SVG. On hover, surface the hour bucket + value as a tooltip (small Geist Mono label). Adds depth without bloating.

4. **EventRow scroll-into-view animation.** When new events arrive via the 10s poll, the new row currently appears without animation distinguishing it from older rows. Apply the `cm-fade-left` keyframe scoped to "rows added since last refresh."

5. **Promote `#A78BFA` (userFlair violet) to a token.** Currently a hardcoded literal in `EventRow.tsx:21`. If the violet sticks, add `signal.author = '#A78BFA'` to `tailwind.config.ts` and DESIGN.md.

## Tier B — Worth exploring with Stitch / Magic post-Phase-1

6. **Stitch design-system generation from `DESIGN.md`.** Now that `DESIGN.md` ships, `mcp__stitch__upload_design_md` + `create_design_system_from_design_md` could produce a canvas-rendered design-system reference page. Useful for the demo video b-roll + Devpost image gallery.

7. **Stitch dashboard variant exploration.** `generate_screen_from_text` against the DESIGN.md design system could produce 3-5 alternative layouts — input for Stephen to pick polish improvements that beat the current grid.

8. **Magic `21st_magic_component_refiner` on `EventRow.tsx`.** Component-level refinement suggestions. Apply only if non-trivial wins surface; skip if cosmetic.

## Tier C — Deferred / not worth it

9. **Stitch full dashboard redesign** — would churn working code 14 days from deadline. Skip.

10. **Magic component-builder-generated replacements** — same churn risk. Skip.

11. **Canvas-design poster** — Devpost doesn't request poster-format assets. Skip.

12. **Concept-to-image alternative for the architecture diagram** — Mermaid already ships and renders on github.com. Skip.

## Audit provenance

- `frontend-design` skill principles applied as audit rubric
- `pr-review-toolkit:comment-analyzer` sub-agent found 3 factual errors in `DESIGN.md` vs actual code (fixed in commit 92946fe)
- `codex:codex-rescue` sub-agent surfaced the scanner here-string false-negative (fixed in commit faed48f) + phase framing contradictions (fixed in commit cebe3dc)
- `mcp__magic__21st_magic_component_inspiration` returned 84KB of component data; sampled for dashboard-card patterns
- `mcp__stitch__list_projects` confirmed existing Stitch projects (deferred generation pending Phase 3)

## Decision

**Defer Tier A items to Phase 3 (May 20-22, 2026).** Vinh's Phase 1+2 unblocks the live-data wiring; that's the natural moment to apply UI polish while integrating real data. Tier B + C stays open as exploration territory but doesn't block submission.

**The dashboard ships in v0.1.0 as-is.** Audit didn't surface any submission-blocking UI issues — only nice-to-have refinements.
