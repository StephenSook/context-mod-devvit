---
name: ContextMod Devvit
description: Devvit Web port of FoxxMD's PRAW-era ContextMod moderation bot
spec: design-md/v1
audience: AI agents (Claude Code, Gemini, Codex) + future maintainers + asset generators
last-updated: 2026-05-13
related:
  - tailwind.config.ts (canonical token source)
  - src/client/index.html (font loading)
  - assets/icon.png (256x256 app icon)
  - assets/social-preview.png (1280x640 OG card)
  - assets/thumbnail.png (1200x800 Devpost thumb)
---

# DESIGN.md — ContextMod Devvit

> Brand and visual source-of-truth. AI agents loading this repo should read this file before generating new assets, writing UI, or producing marketing copy. Stitch's open-source DESIGN.md spec announced 2026-05-13 inspired the format.

## Identity

- **Name:** ContextMod (full) · `cm-devvit` (slug, ≤16 chars per Devvit constraint)
- **Tagline (60 char):** Rule-engine moderation, ported from PRAW to Devvit.
- **One-line elevator (200 char):** FoxxMD's PRAW mod bot, ported to Reddit Devvit Web. JSON5 rules in your sub's wiki, live action dashboard, per-sub install — no hosting, no API tokens, no shared bottleneck.
- **Audience:** Reddit subreddit moderators. Secondary: judges + Reddit dev reviewers.
- **Positioning:** *Not* a replacement for AutoMod. AutoMod handles regex; ContextMod handles context (author history, sub-distribution, image-hash, rule composition). The two coexist on the same sub.
- **Personality:** Technical, scrappy, honest. Dark warm-charcoal surface with thin white hairlines + single terminal-green accent dot — reads like a telemetry console, not a marketing page. No marketing prose. No AI-tone words (see `scripts/check-ai-tone.sh` blocklist).

## Voice

### Do say
- "Rule engine," "wiki config," "trigger," "action," "filter," "named rule"
- Specific numbers with citations ("60K weekly visitors," "73% bot-driven")
- First person ("I built," "I learned," "I cut")
- Honest gating ("Phase 4 gated on Day-0 spike," "MHS rule depends on domain approval")

### Never say
- AI-tone words — canonical list lives in [`scripts/check-ai-tone.sh`](./scripts/check-ai-tone.sh) `BLOCKLIST` array (do not duplicate here; the script is the source of truth).
- Marketing absolutes: "always," "never," "guaranteed," "100%"
- Vague abstractions: "ecosystem," "platform-native," "first-class," "battle-tested" <!-- AITONE_IGNORE -->
- "We" when describing solo work (this is Stephen's solo build with Vinh on backend)

The CI workflow runs `./scripts/check-ai-tone.sh` on every push as a soft check. Strict mode (`--strict`) blocks the pre-submission gate.

## Color tokens

Single source of truth: `tailwind.config.ts`. Hex values mirrored here for AI asset generators.

### Surface (ink)
- `ink.950` `#0A0A0B` — base background, dashboard canvas, social-preview background
- `ink.900` `#131316` — elevated card surface
- `ink.800` `#1B1B20` — modal surface
- `ink.700` `#26262C` — pressed / active state

### Foreground (bone)
- `bone.50` `#F5F5F4` — primary text
- `bone.100` `#E7E5E4` — secondary text
- `bone.200` `#A8A29E` — tertiary / muted
- `bone.300` `#71717A` — disabled / hint

### Semantic signal palette
- `signal.ok` `#4ADE80` — success, active rule, telemetry-positive, **brand accent**
- `signal.warn` `#FBBF24` — warning, attention, pending
- `signal.err` `#FB7185` — error, removed action, blocked
- `signal.info` `#60A5FA` — info, neutral mention, link hover

### Hairlines
- `line` `rgba(255,255,255,0.06)` — default divider on dark surface
- `lineStrong` `rgba(255,255,255,0.12)` — emphasized divider

### Asset palette (for Banana / external image gen)
Concentric rings + green dot motif. White hairlines on warm-charcoal. Single green accent. No additional colors. Use the in-app tokens above (ink + bone + signal).

### Diagram classDef palette (Mermaid / FigJam only — NOT in-app tokens)
The architecture flowchart in `README.md` uses four colors that are not Tailwind tokens — they are diagram-only conventions chosen for WCAG-AA on both light + dark GitHub themes:
- `#FF4500` (Reddit orange) — Devvit platform nodes
- `#0079D3` (Devvit blue) — server nodes
- `#10B981` (dashboard green) — client nodes
- `#6B7280` (gray) — external nodes

## Typography

Loaded via Google Fonts CDN in `src/client/index.html`. Three families:

- **Geist (sans, 300–700)** — primary UI font. Stat values, headings, buttons.
- **Geist Mono (400–600)** — code, technical labels, numeric values, JSON config snippets.
- **Instrument Serif (italic, 0/1)** — accent / display only. Pull-quotes, taglines, hero copy. **Italic-first**.

Letter spacing:
- `letterSpacing.tightest` `-0.04em` — display headers (Instrument Serif)
- `letterSpacing.tighter` `-0.025em` — UI headers (Geist 500–700)

## Spacing + layout

- Border radius scale: `0 / 6 / 10 / 14 / 18 / 22 px` (token names `none / sm / DEFAULT / lg / xl / 2xl`).
- Cards default to `lg` (14px) radius.
- Stat-card grid: 12-column responsive, gap-4 minimum.
- Mobile breakpoint: Tailwind defaults; primary target is 375px webview viewport.
- Hairline-only dividers (no shadows, no heavy borders). Use `border-line` Tailwind class.

## Motion

Two named keyframes in `tailwind.config.ts`:

- **pulse-dot** (2s ease-in-out infinite): green signal dot indicating "live." Used on Observatory dashboard "Live" indicator + map markers.
- **shimmer** (8s linear infinite): loading shimmer on stat cards before data lands.

CSS-only animations. **Never** use libraries that depend on runtime code-string evaluation — Devvit's CSP blocks them. (Framer Motion's older versions were the specific case that surfaced this constraint.)

