# FoxxMD + Magnes + SampleOfNone Discord feedback response (2026-05-20)

Structured response plan for the senior-dev feedback received in the cm-devvit Discord on 2026-05-20, mid-submission week (T-7 from deadline 2026-05-27 18:00 PT). Three Polish-tier atomic commits shipped + remaining Stephen-side actions documented.

## Feedback inventory (verbatim)

**FoxxMD (creator of upstream PRAW ContextMod), 9:49 AM:**
> "I'm not sure how well existing CM mods will be able to use this. Yes cm does support json5 but it also supports yaml which is what most mods use since it's the same syntax as automod."

**Magnes (experienced sub moderator), 10:25 AM:**
> "I'm curious, did you run into any issues regarding removing comments/posts based on user history? Reddit recently removed hive-protector's ban ability (IIRC); I think it still can do everything else though. Big difference between wholesale banning and just removing a comment, so it would be understandable if they don't mind the latter. Not sure if it removes comments; so I'm wondering if they're ok with that too. I still use CM to flag and remove based on user history. Also thanks for doing this! And yea MHS doesn't work anymore it seems. On their website too, like you can't make new accounts or see your API data, regenerate your API key. Seems to bug out." (followed by screenshot "ERROR: Could not connect. Connection refused" from the MHS service)

**SampleOfNone (r/piercing mod, 600K subs), earlier in same thread:**
> "You need to publish the app as public, otherwise nobody can install it. Also, did you already test that the mod dashboard is really mod only? I've seen a lot of hackaton apps trip over that and regular users could see the dashboard."

## Investigation methodology

Three parallel sub-agents dispatched + targeted local investigation:

1. **gemini-agent**: full 27-endpoint mod-auth audit across `src/routes/`. Surfaced CRITICAL gap on `/api/recent` + HIGH gap on `/api/stats` (both ungated, leaking per-event mod actions and rule-name + per-sub histogram to any non-mod iframe viewer).
2. **Explore agent**: ban-action call-chain trace + config-parser inventory. Confirmed `src/actions/ban.ts` `reddit.banUser` is wired correctly with non-retryable 4xx classifier surfacing any 403 from Reddit as a red dashboard row. Mapped 3 production config-parse callsites + 1 CLI migration utility.
3. **codex-rescue (adversarial review)**: prioritization stress-test. Reinforced findings, added "missing Devvit capability matrix" gap, recommended runtime YAML-to-object parsing (not full YAML storage), and ranked YAML higher than ban-action policy because YAML blocks 100% of existing CM operators from installing.
4. **Local WebSearch**: confirmed Reddit's March 19, 2026 policy disabling sub-association auto-banning in mod bots (piunikaweb 2026-03-06, SaferBot fully disabled, Hive-Protect lost auto-ban but kept report/remove/comment).

## Findings tier

### TIER 1 (BLOCKER, fixed this session)

**1. `/api/recent` and `/api/stats` leaked sensitive payloads to non-mods (SampleOfNone-flagged bug class).**
- gemini-agent confirmed both endpoints had ZERO mod-auth gate. `/api/recent` returned the last-50 mod-action ring buffer (runName, checkName, actions, matchedRule, runPath, matchedSubstring, wouldHaveCalled). `/api/stats` returned `topRule` (rule name) + `hourlyActions24h` histogram.
- Devvit `permissions.reddit.scope: moderator` is a request-token scope, NOT a viewer gate. The custom post is served to anyone who can see the parent Reddit post.
- **FIXED: Polish #135** (commit `fd2e014`). Added `requireModerator()` gate to both endpoints. Demo branches remain unauthenticated (synthetic fixtures, no real data). 4 regression tests added. 830 tests green at the time.

**2. YAML config support missing (FoxxMD-flagged BLOCKER for existing-mod adoption).**
- Upstream CM accepts both JSON5 AND YAML. The Devvit port shipped JSON5-only, blocking 100% of existing CM operators from pasting their AutoMod-style YAML configs without converting first.
- **FIXED: Polish #136** (commit `71be33a`). `parseConfig()` now auto-detects format (sniff first non-whitespace char) with try-cascade fallback. `js-yaml@^4.1.1` promoted from devDeps to deps. `examples/starter-config.yaml` added. 7 new tests cover AutoMod-style YAML, malformed YAML, format sniff, cross-format equivalence, bare-string YAML, array-at-root, namedRules in YAML. 838 tests green.

### TIER 2 (HIGH, doc-fixed this session)

