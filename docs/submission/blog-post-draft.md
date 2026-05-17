# ContextMod is back: a Devvit Web port for the post-PRAW era

> **For Stephen — paste this into dev.to / hashnode / Substack + edit in own voice per D10 (no AI-tone words: powerful, sophisticated, seamless, leverage, robust, cutting-edge, intuitive, amazing, easily, simply, effortlessly, transform). Expected cut: ~30%. Replace 1-2 phrases per section so it doesn't read as a single voice. Drop the "what I built" pre-amble if you want to lead with the operator hook.**

## TL;DR

I ported FoxxMD's ContextMod — the rule-engine moderation bot a generation of subreddit mods built workflows around — from PRAW to Reddit's Devvit Web platform. v0.2.0 is in Reddit App Directory review. If you mod a sub that ran upstream CM before the 2023 paid Data API tier broke the economics, this gives you the same rule + check + action concept model with zero hosting, zero tokens, and per-install Redis isolation. One-click install. Built for the Reddit Mod Tools and Migrated Apps Hackathon 2026.

App Directory: https://developers.reddit.com/apps/cm-devvit
Repo: https://github.com/StephenSook/context-mod-devvit (MIT, 256+ tests, CI green)
Permission: https://github.com/FoxxMD/context-mod/issues/152

## The hook

Reddit mod teams are drowning. r/modnews May 2026 had its top 4 upvoted comments all asking for stronger anti-spam tooling. The pattern is consistent: AI-generated posts at scale, new-account spam farms cycling through banlists, repost waves from clipped news articles, off-topic crypto giveaways. AutoMod regex helps. But the real anti-spam tooling — the FoxxMD-class rule engine that 15+ subreddit mod teams built workflows around — sat behind the original ContextMod's central-server requirement. That worked until Reddit's July 2023 paid Data API tier broke the hosting math.

So we ported it to Devvit.

## The problem with the original ContextMod, briefly

- One operator hosted a server (Heroku / VPS / bare metal).
- That server pulled OAuth tokens for each sub on each install.
- Shared rate limits across all subs that operator served.
- Self-managed Postgres / Mongo / SQLite.
- "If you want a faster install, run your own."

This worked. r/mealtimevideos (60K weekly visitors) is still on it. r/piercing (600K visitors). At least 15 other communities. But the cost-to-operate went up, the operator pool shrank, and FoxxMD's own infra-time went into keeping the lights on.

## What changes with Devvit

- Per-subreddit Devvit install — one-click from the App Directory.
- Per-install Redis (500MB cap, Devvit-managed, isolated).
- No central server, no shared tokens, no per-operator rate-limit math.
- Wiki page lives at `r/<your-sub>/wiki/botconfig/contextmod` — same JSON5 schema mods already know, minus a few rule kinds Devvit's runtime doesn't permit.

The concept model is preserved:

- **Runs** orchestrate **checks**.
- **Checks** combine **rules** via AND/OR + `postBehavior` flow control (`next` / `stop` / `goto:<run>`).
- **Rules** evaluate against the post/comment + author profile.
- **Actions** fire when rules trigger — remove / approve / lock / comment / report / ban / userFlair.
- **Filters** (`authorIs` / `itemIs`) short-circuit before rule eval.
- **Named rules** compose by string reference.
- **Mustache templates** in action messages, with `escapeMarkdown` defaulted on for safety.

If your wiki config worked under PRAW CM, it copies over with a handful of one-time renames (`condition:` → `combinator:` on runs/checks/ruleSets, `criteria:` → `filter:` on author rules, `body:` → `template:` on comment actions, `testOn:` → `target:` + `patterns:[]` → `pattern:""` on regex rules, top-level `named_rules` → `namedRules` camelCase, wiki path renamed to `botconfig/contextmod` to keep the wiki namespace clean against other Devvit apps). The full diff is documented in `docs/migration-compatibility.md`.

## What ships in v0.2.0

