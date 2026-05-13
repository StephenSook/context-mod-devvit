# Day 2 Follow-Ups — Stephen Solo Track

> Lock 2026-05-13. Zero overlap with Vinh's lane (Phase 1 backend, Phase 2 actions, 0.10 image spike).
> Every fix is its own atomic commit per green-dot policy. Target: ~25 commits today.

## Sequence (execute top-down)

### Wave 1 — CI hygiene (Track C, ~2 commits)
- [ ] **C.1** `.github/workflows/ci.yml` — runs type-check + lint + test + build on push/PR to main
- [ ] **C.2** README badge for CI status

### Wave 2 — Quick wins (Tracks F + H, ~3 commits)
- [ ] **F.1** `src/client/lib/api.ts` — refine `ZERO_STATS` topRule to friendlier "set up rules" CTA
- [ ] **F.2** `src/client/App.tsx` — first-install empty-state copy refresh (CTA → wiki)
- [ ] **H.1** `src/routes/api.ts` — `/api/health` returns `{ ok, version, ts }` for uptime checks

### Wave 3 — README polish (Track A, ~7 commits)
- [ ] **A.1** Hero section: status pill + tagline + one-line CTA
- [ ] **A.2** Quick start: install walkthrough (mod-facing)
- [ ] **A.3** Architecture diagram (ASCII or mermaid)
- [ ] **A.4** Config schema reference (link to docs)
- [ ] **A.5** Fetch Domains section (Devvit Rules requirement)
- [ ] **A.6** Migration guide for existing CM operators
- [ ] **A.7** FAQ + Changelog + Credits expanded

### Wave 4 — Lighthouse audit (Track D, ~2-3 commits)
- [ ] **D.1** Manual code audit — image sizes, font loading, blocking scripts, accessibility
- [ ] **D.2** Fix any preventable Lighthouse hits (defer attribute, font-display, alt text)
- [ ] **D.3** Adjust if needed

### Wave 5 — Submission writeup outline (Track G, ~5 commits)
- [ ] **G.1** `docs/submission/pillar-5-numbers.md` — Reddit mod labor stats, citations
- [ ] **G.2** `docs/submission/writeup-draft.md` — first-person voice outline (per D10)
- [ ] **G.3** `docs/submission/demo-video-script.md` — 60s script with beats
- [ ] **G.4** Tool overview section
- [ ] **G.5** Project impact section

### Wave 6 — App icon (Track B, ~2 commits) ✓
- [x] **B.1** Generated 256×256 PNG via Banana (Nano Banana 2, 1K → sips downscale) matching Observatory aesthetic — `assets/icon.png` committed
- [x] **B.2** Referenced in README hero (right-aligned, 96px). Note: Devvit `config-file.v1.json` schema has no icon field — upload happens via Developer Portal (covered in Wave 8 cheat sheet).

### Wave 7 — Public flip + GH Pages (Track E1, ~2 commits)
> Requires explicit user OK — irreversible-ish (repo becomes world-readable).
- [ ] **E1.1** Add `.github/workflows/pages.yml` — publish `policies/` to GH Pages
- [ ] **E1.2** Flip repo private → public via `gh repo edit`
- [ ] **E1.3** Update README + policies links to point at hosted URLs

### Wave 8 — Devvit developer-settings form (Track E) ✓
- [x] **E.1** Cheat sheet at `docs/submission/devvit-app-settings.md` — verbatim copy for every field, AI-tone blocklist, pre-submission checklist, post-submission protocol. Stephen pastes the values when filling the form at developers.reddit.com/apps/cm-devvit/settings.

## Out of scope (Vinh's lane — never touch)
- `src/lib/idem.ts` — Vinh extends with new gates as needed
- `src/server/state/*` — Vinh owns Redis schemas
- `src/server/core/{handleActivity,runRule,runCheck,runRun,filters,config,namedRules,template}.ts` — Phase 1
- `src/server/rules/*` — Phase 2 + 4
- `src/server/actions/*` — Phase 2
- `src/server/image/*` — Phase 4

## Verification gates
- After every commit: `npm run type-check && npm run lint && npm test`
- After Wave 3: `code-reviewer` agent pass over README
- After Wave 5: `code-reviewer` agent pass over writeup drafts for AI-tone (Watchful1 lesson)
- After Wave 6: visual verification of icon in Devvit dashboard
- After Wave 7: GH Pages URL resolves + Privacy + Terms render
