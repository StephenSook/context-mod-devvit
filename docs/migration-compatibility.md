# Migration compatibility — upstream ContextMod → Devvit port

> For operators already running FoxxMD's PRAW-era [ContextMod](https://github.com/FoxxMD/context-mod): this document tells you exactly which rules, actions, filters, and config keys carry over and which were explicitly cut. **No surprises in your wiki config.**

**Last reviewed:** 2026-05-17 (v0.2.0).
**Upstream version sampled:** master branch at the time of the Devvit port (FoxxMD's last release was Nov 2022).
**Audience:** the 15+ existing ContextMod operators who want to know "what changes for me?" before migrating.

---

## Quick answer

If your current wiki config uses **regex rules + author criteria + named rules + filters + Mustache-templated actions + URL-dedupe repost + history / attribution / recentActivity author-history rules + image-mode repost**, your config copies across with **minor renames** as of Devvit-port v0.6.7 (Phase 1+2+3+4+4.7 ALL shipped 2026-05-18, in Reddit App Directory review). If you use `mhs`, that's cut per Reddit's PR #96 — keep running upstream PRAW for hate-speech filtering.

**Schema renames you'll apply to your wiki config (one-time):**
- `condition:` → `combinator:` on runs / checks / ruleSets
- `testOn:` → `target:` on regex rules
- `patterns: [...]` → `pattern: "..."` (single string per rule)
- `criteria:` → `filter:` on author rules
- `body:` → `template:` on comment actions
- `{ kind: 'ruleSet', name: '<name>' }` for named-rule refs (was `{ kind: 'named', name }` upstream)
- Top-level: drop `schema_version` (no longer required), camelCase `namedRules` (was `named_rules`)
- Wiki path: `r/<sub>/wiki/botconfig/contextmod` (was `r/<sub>/wiki/contextmod`)
- `postBehavior:` values: `'next'` (default) / `'stop'` / `'goto:<run-name>'` (was `'continue'` upstream → now `'next'`)

---

## Rule kinds

| Upstream rule | Devvit port status | Notes |
|---------------|---------------------|-------|
| `regex` (with `target` + `threshold`) | ✅ **Ported (Phase 1)** | JSON5 surface w/ schema rename: `target:` (was `testOn:`) accepts `title \| body \| url`; `pattern:` is now a single string per rule (was `patterns: []`). Threshold is the minimum matched-pattern count for the rule to fire. |
| `author` | ✅ **Ported (Phase 1)** | Rename: `filter:` (was `criteria:`). Supports age / karma / flair / verified / contributor / mod / shadowBanned / removed / approved fields with `equals` / `lessThan` / `greaterThan` / `in` operators. Account-history sub-criteria (`history`, `attribution`, `recentActivity`) land Phase 4 — see below. |
| `ruleSet` (AND/OR composition) | ✅ **Ported (Phase 1)** | Rename: `combinator: 'AND' \| 'OR'` (was `condition:`) + `rules: []`. Nested ruleSets supported. `postBehavior: 'next' \| 'stop' \| 'goto:<run-name>'` honored (`'continue'` upstream → `'next'` Devvit). |
| `namedRules` (declare-once, ref-by-name) | ✅ **Ported (Phase 1)** | Top-level `namedRules: { <name>: <rule> }` (camelCase, was `named_rules:` upstream). Reference from any check via `{ kind: 'ruleSet', name: '<name>' }`. |
| `repost` (URL mode) | ✅ **Ported (Phase 2)** | URL sha256 + Redis `cm:repost:url:{hash}` w/ SET NX semantics for atomicity (Codex C1), 30-day TTL. Promoted from Phase 4 by Codex hardening pass. |
| `history` | ✅ **Ported (Phase 4, 2026-05-18)** | Cache-backed (`cm:author:{name}` hash, 1h TTL, per-author lock to prevent cache-miss thundering herd — Polish #77). Same criteria surface as upstream: submissionCount / commentCount / linkKarma / commentKarma / accountAge. |
| `attribution` | ✅ **Ported (Phase 4, 2026-05-18)** | Same domain-frequency criteria as upstream. |
| `recentActivity` | ✅ **Ported (Phase 4, 2026-05-18)** | Same per-sub thresholds + window criteria as upstream. |
| `repost` (image mode) | ✅ **Ported (Phase 4.7, 2026-05-18)** | Pure-JS perceptual blockhash (`upng-js` + `jpeg-js` + `blockhash-core`) on preview.redd.it variants. 256-bit hash, configurable Hamming threshold (default 8 of 256). Per-sub lock around findSimilar+recordHash (Polish #61) prevents the read-modify-write race on concurrent duplicate posts. Multi-band LSH is the post-MVP scale optimization, deferred. |
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
| `comment` | ✅ **Ported (Phase 2)** | Rename: `template:` (was `body:`). Fields: `template`, `distinguish`, `sticky`, `lock`. Mustache `{{author}}` / `{{subreddit}}` / `{{permalink}}` templating supported w/ default `escapeMarkdown` for safety (Codex H4). |
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
| `schema_version` | ✂️ **Dropped** | No longer required at root in Devvit port. AJV schema doesn't validate it; harmless if present. |
| `runs[]` | ✅ **Ported** | Shape: `name`, `checks[]`, `combinator` (was `condition`, AND/OR), `postBehavior`. |
| `checks[]` | ✅ **Ported** | Shape: `name`, `combinator` (was `condition`, AND/OR), `rules[]`, `actions[]`, `authorIs`, `itemIs`, `postBehavior`. |
| `namedRules` | ✅ **Ported** | Top-level map of name → rule definition (camelCase, was `named_rules` upstream). |
| `runs[].postBehavior: 'goto:<run>'` | ✅ **Ported** | 100-iter safety break to prevent infinite loops. |
| `nicknames` | ✂️ **Cut** | Upstream feature that aliased external users to internal IDs; not portable to Devvit's per-install isolation. |
| `polling` | ✂️ **Cut** | Devvit triggers replace upstream's polling loop. |
| `caching` | ⚠️ **Replaced** | Upstream allowed mods to tune cache TTLs in config. Devvit version uses fixed TTLs (1h author cache, 7d done-keys, 24h proc-keys, 5m pending) for safety. |

## Wiki page path

| Upstream | Devvit port |
|----------|-------------|
| `r/<sub>/wiki/contextmod` | ⚠️ **Path renamed → `r/<sub>/wiki/botconfig/contextmod`** (namespaced under `botconfig/` for collision-safety w/ other Devvit apps). Existing operators copy their wiki content to the new path (minus the cut rules + replaced caching block + the schema renames listed at top). |

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
| AJV against `Schema/App.json` | Same AJV pattern, schema trimmed for cut rules. Lives at `src/schema/app.schema.json` (unified isomorphic path, used by both server validator + dashboard dry-run typing). |
| Bad config → mod sees stack trace in logs | Bad config → last known-good revision stays active via atomic INCR-allocated revision pointer (Codex H2), dashboard event chip surfaces the parse/schema error |

## What changes for me as an existing operator

Concretely, if you're FoxxMD-instance-class (running upstream CM today against r/mealtimevideos or similar):

1. **Your wiki config copies over with one-time renames.** Open `r/<your-sub>/wiki/contextmod` → copy → apply the schema renames listed in the Quick Answer at top → paste into the new install's `r/<sub>/wiki/botconfig/contextmod` path. Delete any `mhs` / `dispatch` / `message` / `modnote` / `usernote` / `sentiment` / `repeatActivity` blocks. Phase 4 author-history rules (`history`, `attribution`, `recentActivity`) AND Phase 4.7 image-hash repost work today (shipped 2026-05-18). URL-dedupe `repost` (Phase 2) works today.
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
