# ContextMod Devvit — example configs

Eleven working JSON5 configs that match the shipped Phase 1+2+3+4 AJV schema. Ready to paste into `r/<your-sub>/wiki/botconfig/contextmod` after install.

| File | Use case | Demonstrates |
|------|----------|--------------|
| [`starter-config.json5`](./starter-config.json5) | Default config seeded on install | regex rule + remove + comment + Mustache `{{author.name}}` / `{{item.title}}` templating + `authorIs` filter for mod/contributor bypass |
| [`spam-fresh-account.json5`](./spam-fresh-account.json5) | Catch spam from new low-karma accounts | `author` rule (account age in seconds + karma min/max + verified) AND `regex` rule combined via `combinator: 'AND'` |
| [`approve-trusted-mod.json5`](./approve-trusted-mod.json5) | Auto-approve trusted contributors | `namedRules` declaration + reference via `{kind: 'named', name: '...'}` + `combinator: 'OR'` composition + `postBehavior: 'stop'` to halt the run |
| [`comment-mod-banned-phrase.json5`](./comment-mod-banned-phrase.json5) | Comment moderation with regex + parent lock | `target: 'body'` regex (vs `'title'`) + `lock` action + multi-action sequencing + check-level `filters: { authorIs }` mod bypass |
| [`repost-watch-dryrun.json5`](./repost-watch-dryrun.json5) | URL-dedupe repost rule in DRY-RUN watch mode | `repost` rule (URL-mode) + per-action `dryRun: true` (elevate-only) + `report` action + 30-day window |
| [`low-karma-banned-list-comment.json5`](./low-karma-banned-list-comment.json5) | Low-karma + mod-curated banned-user list flag | `nameIn` AuthorFilter + two `author` rules combined via OR + `report` action with `reason` field |
| [`named-rules-flair-gating.json5`](./named-rules-flair-gating.json5) | Sub-flair-based trust system (verified contributors) | `flairTextIn` AuthorFilter + namedRules block + `{kind: 'named'}` references + multi-criteria filter (age + karma + verified) |
| [`nsfw-sub-strict.json5`](./nsfw-sub-strict.json5) | 18+ sub with strict verification requirements | `itemIs: { over18 }` filter + check-level filters object + multi-rule author check (unverified OR new OR low-karma) → remove + comment + report |
| [`history-fresh-low-karma.json5`](./history-fresh-low-karma.json5) | **Phase 4** — fresh+burner profile gating | `history` rule w/ flat OR-of-thresholds (postCountLt + commentKarmaLt + linkKarmaLt) + regex spam-words combination |
| [`attribution-drive-by-self-promo.json5`](./attribution-drive-by-self-promo.json5) | **Phase 4** — drive-by self-promo detection | `attribution` rule (domains list + domainPercent + minPosts floor) reading from 1h author-history cache |
| [`recent-activity-cross-sub.json5`](./recent-activity-cross-sub.json5) | **Phase 4** — cross-sub spam-signal correlation | `recentActivity` rule (subreddits list + post/commentCountGt independent triggers) reading from 1h author-history cache |

## How to use

