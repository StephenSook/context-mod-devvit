# Migrate from upstream ContextMod (PRAW) → Devvit Web port — 5 steps

> **For the 15+ subreddit mod teams** running FoxxMD's original PRAW ContextMod. Five practical steps to flip your sub to the Devvit Web port (`cm-devvit`). Should take 15-30 minutes per sub including verification.
>
> Full compatibility matrix (every rule kind, action, filter, config key — what's ported / deferred / cut) lives in [`docs/migration-compatibility.md`](./migration-compatibility.md). This doc is the action-list.

**Last reviewed:** 2026-05-17 (v0.2.0 in Reddit App Directory review).

---

## Before you start

You need:
- Mod permissions on the sub (specifically `posts` + `wiki` permissions).
- Your existing `r/<sub>/wiki/contextmod` config copied somewhere (text file, gist, etc).
- Knowledge of which CM rules + actions your sub actually uses. (You don't need to migrate features you never enabled.)

You DON'T need:
- A server. The Devvit port runs in Reddit's runtime, per-install Redis.
- API tokens. Devvit handles auth via the install permission grant.
- A new wiki page from scratch — the Devvit install seeds a starter config on first install.

---

## Step 1 — Install cm-devvit from the App Directory

1. Open https://developers.reddit.com/apps/cm-devvit
2. Click **Add to community**.
3. Pick the sub you want to migrate.
4. Approve the install (you must be a mod with `posts` + `wiki` permissions).

When the install completes, the app fires `onAppInstall` and seeds a default starter config to `r/<your-sub>/wiki/botconfig/contextmod`. You can override it in Step 2.

---

## Step 2 — Copy your existing config to the new wiki path

The wiki page renamed: `r/<sub>/wiki/contextmod` (upstream) → **`r/<sub>/wiki/botconfig/contextmod`** (Devvit). The `botconfig/` namespace prefix is collision-safety against other Devvit apps that may want their own wiki pages.

1. Open `https://reddit.com/r/<your-sub>/wiki/edit/botconfig/contextmod`
2. Paste your existing upstream CM config in.
3. Apply the schema renames in Step 3 before you save.

---

## Step 3 — Apply the one-time schema renames

The Devvit port's AJV schema tightened a few field names to match TypeScript convention. Run these find-replace passes against your config text BEFORE you save the wiki page:

| Upstream PRAW CM | Devvit port |
|------------------|-------------|
| `condition: 'AND' \| 'OR'` (on runs / checks / ruleSets) | `combinator: 'AND' \| 'OR'` |
| `criteria: {...}` (on author rules) | `filter: {...}` |
| `testOn: ['title']` (on regex rules) | `target: 'title'` (string, not array) |
| `patterns: ['foo', 'bar']` (on regex rules) | `pattern: 'foo\|bar'` (single regex string) |
| `body: '...'` (on comment actions) | `template: '...'` |
| `spam: true` (on remove actions) | `isSpam: true` |
| `named_rules: { ... }` (top-level) | `namedRules: { ... }` (camelCase) |
| `{kind: 'ruleSet', name: 'X'}` (named-rule ref) | `{kind: 'named', name: 'X'}` |
| `postBehavior: 'continue'` | `postBehavior: 'next'` (default; can omit) |
| Top-level `schema_version: 1` | **Drop entirely** — no longer required by AJV |

The full schema is in [`src/schema/app.schema.json`](../src/schema/app.schema.json). Working starter configs in [`examples/`](../examples) — all 8 AJV-validated.

---

## Step 4 — Delete the rule kinds that don't run on Devvit

Remove these from your config (the AJV schema rejects them):

| Upstream CM feature | Why cut |
|---------------------|---------|
| `mhs` rule (ModerateHateSpeech HTTP fetch) | Reddit PR #96 (2026-05-08) — HTTP fetch policy AI-provider allowlist excludes ModerateHateSpeech. Keep upstream PRAW alongside if you need it. |
| `dispatch` action / `cancelDispatch` | Defer-and-replay queue cut for MVP |
| `message` action (PM to user) | Devvit policy — no DMs from apps |
| `modnote` action | Devvit API surface unstable |
| `usernote` action | Toolbox-format, not portable |
| `submission` action (auto-submit) | Devvit policy — no programmatic posts |
| `contributor` action | API not exposed to apps |
| `sentiment` rule | NLP libs don't bundle in Devvit runtime |
| `repeatActivity` rule | Storage cost exceeds 500MB Redis cap |
| `nicknames` (top-level) | Per-install isolation supersedes |
| `polling` (top-level) | Devvit triggers replace it |

Phase 4 stretch rules (`history`, `attribution`, `recentActivity`) ARE included in the schema but won't fire until Vinh ships them. They're no-ops, not errors — safe to leave in config.

---

## Step 5 — Save the wiki page + verify in the dashboard

1. **Save** the wiki page (add an edit reason like "ported from upstream PRAW CM").
2. In the subreddit mod overflow menu, click **ContextMod: Reload config from wiki**.
3. You should see a toast: `Loaded N rules (rev 1).` — N matches your check count.
4. In the mod overflow menu, click **ContextMod: View recent actions**. A custom post appears = Observatory dashboard.
5. Submit a test post that matches one of your rules. Within ~3 seconds the dashboard should show the new event with the action chips.
6. (Optional) Right-click any existing post → **ContextMod: Test rules on this item** → dry-run shows what rules would have fired without taking action.

If something fails:
- **Toast says "Config parse failed"** — open the wiki edit page, fix the JSON5 error, re-save, reload-config. The previous good rev stays active until the new one validates.
- **Toast says "Wiki page not found"** — verify the path is exactly `botconfig/contextmod` (not `contextmod` alone) and the page exists.
- **Dashboard empty after a real trigger** — wait the full 10-second poll cycle. If still empty after 30s, file an issue using the [config-help template](../.github/ISSUE_TEMPLATE/config_help.yml).

---

## What stays on upstream PRAW (run both in parallel if you need)

Each install is isolated. If you need a feature that's cut (e.g., `mhs` toxicity, `dispatch` queue, `modnote` integration), the Devvit port and upstream PRAW CM can coexist on the same sub — each fires its own rules, neither sees the other's state. There's no shared rate limit, no shared config. The two run side-by-side until either you don't need the cut feature anymore, or Devvit unblocks it.

## What you GET by migrating

- **No hosting** — the operator-time you spent keeping the server alive goes back to you.
- **No tokens** — Devvit's per-install permission grant replaces the OAuth-token-per-sub model.
- **Per-install Redis isolation** — each sub gets its own 500MB Redis budget, Devvit-managed.
- **Live Observatory dashboard** in-product — no more grep-the-Discord-webhook for the audit log.
- **Dry-run rule tester** — verify rules against existing posts without firing actions.
- **Atomic config publish** — bad wiki edits don't kill the bot, last known-good revision stays active.
- **Codex-hardened safety primitives** — idempotency leases with owner tokens, atomic INCR-allocated config revs, CSV-export formula-injection neutralization (mod exports the audit log to Excel without an `=HYPERLINK(...)` username firing).

## Want help migrating?

DM `u/CowSufficient3840` on Reddit or open a discussion on [github.com/StephenSook/context-mod-devvit](https://github.com/StephenSook/context-mod-devvit). For specific config questions, the [config-help issue template](https://github.com/StephenSook/context-mod-devvit/issues/new?template=config_help.yml) routes to the operator-support queue.

---

_Drafted 2026-05-17 for the 15+ operator pool identified in FoxxMD/context-mod#152. Last verified against schema v0.2.0._
