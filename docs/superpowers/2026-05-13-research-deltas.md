# Research Deltas — Last 30 Days of Devvit + OSS-Polish + Devpost Galleries

> Captured from three parallel research-agent dispatches on 2026-05-13 evening as part of the Tier 1-3 polish wave. Surfaces strategic adjustments to apply to the submission narrative + tactical code/doc changes that emerged from recent platform updates.

## HIGH-priority strategic adjustments

### 1. Competing "rule engine" submission already in the field

u/yuzengbao2026 publicly posted a hackathon plan on 2026-05-04 framing their entry as *"a visual rule engine that lets mods configure IF-THEN automation rules without writing code... Multi-condition triggers (keyword/regex, karma threshold, account age, post frequency, title length)."* Top community replies from u/SampleOfNone and u/DustyAsh69: *"Yes, automoderator"* / *"So, AutoModerator."*

**Risk:** ContextMod could be tarred with the same "this is just AutoModerator" brush. Need to differentiate hard.

**Adjustment:** Re-anchor the writeup-draft + Devpost copy + demo voiceover away from "rules engine" framing toward **moderator's investigation workbench / explainable mod decision audit**. Lean into the PRAW-era differentiators AutoModerator can't do:
- Cross-subreddit history aggregation (Phase 4 `history` rule)
- Author criteria beyond regex (Phase 1 `author` rule with age/karma/flair gates)
- Configurable per-action audit trail in the Observatory dashboard
- Composable named rules + Mustache action templating

### 2. Watchful1 actively shaming AI submissions on 2026-05-10

On u/Swimming-Video-3912's "ModGuard AI" post, Watchful1 wrote: *"This isn't a devvit app? It's a website. And your source code doesn't have any AI calls, you literally have a [very short list of bad words]."* When OP replied with an obvious LLM-generated apology, Watchful1 followed up: *"Thanks for having your AI reply to me."* Post got removed.

**Reinforced policy:** every word in the submission, the README, the Devpost copy, and any r/Devvit replies must be in Stephen's own voice. The `check-ai-tone.sh` blocklist scanner ships. No exceptions before submission.

### 3. Suggested deadline buffer: target submit May 20, hard deadline May 27

Two new constraints from `docs/guides/launch/faq.mdx` and `docs/capabilities/server/http-fetch-policy.md`:

