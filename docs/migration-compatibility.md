# Migration compatibility — upstream ContextMod → Devvit port

> For operators already running FoxxMD's PRAW-era [ContextMod](https://github.com/FoxxMD/context-mod): this document tells you exactly which rules, actions, filters, and config keys carry over, which are deferred, and which were explicitly cut. **No surprises in your wiki config.**

**Last reviewed:** 2026-05-14.
**Upstream version sampled:** master branch at the time of the Devvit port (FoxxMD's last release was Nov 2022).
**Audience:** the 15+ existing ContextMod operators who want to know "what changes for me?" before migrating.

---

## Quick answer

If your current wiki config uses **regex rules + author criteria + named rules + filters + Mustache-templated actions**, your config copies across with **zero changes** once Phase 1+2+3 wiring lands. If you use the Phase 4 stretch rules (history / attribution / recentActivity), they land post-hackathon. If you use `mhs`, that's cut per Reddit's PR #96 — keep running upstream PRAW for hate-speech filtering.

---

## Rule kinds

| Upstream rule | Devvit port status | Notes |
|---------------|---------------------|-------|
| `regex` (with `testOn` + `threshold`) | ✅ **Ported (Phase 1)** | Same JSON5 surface. `testOn` accepts `title \| body \| url`. Threshold is the minimum matched-pattern count for the rule to fire. |
| `author` | ✅ **Ported (Phase 1)** | Same JSON5 surface. Supports age / karma / flair / verified / contributor / mod / shadowBanned / removed / approved criteria with `equals` / `lessThan` / `greaterThan` / `in` operators. Account-history sub-criteria (`history`, `attribution`, `recentActivity`) land Phase 4 — see below. |
| `ruleSet` (AND/OR composition) | ✅ **Ported (Phase 1)** | Same JSON5 surface — `condition: 'AND' \| 'OR'` + `rules: []`. Nested ruleSets supported. `postBehavior: 'continue' \| 'stop' \| 'goto:<run-name>'` honored. |
| `named_rules` (declare-once, ref-by-name) | ✅ **Ported (Phase 1)** | Top-level `named_rules: { <name>: <rule> }` declaration. Reference from any check via `{ kind: 'ruleSet', name: '<name>' }`. |
| `history` | 🚧 **Deferred to Phase 4** | Cache-backed (`cm:author:{name}` hash, 1h TTL). Same criteria surface as upstream: submissionCount / commentCount / linkKarma / commentKarma / accountAge. |
| `attribution` | 🚧 **Deferred to Phase 4** | Same domain-frequency criteria as upstream. |
| `recentActivity` | 🚧 **Deferred to Phase 4** | Same per-sub thresholds + window criteria as upstream. |
| `repost` (URL mode) | 🚧 **Deferred to Phase 4** | URL sha256 + Redis SET dedup, 30-day TTL. |
| `repost` (image mode) | 🚧 **Deferred to Phase 4 (gated)** | Pure-JS perceptual blockhash + multi-band LSH in Redis. Gated on Phase 0.10 GO/NO-GO spike. If NO-GO, image-mode cut; URL-mode still ships. |
| `repost` (YouTube mode) | ✂️ **Cut** | YouTube Data API quota model doesn't fit Devvit's fetch policy. Upstream PRAW build keeps it. |
| `mhs` (ModerateHateSpeech HTTP fetch) | ✂️ **Cut 2026-05-13** | Reddit PR #96 (2026-05-08) locked HTTP fetch policy AI-provider allowlist to OpenAI + Gemini only; `api.moderatehatespeech.com` falls outside. Subs using upstream `mhs` for hate-speech filtering: keep running upstream PRAW. See [`devvit-app-settings.md`](./submission/devvit-app-settings.md). |
| `sentiment` | ✂️ **Cut** | NLP libs (compromise, sentiment) don't bundle cleanly in Devvit's 30s execution window + 500MB bundle cap. Upstream PRAW build keeps it. |
| `repeatActivity` | ✂️ **Cut** | Storage cost (per-user activity log) exceeds Devvit's per-install Redis cap (500MB). Use upstream PRAW if you need it. |

## Actions

| Upstream action | Devvit port status | Notes |
|------------------|---------------------|-------|
| `remove` | ✅ **Ported (Phase 2)** | Same fields (`reason`, `spam: bool`). Maps to `reddit.remove(thingId, spam)`. |
| `approve` | ✅ **Ported (Phase 2)** | Maps to `reddit.approve(thingId)`. |
| `lock` | ✅ **Ported (Phase 2)** | Maps to `reddit.lock(thingId)`. |
| `comment` | ✅ **Ported (Phase 2)** | Same fields (`body`, `distinguish`, `sticky`, `lock`). Mustache `{{author}}` / `{{subreddit}}` / `{{permalink}}` templating supported. |
| `report` | ✅ **Ported (Phase 2)** | Same fields (`reason`). Maps to `reddit.report(thingId, reason)`. |
| `ban` | ✅ **Ported (Phase 2)** | Same fields (`reason`, `duration`, `message`). Maps to `reddit.banUser(...)`. |
| `userFlair` | ✅ **Ported (Phase 2)** | Same fields (`text`, `cssClass`). Maps to `reddit.setUserFlair(...)`. |
| `dispatch` | ✂️ **Cut** | Defer-and-replay action queue isn't load-bearing for MVP. Upstream PRAW build keeps it. |
| `message` (PM to user) | ✂️ **Cut** | Devvit doesn't expose `reddit.sendPrivateMessage` to apps (per Devvit Rules anti-DM policy). |
| `modnote` | ✂️ **Cut** | Devvit's mod-notes API surface is unstable as of 5/14; revisit post-hackathon. |
| `usernote` | ✂️ **Cut** | Toolbox-specific data format; not portable to Devvit's per-install Redis. |
| `submission` (auto-submit) | ✂️ **Cut** | Anti-spam policy + Devvit Rules don't permit programmatic submission. |
| `contributor` (add/remove) | ✂️ **Cut** | Devvit doesn't expose the contributor-list API to apps. |
| `cancelDispatch` | ✂️ **Cut** | Paired with `dispatch` cut. |

## Filters

| Upstream filter | Devvit port status | Notes |
|------------------|---------------------|-------|
| `authorIs` | ✅ **Ported (Phase 1)** | Same JSON5 surface. Criteria match the `author` rule's criteria set. |
| `itemIs` | ✅ **Ported (Phase 1)** | Same JSON5 surface. Title / body / url / age / score / isSelf / over18 / removed / approved / locked / depth / op. |

## Config keys

| Upstream key | Devvit port status | Notes |
|--------------|---------------------|-------|
| `schema_version` | ✅ **Ported** | Required at root. Currently 1. |
| `runs[]` | ✅ **Ported** | Same shape — `name`, `checks[]`, `condition` (AND/OR), `postBehavior`. |
| `checks[]` | ✅ **Ported** | Same shape — `name`, `condition` (AND/OR), `rules[]`, `actions[]`, `authorIs`, `itemIs`, `postBehavior`. |
| `named_rules` | ✅ **Ported** | Top-level map of name → rule definition. |
| `runs[].postBehavior: 'goto:<run>'` | ✅ **Ported** | 100-iter safety break to prevent infinite loops. |
| `nicknames` | ✂️ **Cut** | Upstream feature that aliased external users to internal IDs; not portable to Devvit's per-install isolation. |
| `polling` | ✂️ **Cut** | Devvit triggers replace upstream's polling loop. |
| `caching` | ⚠️ **Replaced** | Upstream allowed mods to tune cache TTLs in config. Devvit version uses fixed TTLs (1h author cache, 7d done-keys, 24h proc-keys, 5m pending) for safety. |

## Wiki page path

| Upstream | Devvit port |
|----------|-------------|
| `r/<sub>/wiki/contextmod` | ✅ **Same path.** Existing operators can copy their wiki content over (minus the cut rules + replaced caching block). |

## Install model

| Upstream | Devvit port |
|----------|-------------|
| Self-hosted server (Heroku / VPS / bare-metal) + Reddit API tokens | Per-subreddit Devvit install via App Directory; no hosting, no tokens, no shared rate limits |
| Operator manages an instance serving N subs from one process | Each mod team installs their own isolated instance |
| Reddit API rate limits shared across all subs served by that operator | Each install has its own Devvit-managed rate budget |
| Storage: operator-managed Postgres / Mongo / SQLite | Per-install Redis (500MB cap, Devvit-managed) |

## Validation

| Upstream | Devvit port |
|----------|-------------|
| AJV against `Schema/App.json` | Same AJV pattern, schema trimmed for cut rules. Lands at `src/server/schema/app.schema.json` Phase 1. |
| Bad config → mod sees stack trace in logs | Bad config → last known-good revision stays active, dashboard event chip surfaces the parse/schema error (Phase 3 wiring) |

## What changes for me as an existing operator

Concretely, if you're FoxxMD-instance-class (running upstream CM today against r/mealtimevideos or similar):

1. **Your wiki config copies over.** Open `r/<your-sub>/wiki/contextmod` → copy → paste into the new install's same wiki path. Delete any `mhs` / `dispatch` / `message` / `modnote` / `usernote` / `sentiment` / `repeatActivity` blocks. Phase 4 rules (`history`, `attribution`, `recentActivity`, `repost`) stay in config but won't fire until Phase 4 ships post-hackathon — that's fine; they're no-ops, not errors.
2. **Your central server gets retired** after migration. The Devvit install handles polling, rate limiting, storage, and rule eval per-sub.
3. **Your reason-chain audit log** (which sub did X to author Y because rule Z) is now visible in-product via the Observatory dashboard (custom post). No more grep-the-Discord-webhook.
4. **Your operator-tier features** (cross-sub aggregate, multi-bot orchestration, dispatch-and-replay) **don't exist** in the Devvit port today. If you need them, keep running upstream alongside. The two coexist — each install is isolated.

## Cross-references

- [`README.md`](../README.md) — "Comparison" section for AutoMod vs original CM vs Devvit port
- [`README.md`](../README.md) — "Config schema" + "Validation behavior" sections
- [`examples/`](../examples/) — 3 working starter configs (starter / spam-fresh-account / approve-trusted-mod)
- [`PLAN.md`](../PLAN.md) — Phase 1–6 task-level breakdown
- [`docs/submission/writeup-draft.md`](./submission/writeup-draft.md) §3 — port-completion claims with rationale
- [`docs/submission/devvit-app-settings.md`](./submission/devvit-app-settings.md) — HTTP fetch policy + MHS cut closure
- Upstream: [github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)
- Upstream docs: [docs/subreddit-configuration/](https://github.com/FoxxMD/context-mod/tree/master/docs/subreddit-configuration)
