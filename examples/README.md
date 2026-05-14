# ContextMod Devvit — example configs

Three working JSON5 configs that match the upstream ContextMod schema, ready to paste into `r/<your-sub>/wiki/contextmod` after install.

| File | Use case | Demonstrates |
|------|----------|--------------|
| [`starter-config.json5`](./starter-config.json5) | Default config seeded on install | regex rule + remove + comment + Mustache `{{author}}` / `{{subreddit}}` templating |
| [`spam-fresh-account.json5`](./spam-fresh-account.json5) | Catch spam from new low-karma accounts | author filter (age + karma + verified) AND regex rule combined |
| [`approve-trusted-mod.json5`](./approve-trusted-mod.json5) | Auto-approve trusted contributors | `named_rules` declaration + `ruleSet` composition + `postBehavior: stop` |

## How to use

1. Install ContextMod on your subreddit from the [App Directory](https://developers.reddit.com/apps/cm-devvit).
2. Open `https://reddit.com/r/<your-sub>/wiki/contextmod` in the wiki editor.
3. Paste one of the configs above as a starting point.
4. Edit to taste — rule names, regex patterns, author criteria are all yours to customize.
5. Save the wiki page.
6. In the subreddit mod overflow menu, click **ContextMod: Reload config from wiki** to apply immediately (otherwise the 5-min cron picks it up).

## Validation

The app validates the JSON5 against an AJV schema on every load (Phase 1 deliverable — schema lives at `src/server/schema/app.schema.json`). On validation failure, the **last known-good revision stays active** — your sub keeps moderating with the prior config until you fix the wiki, no broken-config window.

Reload errors surface in the Observatory dashboard as an event chip with the parser line + column.

## Schema reference

See the full [Config schema](../README.md#config-schema) section in the project README for every rule kind, filter criterion, action shape, and Mustache template variable.

## Composability rules

- **Named rules** declared in top-level `named_rules` can be referenced from any check via `{ kind: 'ruleSet', name: '<name>' }`.
- **Filters** (`authorIs` / `itemIs`) at the check level gate whether the check runs at all — fast-fail before rule evaluation.
- **`condition: 'AND'`** = all rules must pass for actions to fire. **`'OR'`** = any rule passing fires actions.
- **`postBehavior`** in a check tells the run loop what to do after this check matches: `continue` (default), `stop` (skip remaining checks), or `goto:<run-name>` (jump to a named run).

## What this doesn't show

The Phase 4 stretch rules (`history`, `attribution`, `recentActivity`, `repost`) aren't in these examples — they land post-hackathon. Once shipped, they slot into the same `rules` arrays as regex / author / ruleSet.

`mhs` rule is cut from the Devvit port per Reddit PR #96 (HTTP fetch policy AI-provider allowlist locked to OpenAI + Gemini only); subs that need hate-speech filtering keep running upstream PRAW ContextMod.