- **Domain approval SLA: up to 4 business days** (PR #98)
- **User Actions require App Review pre-approval** (PR #106)

Hackathon hard deadline is 2026-05-27 at 6pm PT. To avoid same-week-deadline approval risk:
- Target Devpost submission: **May 20, 2026** (7-day buffer)
- If approval lands May 21-25, time to fix anything that bounces
- Hard fallback: May 27, 2026 at 6pm PT

This compresses the demo-recording window. Update [`docs/submission/demo-video-runbook.md`](../submission/demo-video-runbook.md) target window to May 17-19 instead of May 22-26.

### 4. HTTP fetch policy locked to OpenAI + Gemini only

Docs PR #96 (2026-05-08) added to `docs/capabilities/server/http-fetch-policy.md`: *"At this time, the only AI providers we allow are OpenAI and Google Gemini: api.openai.com, generativelanguage.googleapis.com. Requests to use any other AI provider will be denied."*

**Impact:** `api.moderatehatespeech.com` (MHS rule, Phase 4 stretch) is in the personal-domain category AND now further constrained by the AI-providers-only carve-out. Rejection probability is high.

**Adjustment:** treat MHS rule as cut, not deferred. Update `docs/submission/writeup-draft.md` Section 3 "Gaps vs upstream (explicitly cut)" to move `mhs` from "deferred to Phase 4" into the explicit-cut list with this policy as the rationale.

## MEDIUM-priority tactical adjustments

### 5. Comment IDs changing 2026-05-18

Per r/redditdev `1taa483` (u/redtaboo, 2026-05-11): *"New comment IDs... will not be monotonically increasing anymore... up to 13 characters long... This change will start rolling out the week of May 18th."*

**Verified:** ContextMod's code does NOT assume specific comment-ID length or monotonic ordering. Grep on `src/` found 0 hardcoded comment-ID assumptions. The `cm:proc:{thingId}` 24h NX idempotency key uses the full string ID without slicing. Safe.

### 6. Triggers can misfire (duplicate delivery)

Admin u/RedditParadox (2026-05-12) acknowledged a regression where `onPostSubmit` / `onCommentSubmit` fire 0-3 times. Docs PR #104 added a caution: *"Add caution for duplicate trigger delivery."*

**Verified:** ContextMod's per-trigger idempotency (`cm:proc:{thingId}` 24h NX SETNX) already handles this — Codex Day 1 review caught the initial design gap, fixed in `src/lib/idem.ts`. Submission writeup should call this out as a feature in the "challenges I anticipated" section.

### 7. Devvit weekly release cadence + version pin

Four weekly releases since 2026-04-13 (0.12.19 → 0.12.23). Caret-ranges allow auto-bump mid-judging.

**Done:** commit `73b4bab` pins `@devvit/start` + `@devvit/web` + `devvit` to exact `0.12.23`.

## LOW-priority informational

### 8. Hackathon prize structure confirmed

u/Togapr33 (Reddit admin) 2026-04-29 announcement: **$45,000 total**. Tier 1: Best New Mod Tool $10K + Best Ported Bot $10K + Moderator's Choice $10K (moderator-voted, judge-ineligible). Plus 5× $1K runner-ups per category. 6× $500 Helper, 10× $200 Feedback.

**Submission category:** **Best Ported Bot** ($10K target) for ContextMod. r/mealtimevideos 60K WAU clears the 500 WAU bar by 120×.

### 9. Official PRAW→Devvit migration guide published

Docs PR #92 (2026-04-29) shipped `docs/guides/migrate/public-api.md` — 262 lines of verbatim PRAW→Devvit mappings (`comment.mod.remove()` → `reddit.remove(commentId, true)`, `time.sleep` → scheduler tasks, SQLite → Redis, `while True:` → triggers).

**Adjustment:** README.md "Migration guide" section + Devpost writeup should mirror this guide's structure section-for-section to read as canonical. Reference + cite the official guide URL.

### 10. Splash parameter deprecation in June 2026

`docs/guides/launch/faq.mdx` PR #98 confirms: *"The `splash` parameter in `submitCustomPost()` and Blocks-based launch screens will be deprecated in June. Migrate to HTML-based entry points before then."*

**Already done:** Day 1 fix used `entry: 'index.html' + textFallback`. Verify post-Phase-1 that no `splash` parameter usage slipped back in.

## Action items checklist

- [x] Pin Devvit dep versions exact (commit `73b4bab`)
- [x] Verify code is comment-ID-length-safe (verified inline, 0 hits)
- [ ] Re-anchor writeup-draft narrative away from "rules engine" toward "investigation workbench / audit"
- [ ] Move MHS rule to "explicitly cut" in writeup-draft Section 3
- [ ] Update demo-video-runbook target window May 17-19 (was May 22-26)
- [ ] Update user-side TODO target submit May 20 (was May 27)
- [ ] Mirror PRAW→Devvit migration guide structure in README + writeup
- [ ] Add Watchful1 lesson reinforcement reminder to writeup voice rule

## Sources

All three research agents' full reports saved to:
- `tasks/abb3cdab7d775df1b.output` (OSS polish)
- `tasks/a35a2fb4bbef6660a.output` (Devpost galleries)
- `tasks/aca46c61883b1fa24.output` (Devvit last-30-days)

Canonical research URLs:
- [reddit/devvit-docs commits since 2026-04-13](https://github.com/reddit/devvit-docs/commits/main)
- [r/Devvit hackathon announcement](https://reddit.com/r/Devvit/comments/1sz413l/)
- [Reddit Q1 2026 earnings transcript](https://www.benzinga.com/insights/news/26/04/52201185/)
- [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
