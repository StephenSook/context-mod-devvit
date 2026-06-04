# ContextMod Observatory: In-App Config Editor (Workbench) — Design Spec

- Date: 2026-05-27
- Status: Approved for planning
- Source feedback: FoxxMD (upstream ContextMod author), Discord 2026-05-27

## 1. Problem

Today a mod edits the rule config only in Reddit's raw wiki page (`r/<sub>/wiki/botconfig/contextmod`). The Observatory dashboard just links out to it (`src/client/components/ActionBar.tsx:122`). No syntax help, no validation, no save-back. FoxxMD flagged this as the top friction point: "in-place editing and syntax validation are definitely the most crucial components." Non-technical mods must copy/paste between windows and match whitespace exactly.

## 2. Goal

An in-app config editor inside the Observatory dashboard that loads the current wiki config, edits it with syntax and schema help, validates inline, previews real moderation impact, and saves back to the wiki. No copy/paste. No external hosting. CSP-safe.

## 3. Scope (v1 = full feature set)

In:
- Expanded-mode workbench (`requestExpandedMode`) with split layout.
- CodeMirror 6 editor: YAML default, JSON5 supported, auto-detected.
- Schema-driven autocomplete + hover docs + inline AJV validation (squiggles + gutter).
- Live Impact pane: rule simulation against a cached sample of the sub's recent items, updating on debounced edit.
- AI Explain pane: plain-English summary of the current config (reuse `explainRule`).
- Diff pane: edited config vs current published rev (reuse `ConfigDiffViewer`).
- Save-back to wiki via `updateWikiPage`, server-validated, with optimistic-lock conflict guard.

Non-goals (deferred):
- Operator-level vs subreddit-level schema toggle (not needed for the per-sub Devvit model).
- Removal-reasons helper, multi-wiki-page editing, real-time multi-user collaboration.

## 4. Key decisions + rationale

- Editor is CodeMirror 6, not monaco. Monaco hard-requires `unsafe-eval`: its language workers bootstrap by evaluating code strings at runtime, and it loads those workers from external URLs. Devvit webviews block client-side external fetch and do not guarantee `unsafe-eval`. Monaco is also multi-MB. CM6 core is free of runtime code evaluation (verified against published bundles), worker-free, roughly 120 to 180 KB gzipped, and `codemirror-json-schema` provides schema autocomplete + hover + lint for YAML and JSON. Net: the monaco-style experience delivered CSP-safe.
- Surface is `requestExpandedMode` (Devvit-native: fullscreen on mobile, large modal on web), triggered on click. Replaces FoxxMD's new-tab pattern, which depends on his external host. Keeps the no-hosting model.
- Format is YAML default, JSON5 also supported, auto-detected via the existing `sniffFormat`. Rationale (FoxxMD): AutoMod uses YAML, so mods transfer the skill. The parser already accepts both.
- Reuse, do not rebuild: `simulateRule`, `explainRule`, `ConfigDiffViewer`, `parseConfig` + AJV, `app.schema.json`, `configStore.publish`, `loadFromWiki` all already exist.

## 5. Architecture

### 5.1 Surface + layout

`ActionBar` gets an "Edit config" button. On click, the client calls `requestExpandedMode` (from `@devvit/web/client`) and mounts `ConfigWorkbench`. Layout: left is the editor, right is a tabbed preview (Impact / Explain / Diff). Top bar: format indicator, validity indicator (valid or N errors), Validate, and Save to r/<sub>.

### 5.2 Client components (new + reused)

- `ConfigWorkbench.tsx` (new): orchestrator; lazy-loaded via dynamic import so CM6 is not in the dashboard's initial bundle.
- `ConfigEditor.tsx` (new): CM6 wrapper. Extensions: lang-yaml + lang-json, `codemirror-json-schema` (schema is `app.schema.json`), lint (AJV-backed), `EditorView.cspNonce`.
- `PreviewPane.tsx` (new): tabs.
  - ImpactTab: per-rule "would fire on N/M recent items" + example thingIds.
  - ExplainTab: AI explanation (reuse `explainRule`).
  - DiffTab: reuse `ConfigDiffViewer` (edited text vs current rev).
- api client (`src/client/lib`): add raw / save / simulate-live calls.

### 5.3 Server endpoints (`src/routes/api.ts`, new)

- `GET /api/config/raw`: returns `{ content, revisionId, format }` via the existing wiki read (`reddit.getWikiPage`, `src/core/configSource.ts:64`).
- `POST /api/config/validate`: body `{ text }`; runs `parseConfig` + AJV; returns `{ ok, errors }`. The server validate is the authority; the client may also run AJV for instant feedback.
- `POST /api/config/simulate-live`: body `{ text }`; parses, then runs the existing dry-run `simulateRule` against a cached sample of recent items; returns per-rule fire counts + examples. Dry-run only, zero side effects.
- `POST /api/config/save`: body `{ text, baseRevisionId }`; server re-parses + AJV-validates (reject if invalid); re-reads the current wiki `revisionId`, returns 409 if it differs from `baseRevisionId` (optimistic lock); else `reddit.updateWikiPage({ subredditName, page: WIKI_PAGE, content: text, reason })`; then publish + reload; returns `{ rev, ruleCount }`.

### 5.4 Live Impact sampling (the looks-impossible part, made cheap)

On workbench open, fetch ONE sample of recent items (for example the last 25 posts plus recent comments) via the existing read path, normalize, and cache (Redis, short TTL, keyed by sub + session). On each debounced valid edit (about 700 ms), `simulate-live` re-runs the proposed rules against the CACHED sample only. No repeated Reddit fetches, pure CPU, so live updates are fast and stay within API limits. It uses the dry-run simulation path, so no real moderation actions ever fire.