**3. Reddit ban-policy on sub-association history (Magnes-flagged + WebSearch corroborated).**
- Reddit's March 19, 2026 policy disabled sub-association auto-banning in mod bots. Not API-level disabled (the `reddit.banUser` API still works); enforced at app-review or content-policy layer.
- `src/actions/ban.ts` continues to work for non-history rule kinds (regex, author, ruleSet). Magnes' own usage pattern: "flag and remove based on user history" (NOT ban).
- `src/core/runAction.ts:204-256` non-retryable 4xx classifier already surfaces any 403 from `reddit.banUser` as a red dashboard row. No silent failure mode.
- All three Phase 4 example configs (`history-fresh-low-karma`, `attribution-drive-by-self-promo`, `recent-activity-cross-sub`) already use `remove`/`report` (verified via grep). No code change needed.
- **DOC-FIXED: Polish #137** (commit `7ec390f`). New writeup-draft.md §3 subsection: "Reddit policy note: ban-action on sub-association history (March 19, 2026)." Explains scope, what works, what's recommended, and the existing error-surfacing safety net.

**4. MHS cut rationale strengthened (Magnes corroboration).**
- Magnes confirmed: "MHS doesn't work anymore. On their website too, can't make new accounts or regenerate API keys. Seems to bug out." Plus the embedded "Connection refused" screenshot from the MHS endpoint.
- Original cut rationale (Reddit allowlist excludes the domain per `reddit/devvit-docs` PR #96) was already correct. Magnes' corroboration makes the cut TWICE-justified: (a) Reddit allowlist excludes it AND (b) the upstream MHS service itself is broken right now (operators can't even provision new keys).
- **DOC-FIXED: Polish #137** same commit. Updated writeup-draft.md §3 "Gaps vs upstream (explicitly cut)" with Magnes corroboration + the Connection-refused screenshot context.

**5. Connection-refused error origin clarified.**
- Initially unattributed in the Discord transcript. Investigation revealed the embedded image was Magnes screenshotting the MHS service returning "Connection refused" while attempting to verify the cut rationale.
- NOT a cm-devvit error. This validates the MHS-is-dead position. Resolved via Polish #137 documentation.

### TIER 3 (BLOCKER, Stephen-side action required)

**6. Verify cm-devvit@0.2.6 is published PUBLIC (not unlisted).**
- SampleOfNone flagged: "Publish the app as public, otherwise nobody can install it."
- Current state per session memory: cm-devvit@0.2.4 is "approved unlisted" + cm-devvit@0.2.6 was submitted via `devvit publish` 2026-05-19. The `package.json` `launch` script runs `devvit publish` with no `--public` flag. Devvit's default publish visibility is not documented in the repo.
- **Stephen action required**: verify via Devvit CLI (`devvit publish --help` to see flag options + `devvit apps list` to see current state of cm-devvit visibility). If unlisted, re-run `devvit publish --public`. Confirm by attempting an install from a non-author Reddit account.
- Codex-rescue ranked this RANK 2 BLOCKER: "If judges or mods cannot install it, the app effectively does not exist for evaluation."

## TIER 4 (HIGH, Stephen-side smoke test)

**7. Production install smoke test on cm-devvit@0.2.6.**
- Codex-rescue RANK 5 BLOCKER UNTIL ROOT-CAUSED: "Open the dashboard as mod, open as non-mod, hit `/api/recent`, hit `/api/stats`, hit a mutation endpoint, hit `/api/health`."
- The Polish #135 mod-auth fix needs end-to-end verification in production, not just in mocked test environment. A real non-mod Reddit account loading the Observatory custom post should NOT see real event data.
- **Stephen action required**: install cm-devvit@0.2.6 on a test sub, open the Observatory dashboard from a mod account (verify it works), then from a regular subscriber account (verify it returns 403 on /api/recent + /api/stats, and the dashboard either redirects or renders an "access denied" state instead of leaking data).

## TIER 5 (DOC, optional follow-up)

**8. Discord follow-up questions per codex-rescue.**

If Stephen wants to close any remaining ambiguity, codex-rescue recommended asking the Discord directly:

1. **FoxxMD**: "Do you mean existing mods need to paste their YAML configs directly into the wiki and have them execute, or is a one-time import/conversion flow acceptable for hackathon scope?" (Polish #136 implements the direct-paste flow; this question would confirm we've hit the right depth.)
2. **Magnes**: "Have you seen current Devvit apps successfully call user ban APIs, or should this app treat ban as unsupported and document/remove it before submission?" (Polish #137 documents the policy nuance; this question would confirm whether to go further.)
3. **SampleOfNone**: "Was the public/unlisted install issue observed on this app specifically, or are you warning from prior hackathon patterns?" (Polish-action #6 above resolves either way; this question would confirm the warning was generic vs specific.)
4. **SampleOfNone**: "Can you try opening the dashboard post from a non-mod account and confirm whether any telemetry or API-backed data is visible?" (This is the production smoke test Polish-action #7 covers, but having a community confirmer would seal it.)
5. **Screenshot poster**: confirmed via investigation to be the MHS service, not cm-devvit. No follow-up needed.

## Atomic commits shipped this session

| Commit | Polish | Files | Tests |
|---|---|---|---|
| `fd2e014` | #135: `/api/recent` + `/api/stats` mod-auth gates | `src/routes/api.ts`, `tests/routes/api-auth.test.ts`, `CHANGELOG.md` | 830 green (+2 net) |
| `71be33a` | #136: runtime YAML config support | `src/core/config.ts`, `tests/core/config.test.ts`, `examples/starter-config.yaml`, `examples/README.md`, `package.json`, `package-lock.json`, `CHANGELOG.md` | 838 green (+8 net) |
| `7ec390f` | #137: Reddit ban-policy + MHS-corroboration docs | `docs/submission/writeup-draft.md`, `CHANGELOG.md` | no source change, 838 green |
| `5bc2f8e` | #138: this response plan doc | `docs/submission/foxxmd-discord-feedback-response.md` | no source change, 838 green |
| (Polish #139) | #139: production smoke evidence | `docs/screenshots/polish-135-{non-mod-403,mod-200}.png` + this section | no source change, 838 green |

## Production smoke evidence (Polish #139)

Polish #135 verified in real Devvit runtime on `r/cm_devvit_test` after `cm-devvit@0.2.7` was installed via `npx devvit install r/cm_devvit_test cm-devvit@latest` on 2026-05-20.

**Non-mod identity** (approved-user-but-not-mod throwaway loading the Observatory custom post): see [`docs/screenshots/polish-135-non-mod-403.png`](../screenshots/polish-135-non-mod-403.png). Network panel filtered to `api` shows every polled endpoint returning **403** (`/api/recent`, `/api/stats`, `/api/mod-activity`, repeated across the polling cycle). Dashboard renders empty-state placeholders: `ACTIONS TODAY: 0`, `ACTIVE RULES: 0`, "No rule firings yet", "mod activity feed unav…". No real mod-action data leaked.

**Mod identity** (u/CowSufficient3840 loading the same post): see [`docs/screenshots/polish-135-mod-200.png`](../screenshots/polish-135-mod-200.png). Same endpoints all return **200** with real payloads. Dashboard renders real stats (`ACTIVE RULES: 1`, `TOP RULE: r…`), real rule-stats table (`repost-watch / url-…`), real recent-actions feed (`url-dedupe-30d 1`), and the polling cycle is healthy.

Closes the codex-rescue RANK 5 BLOCKER "Connection refused root-cause" item and the gemini-agent CRITICAL+HIGH `/api/recent` + `/api/stats` audit findings. SampleOfNone Discord directive ("test that the mod dashboard is really mod only") satisfied with production evidence.

## Memory writes

- `~/.claude/projects/-Users-stephensookra-Reddiit-Hacks/memory/hackathon-multi-track-strategy.md` (Stephen's tangent ask 2026-05-20)
- `~/.claude/CLAUDE.md` "Hackathon strategy" section (global mirror)
- `~/Documents/Obsidian Vault/Decisions/Decision - Hackathon Multi-Track Strategy.md`
- `~/Documents/Obsidian Vault/References/Imports-Distilled/Sookra Methodology - Multi-Track Submission Strategy.md`

## Source verification

- WebSearch 2026-05-20: piunikaweb 2026-03-06 article confirms Reddit's March 19 2026 policy on hive-protect / SaferBot auto-ban removal.
- WebSearch 2026-05-20: Devpost forum + help center confirm multi-track submission policy (one prize cap).
- gemini-agent local audit: full 27-endpoint mod-auth coverage map with file:line citations.
- Explore agent local trace: 3 config-parse callsites + 1 CLI utility + AJV schema location + js-yaml devDep state.
- codex-rescue adversarial: 7-rank punch list with rank-2 blocker on public publish + missing capability matrix gap.

## Next-action checklist

- [x] Polish #135 ship: `/api/recent` + `/api/stats` mod-auth gates (Claude, this session)
- [x] Polish #136 ship: YAML config support (Claude, this session)
- [x] Polish #137 ship: ban-policy + MHS doc updates (Claude, this session)
- [x] Strategic memory: multi-track hackathon strategy (Claude, this session)
- [ ] Verify cm-devvit@0.2.6 is published PUBLIC, not unlisted (Stephen, runs Devvit CLI)
- [ ] Production install smoke test: mod + non-mod dashboard access (Stephen, T-7 to T-1)
- [ ] (Optional) Ask Discord follow-up questions to FoxxMD/Magnes/SampleOfNone (Stephen)