1. Install ContextMod on your subreddit from the [App Directory](https://developers.reddit.com/apps/cm-devvit).
2. Open `https://reddit.com/r/<your-sub>/wiki/edit/botconfig/contextmod` in the wiki editor (creates the page if needed; wiki must be enabled in sub settings → `mod editing` mode works).
3. Paste one of the configs above as a starting point.
4. Edit to taste — rule names, regex patterns, author filter values are all yours to customize.
5. Save the wiki page (add an edit reason for audit trail).
6. In the subreddit mod overflow menu, click **ContextMod: Reload config from wiki** to apply immediately (otherwise the 5-min cron picks it up).
7. Verify via the Observatory dashboard's **Reload** toast (`Loaded N rules (rev M).`).

## Validation

The app validates the JSON5 against an AJV schema at `src/schema/app.schema.json` on every load (shipped Phase 1 — Vinh's commit 6694109, 2026-05-16). On validation failure, the **last known-good revision stays active** — your sub keeps moderating with the prior config until you fix the wiki, no broken-config window. Failure surfaces as an actionable toast: `Config parse failed — check the wiki page for JSON5/schema errors.`

Codex H6 hardening: even if a `{kind: 'named', name: 'X'}` reference points at an undefined named rule, the parser returns a structured `{ok: false, errors}` instead of throwing. Mods see "Named-rule expansion failed: unknown rule name 'X'", not a 500.

## Schema reference

See the full [Config schema](../README.md#config-schema) section in the project README, or read the canonical AJV schema at [`src/schema/app.schema.json`](../src/schema/app.schema.json) for every rule kind, filter criterion, action shape, and the full Mustache template context.

Quick reference (most-used fields):

| Concept | Field name | Notes |
|---------|------------|-------|
| Logical op | `combinator: 'AND' \| 'OR'` | NOT `condition` |
| Author criteria | `filter: AuthorFilter` | NOT `criteria`. Uses `ageMinSec` / `ageMaxSec` (seconds), `linkKarmaMin/Max`, `commentKarmaMin/Max`, booleans `isMod` / `isContributor` / `verified` / `shadowBanned` |
| Regex match | `pattern: string`, `flags?`, `target: 'title' \| 'body' \| 'url'` | NOT `patterns` array or `testOn` array — single pattern + single target per rule |
| Named rule reference | `{kind: 'named', name: '<rule-name>'}` | NOT `{kind: 'ruleSet', name: '...'}` (that's a ruleset, different thing) |
| Top-level named rules | `namedRules: { 'name1': Rule, ... }` | NOT `named_rules` (underscore) |
| Comment action body | `template: string` | NOT `body`. Mustache renders `{{author.name}}`, `{{item.title}}`, etc. |
| Remove action spam flag | `isSpam: boolean` | NOT `spam`. No `reason` field on remove. |
| Post-check flow | `postBehavior: 'next' \| 'stop' \| {goto: '<check-name>'}` | NOT `'continue'`. Default = `'next'` (omit to inherit). Object-form `goto` jumps within same run; not a string. |

## Composability rules

- **`namedRules`** at top level are referenced from any check via `{kind: 'named', name: '<rule-name>'}`. Cycle detection: a named rule that recursively references itself short-circuits to an empty ruleset (fail-safe).
- **Filters** (`authorIs` / `itemIs`) at the check level short-circuit BEFORE rule evaluation — fast-fail saves the lookup cost when the post obviously can't trip the rule (e.g., mod-authored, sticky, removed).
- **`combinator: 'AND'`** = all rules must pass for the check to trigger. **`'OR'`** = any rule passing triggers.
- **`postBehavior`** values: `'next'` (default — continue to next check on trigger), `'stop'` (halt the run on trigger, return collected actions), `{goto: '<check-name>'}` (jump to a named check within the same run — 100-iter safety break against circular loops).

## Mustache template context

Available in any `comment` action's `template`:

- `{{item.title}}`, `{{item.body}}`, `{{item.url}}`, `{{item.author}}`, `{{item.score}}`, `{{item.id}}`, etc.
- `{{author.name}}`, `{{author.linkKarma}}`, `{{author.commentKarma}}`, `{{author.age}}` (seconds), `{{author.isMod}}`, etc.
- Codex H4 hardening: `Mustache.escape` defaults to `escapeMarkdown` — raw `{{item.title}}` is auto-defanged (u/-pings, r/-pings, `[click](evil)` link injection, markdown chars). Use `{{{...}}}` triple-stash to bypass escaping for explicitly-raw moderator-authored content.

## What this doesn't show

The Phase 4 stretch rules (`history`, `attribution`, `recentActivity`) aren't in these examples — they're in active development. Once shipped, they slot into the same `rules` arrays as `regex` / `author` / `ruleset` / `named`. Image-hash repost (Phase 4.7) is deferred post-hackathon.

URL-dedupe repost rule (`{kind: 'repost', windowDays: 30}`) IS shipped in v0.2.0 (promoted from Phase 4 to Phase 2.5.1 — atomic SET NX, fail-OPEN on Redis outage, sub-scoped, FNV-1a64 hash). Not in the 3 example configs above but valid to add: `rules: [{kind: 'repost', name: 'url-30d', windowDays: 30}], actions: [{kind: 'remove', dryRun: true}]` is a good starting recipe.

`mhs` (ModerateHateSpeech) rule is **cut** from the Devvit port per Reddit PR #96 (HTTP fetch policy AI-provider allowlist restricted to OpenAI + Gemini only); subs that need hate-speech filtering keep running upstream PRAW ContextMod.