Custom hand-rolled keyframes for hero animation (in client CSS): `cmFadeUp`, `cmFadeLeft`, `cmFadeIn`, `cmDrawLine`. ~600–1000ms ease-out durations.

## Iconography

[Lucide React](https://lucide.dev/) only. Stroke width 1.5–1.6 (see `EventRow.tsx` for the canonical 1.6 application). Default 13px in dense event rows, 16px in mod-menu, 20px in cards, 24px in hero areas. Matches Geist's stroke weight aesthetic.

## Components

### Stat card
- `ink.900` background, hairline border
- Geist Mono number (28px, weight 500, `letterSpacing.tighter`)
- Geist label (12px, `bone.200`, uppercase)
- Optional `signal.ok` accent dot for "live" state

### Event row
- ~36px row height (`py-2.5`), `ink.900` background with hairline border
- Status dot on left (1.5×1.5 rounded): `signal.ok` if all actions succeeded, `signal.err` if any failed
- 13px Lucide icon next to status dot — colored per action kind
- Action chip color mapping (canonical in `src/client/components/EventRow.tsx`):
  - `remove` = `signal.err` (#FB7185)
  - `approve` = `signal.ok` (#4ADE80)
  - `lock` = `signal.warn` (#FBBF24)
  - `comment` = `signal.info` (#60A5FA)
  - `report` = `signal.warn` (#FBBF24)
  - `ban` = `signal.err` (#FB7185)
  - `userFlair` = `#A78BFA` (violet — note: outside the `ink/bone/signal` token set; consider promoting to a `signal.author` token if it sticks)
- Rule name (Geist 12px medium) in middle column
- Activity ID (Geist Mono 10.5px) muted next to rule name
- Timestamp (Geist Mono 11px, `bone.300`, tabular-nums) on right

### Sparkline
- 24h volume, hourly bins
- `signal.ok` line, **1.25px stroke** (see `src/client/components/Sparkline.tsx`)
- `ink.800` background, no axis labels
- Math: `reduce()` not `Math.max(...arr)` — spread on large arrays throws (call-stack overflow). The rationale lives in the code comment.

### Error banner
- `signal.err` left-border (3px), `ink.900` background
- Geist 14px body, `signal.err` icon
- Dismissable, persists until reload

## Assets

| Asset | Path | Spec | Purpose |
|-------|------|------|---------|
| App icon | `assets/icon.png` | 256×256 RGBA PNG | Developer Portal upload + README hero |
| Social preview | `assets/social-preview.png` | 1280×640 RGBA PNG | GitHub OG card, Twitter / Discord link previews |
| Devpost thumbnail | `assets/thumbnail.png` | 1200×800 RGBA PNG (3:2) | Devpost Step 2 thumbnail slot |

All Banana-generated (Gemini 3.1 Flash Image / Nano Banana 2), re-encoded via PIL to real PNG (RGBA, optimized). **Never** ship JPEG bytes in a `.png` file — Devvit upload validation fails on magic-byte check (`file` reports JPEG even when extension is `.png`). Always verify with `file assets/*.png` after PIL re-encode.

## Surface configuration

`devvit.json` post entrypoint:
- `height: "tall"` — Observatory needs vertical room for stream + cards + sparkline
- `entry: "index.html"` (Devvit Web bundle output at `dist/client/`)
- `textFallback` provided (mobile / no-JS path)

## Data + telemetry storage shape

Redis-only per Devvit constraints. Strings + hashes + sorted sets — no Lists, no Sets.

- `cm:proc:{thingId}` 24h NX — trigger-level idempotency
- `cm:action:pending:{hash}` 5m NX — action reservation
- `cm:action:done:{hash}` 7d — action completion marker
- `cm:lock:{task}` 60s NX with ownership token — cron single-flight guard (`acquireLock` in `src/lib/idem.ts`)
- `cfg:current_rev` string — pointer to active config revision
- `cfg:rev:{n}` immutable JSON snapshot
- `events:recent` ZSET — 50-deep ring buffer for dashboard, score=ts member=event-json

## How AI agents should use this file

1. Generating a new image asset (Banana / Magic / Stitch): pull from "Color tokens" + "Asset palette" sections. Keep the concentric rings + central green dot motif — that's the brand mark.
2. Writing UI code (React + Tailwind): reference `tailwind.config.ts` for tokens; don't hardcode hex.
3. Producing copy (writeup / outreach / video script): apply "Voice" rules + run `./scripts/check-ai-tone.sh --strict` before pasting.
4. Building diagrams (Mermaid / FigJam): use the 4-color classDef palette from "Diagram classDef palette" — Reddit orange / Devvit blue / dashboard green / external gray.
5. Onboarding a new contributor: read this file + `tailwind.config.ts` + `src/client/App.tsx`.

## Provenance

Format inspired by Stitch's open-source DESIGN.md spec. Authored using the tokens already extracted in `tailwind.config.ts` + components in `src/client/components/`. Canonical-source pointers throughout so this doc points at the code instead of duplicating it — when in doubt, the code wins.

## Drift mitigation

This doc duplicates information from `tailwind.config.ts`, `src/client/components/*.tsx`, `devvit.json`, and `scripts/check-ai-tone.sh`. If any of those change, manually update the relevant section here OR add a check in `scripts/` that diffs the two. **The canonical source is always the code; this doc is the human-readable mirror.**