### 5.5 Save safety (writes to the live moderation config)

- Server-side re-validation is the gate: a config that fails AJV is never written to the wiki.
- Optimistic lock: save includes the `revisionId` the editor loaded; if the wiki changed since (concurrent edit), return 409 and prompt reload. Reuses the `cfgLastWikiRev` concept.
- Write as the app account (existing moderator scope). The `reason` string records the acting mod for the wiki audit log.
- Auth: save + simulate endpoints verify the caller is a moderator of the sub (reuse the app's existing mod-auth pattern, defense-in-depth per the prior review wave).
- The wiki retains revision history and `configStore` keeps `cfg:rev` snapshots, so revert is restoring a prior rev (the diff viewer shows what changed).

### 5.6 Schema hover docs

`app.schema.json` currently has no `description` fields. Add them so `codemirror-json-schema` shows hover documentation. Source the text from the JSDoc already on the interfaces in `src/shared/types.ts`. Prefer generating the schema (or its descriptions) from the types via `ts-json-schema-generator` to keep them in sync; if generation is heavy, hand-add descriptions for the common rule / action / filter properties in v1.

## 6. Data flow (end to end)

1. Open: click Edit config, call `requestExpandedMode`, lazy-load `ConfigWorkbench`, `GET /api/config/raw`, populate CM6, stamp `baseRevisionId`. Kick off one sample fetch for Impact.
2. Edit: keystrokes, CM6 + schema autocomplete/hover, debounced AJV lint (squiggles), validity indicator updates.
3. Impact: on debounced valid edit, `POST /api/config/simulate-live` (cached sample), ImpactTab renders fire-rate + examples.
4. Explain / Diff: on demand per tab.
5. Save: `POST /api/config/save`, server validate + lock check, `updateWikiPage`, publish + reload, toast "Saved, N rules live (rev R)". On 409, "Wiki changed, reload to merge".

## 7. Error handling + edge cases

- Invalid config: lint shows errors; Save disabled; server double-checks and rejects.
- Wiki read fails (404 fresh install, or breaker open): editor opens with the default-config template (`src/config/default-config.ts`) and a note.
- Save conflict (409): prompt reload; do not overwrite.
- Empty or first config: seed the editor with the default template; offer the YAML variant given AutoMod parity.
- Reddit API hiccup on save: surface the error, do not mark saved, config unchanged.
- CSP: pass `EditorView.cspNonce`; verify in playtest.
- Large config: CM6 handles large docs; lint debounced.

## 8. Bundle + performance

- Lazy-load the workbench (dynamic import) so the dashboard initial bundle stays near its current size (about 120 KB); CM6 (about 120 to 180 KB gzipped) loads only when Edit config is clicked.
- Tree-shake CM6 to the needed packages (state, view, language, lang-yaml, lang-json, lint, autocomplete, `codemirror-json-schema`, ajv).
- The sample is cached so live simulation is CPU-only after the first fetch.

## 9. Security

- Wiki-write is a new privileged surface. Gate every save behind a server-side mod-auth check plus server-side AJV validation. Never trust client-validated input.
- `updateWikiPage` runs as the app account (moderator scope already declared). Confirm the app's mod permissions include wiki edit at install (build-phase verification).
- Dry-run only for simulation; no real actions from the editor.
- The `reason` string on the wiki write records the acting mod for audit.

## 10. Testing

- Unit (vitest): `/api/config/raw` read; `/api/config/save` (rejects invalid, 409 on rev mismatch, success path calls `updateWikiPage` + publish); `simulate-live` reuses `simulateRule` + cached sample + dry-run; auth gate rejects non-mods.
- Client: `ConfigEditor` mounts CM6 and surfaces AJV lint; `PreviewPane` tab switching; Save disabled when invalid.
- E2E (Playwright, `?demo=1` with a mock wiki): open workbench, type invalid YAML (error + Save disabled), type valid (Impact shows fire-rate), Save (toast). axe-core scan in light + dark.
- Reuse the existing test harness and patterns.

## 11. Build-phase verifications (must pass before ship)

- CM6 renders inside a real Devvit playtest webview; determine whether `style-src` needs the nonce; confirm no runtime code-evaluation path is hit.
- App account has wiki-EDIT permission for `updateWikiPage` at install.
- Bundle budget: dashboard initial load unchanged; workbench chunk acceptable.

## 12. Build order within v1

1. Server: `/api/config/raw` + `/api/config/save` (validate gate + `updateWikiPage` + publish + 409 lock + mod-auth). Wiki-edit perm.
2. Client shell: ActionBar button + `requestExpandedMode` + `ConfigWorkbench` + `ConfigEditor` (CM6 YAML/JSON5 syntax) + load/save + lazy-load.
3. Schema help: descriptions on `app.schema.json` (from types JSDoc) + `codemirror-json-schema` autocomplete/hover/lint.
4. Preview: Diff tab (reuse), Explain tab (reuse), Impact tab (cached sample + live dry-run simulate).
5. Polish: validity + conflict UX, default-config seeding, mobile, accessibility.

## 13. Traceability to FoxxMD's asks

| FoxxMD ask | Delivered by |
|---|---|
| in-place editing (crucial) | `ConfigWorkbench` + CM6 in expanded mode |
| syntax validation (crucial) | `codemirror-json-schema` lint + AJV, inline |
| load + save wiki, no copy/paste | `/api/config/raw` + `/api/config/save` (`updateWikiPage`) |
| YAML (AutoMod parity) | YAML default, JSON5 also |
| monaco bells-and-whistles | CM6 schema autocomplete + hover (CSP-safe) |
| exceeds his editor | live Impact simulation + AI explain + diff |

## 14. Open questions

None blocking. Decide at build time: generate schema descriptions from JSDoc versus hand-author (lean toward generate).