- **Phase 1**: rule engine — regex / author / ruleSet rules + named rules + filters + Mustache + run state machine with a 100-iter safety break against circular goto.
- **Phase 2**: 7 MVP actions + handleActivity orchestrator + URL-dedupe `repost` rule (promoted up from Phase 4 because the atomic SET NX cleanup made it dead-simple to ship).
- **Phase 3**: wiki config loader cron + reload-config mod menu + onAppInstall default-config seed + onAppUpgrade migrations + live `/api/recent` ZRANGE reads.
- **Step 3.6**: dry-run rule tester — right-click any post or comment, "Test rules on this item", get a toast with the would-have-fired list. Zero Reddit side-effects.
- **Codex hardening**: 2 CRITICAL + 12 HIGH safety findings closed. Atomic INCR-allocated config revision pointer. Lease owner tokens on per-action idempotency. CSV export formula-injection neutralization with Unicode bidi/control bypass coverage (yes, an `=HYPERLINK(...)` in a username would have fired in Excel — neutralized now).
- **Observatory dashboard**: React + Vite + Tailwind custom-post webview. Stat cards. 24h sparkline. Event stream with status-aware chips (`ok / dry-run / error / skipped-locked`). Header live-tick with glow-pulse on data arrival. Filter chips. Keyboard shortcuts (press `?`). Onboarding tour on first visit. Per-event click-to-expand drill-down.

## What's deferred or cut

Honest list:

- **Phase 4 stretch rules** (`history`, `attribution`, `recentActivity`) — caches author submission counts + karma + activity windows. Author cache substrate is queued. Vinh's lane.
- **Image-hash repost detection** — perceptual blockhash + LSH. The Day-0 spike never ran pre-hackathon; the GO/NO-GO call is post-hackathon work.
- **MHS toxicity rule** — Reddit PR #96 (2026-05-08) restricted HTTP fetch to OpenAI + Gemini AI-provider allowlist. ModerateHateSpeech sits outside. If you need it, keep running upstream PRAW CM in parallel. (We've raised this with the Devvit team; a moderation-classifier allowlist carve-out would unblock it.)
- **Cross-sub federation** — out of scope for per-install isolation by design.

## Three commands to try it locally

```bash
git clone https://github.com/StephenSook/context-mod-devvit.git
cd context-mod-devvit
npm ci && npm run dev:web
```

Then open http://localhost:5173/?demo=1. The `?demo=1` query parameter seeds the dashboard with synthetic events (per the production-safety pattern — fabricated data never auto-shows). Remove the flag to see the empty state with a starter-config snippet + copy-to-clipboard.

## What we learned about Devvit shipping a rule engine

Quick notes that might save you time:

- **Redis primitives**: strings + hashes + ZSETs only. No Lists. No Sets. No Lua / transactions. You hand-roll atomic-across-key patterns (idempotency leases with owner tokens, atomic config publish via INCR-allocated rev, ZSET ring buffers for recent events). A "Devvit-Redis-patterns" doc canonicalizing the workarounds would close a real gap.
- **Trigger envelope shape**: Devvit form submit returns FLAT `{thingId}` not nested `{values: {thingId}}` per the doc convention. We learned this in live playtest. Defensive multi-shape parse now.
- **Disabled form fields**: don't submit per HTML spec. If you need to round-trip a value, ship it visible-but-readOnly.
- **HTTP fetch policy**: see PR #96. AI-provider allowlist is fine for OpenAI + Gemini. Anything else is a denial. Plan accordingly.
- **vite dev gating**: the @devvit/start plugin blocks `vite dev`. Our workaround chains `vite build` → mock Node stdlib HTTP server for the local-dev story. Pure stdlib, binds 127.0.0.1 only.

## What's next

- Reddit App Directory v0.2.0 review approval (1-7 day SLA, submitted 2026-05-16).
- Phase 4 rule ladder shipping pre-deadline if Vinh's bandwidth holds.
- Reaching the 15+ original CM operators with a migration path.
- Hackathon judging period after May 27 18:00 PT deadline.

If you mod a sub + want to playtest before submission, dm me on Reddit (u/CowSufficient3840) or open a discussion on the GitHub repo. If your sub used original ContextMod and you want help porting your wiki config over, same.

Thanks to FoxxMD for the permission to port + the original rule engine design. Thanks to everyone in the Reddit Devvit Discord + r/Devvit who answered "is this on the right path" questions over the last 4 weeks.

— Stephen Sookra (u/CowSufficient3840) + Vinh (github.com/vinhbin)

---

_Cross-posted from github.com/StephenSook/context-mod-devvit. Submission to Reddit Mod Tools and Migrated Apps Hackathon 2026 — Best Ported App category._
