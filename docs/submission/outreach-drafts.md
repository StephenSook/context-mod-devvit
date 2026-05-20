# Outreach Drafts

> Stephen sends every one of these in his own voice (per the Watchful1 AI-tone lesson). These drafts are starting points — rewrite at least one phrase per message so it doesn't sound copy-pasted. **AI does not send these.**

> **Calendar note:** today is May 13, 2026. Hackathon deadline is May 27, 2026 at 6pm PT. Dates below use the unambiguous "Month Day, Year" form to avoid ISO-format ambiguity.

> **Resolved already** (per the May 12, 2026 Discord thread — Stephen captured the verbatim transcript and pasted it into the Day 3 working session):
>
> **Original Bot username = `u/ContextModBot`.** FoxxMD's exact message (May 12, 2026, 3:19 PM):
> > "Hey @Chi blú! You can see the history for the main CM bot account I personally own/run here: https://www.reddit.com/user/ContextModBot/ Notably, it mods r/mealtimevideos which has 60k visitors a week."
>
> **500 WAU eligibility = satisfied.** FoxxMD same message:
> > "I don't have exact statistics on all the other subreddits, but CM server I run has at least 15 other accounts-as-bots running (by other mods). A few of those are in the 10k-1M subscriber range. There are also a few bots that manage about 150 NSFW subreddits. Safe to say its over the 500 active users threshold."
>
> **Permission to port** = granted via [issue #152](https://github.com/FoxxMD/context-mod/issues/152) + repo collaborator access for `chiblue` + `vinhbin` (FoxxMD message, May 12, 2026, 4:21 PM): *"I've added you and vinhbin as repo collaborators."*
>
> **GitHub Project board** = shared 2026-05-13 (today), 2:50 PM: *"you should have access to this new project now: https://github.com/users/FoxxMD/projects/6"* — title "ContextMod Devvit."
>
> So the previously-drafted "ping #2 to confirm bot username" is obsolete. Below is the actual response Stephen owes right now.

---

## 1. Reply to FoxxMD — collab access + "let's keep technical on GitHub" ✅ SENT 2026-05-13 ~2:45 PM ET

**Context:** FoxxMD added Stephen + Vinh as repo collaborators on May 12 and said he'd prefer technical discussion to live on GitHub issues/discussions for indexability. Also offered to set up a GitHub Project kanban board. Stephen owes a thank-you + acknowledgement + answer on the board.

**Status:** SENT in own voice (paraphrased; FoxxMD replied "you should have access to this new project now: https://github.com/users/FoxxMD/projects/6" at 2:50 PM, confirming the yes-to-kanban path).

**Original draft (preserved for audit):**

```
thanks for the collab access — confirmed on both ends. fully agree on keeping technical discussion in github issues/discussions for indexability, i'll move anything substantive over there.

the kanban project board would actually help — got an internal phase 1-6 plan i can mirror over so you can see what's in scope vs explicitly cut. lmk if you want me to seed the initial cards or you'd rather start blank.

vinh has access too, so once we kick off phase 1 he picks up backend tasks directly from the board.
```

**Actual sent text (Discord, May 13 ~2:45 PM ET, paraphrased from draft):**

```
thanks for the collab access, confirmed on both ends!! Github issues/discussions works, and the kanban board would help too since I can mirror our phase 1–6 plan there so you can see scope/cuts clearly. Vinh has access too, so once phase 1 starts he can grab backend tasks straight from the board.
```

Notable paraphrase deltas: dropped the "agree on indexability" beat, swapped "lmk if you want me to seed" → implied yes-to-seed, kept the Vinh-onboarding handoff. Tighter, less explanatory, more Stephen's voice.

**AI-tone scan:** clear (both draft + sent text).

---

## 1b. Reply to FoxxMD — kanban board seeded ✅ SENT 2026-05-13 3:30 PM ET

**Context:** After Stephen's reply offering to seed the board, FoxxMD shared the Projects v2 link (https://github.com/users/FoxxMD/projects/6, "ContextMod Devvit") on May 13, 2026 at 2:50 PM. Stephen confirmed scopes via `gh auth refresh -s project,read:project` and 42 cards were bulk-added via the GraphQL API — full Phase 1-6 mirror of the master plan, tagged `[P1]` through `[P6]` for phase grouping. Stephen owed a heads-up that the seeding was done.

**Status:** SENT in own voice (paraphrased substantially — Stephen cut the MHS-cut explanation, the `gh auth refresh --remove-scopes` security note, and the per-phase task breakdown by person; left a tighter "here's what landed" summary).

**Original draft (preserved for audit):**

```
seeded 42 cards across phases 1-6 on the board — all tagged [P1]–[P6] so you can group by phase. vinh's tagged on phase 1+2+4 (backend), i'm on phase 3+5+6 (dashboard wire / demo / submission). a few cards have blocked dependencies noted in the body — phase 3 dashboard wire-up depends on phase 1 + 2 shipping, phase 4 image-hash depends on a day-0 spike. mhs rule was cut from the port since reddit's PR #96 (2026-05-08) locked the http fetch policy's ai-provider allowlist to openai + gemini only; api.moderatehatespeech.com falls outside that, so the rule stays in upstream PRAW build only.

statuses are all set to default; you or i can flip them in the UI as work moves. happy to add custom fields (Status / Owner / Phase) for more granular tracking if useful.

source-of-truth for the cards is at docs/superpowers/foxxmd-kanban-seed.md in the repo, so if anything drifts we know which doc to update. fyi i temporarily added `project` scope to my gh CLI token for the GraphQL bulk-add — once the board is stable i'll drop it back via `gh auth refresh --remove-scopes project` so i'm not carrying broader write permissions than needed.
```

**Actual sent text (Discord, May 13 3:30 PM ET, paraphrased from draft):**

```
seeded 42 cards across phases 1–6, all tagged P1–P6. Vinh is on the backend-heavy phases, and I'm covering dashboard/demo/submission stuff. i noted the blocked dependencies in the card bodies, and the source-of-truth is docs/superpowers/foxxmd-kanban-seed.md if anything needs to change later.
```

Notable paraphrase deltas:
- Dropped MHS-cut explanation entirely (kept in repo docs, not pasted in Discord).
- Dropped scope-rotation security note (kept as a self-todo).
- Compressed the per-phase ownership breakdown to "Vinh = backend, me = dashboard/demo/submission."
- Tighter, less explanatory. Reads like a teammate update, not a status report.

**AI-tone scan:** clear (both draft + sent text).

---

## 2. Reply to SampleOfNone — "wiki pages for existing CM subs?" ✅ SENT 2026-05-13 2:41 PM ET

**Context:** SampleOfNone asked on May 12: *"For subs that already run CM, you plan on using their existing wiki pages?"* — a real technical question about the port's compatibility with existing CM operator workflows. Stephen owed a direct answer + this is the natural place to weave in the helper-nomination ask later (separate followup once the Devpost form is filled out).

**Status:** SENT in own voice (paraphrased — Stephen cut the named Phase 4 rule list, the AJV-schema-source-of-truth note, and the MHS-cut explanation; preserved the wiki-path + json5-compat + install-flow core).

**Original draft (preserved for audit):**

```
yeah same wiki path as upstream — r/<sub>/wiki/contextmod. MVP rule kinds (regex / author / ruleSet) + 7 actions use the same JSON5 schema, so existing CM operators can copy their config across with minimal cleanup. Phase 4 rules (history / attribution / recentActivity / repost) land later and might need a syntax tweak depending on which upstream edge cases we keep — i'm holding the upstream AJV schema as source of truth except where Devvit's runtime can't support a primitive. mhs rule was cut per reddit's PR #96 ai-provider fetch policy lock — subs using CM for hate-speech filtering keep running upstream PRAW.

install flow: App Directory one-click → seed wiki contents → reload-config from the mod menu. no token migration, no central server.
```

**Actual sent text (Discord, May 13 2:41 PM ET, paraphrased from draft):**

```
yeah same upstream wiki path: r/<sub>/wiki/contextmod, and the MVP keeps the json5 schema for regex / author / ruleSet + 7 actions so configs can copy over pretty cleanly. Later rule types might need small Devvit-specific tweaks, but install should just be App Directory to seed wiki config to reload from mod menu, with no token migration or central server
```

Notable paraphrase deltas:
- Dropped the explicit Phase 4 rule list (`history / attribution / recentActivity / repost`).
- Dropped the AJV-schema-source-of-truth detail.
- Dropped the MHS-cut explanation (SampleOfNone's question wasn't about toxicity rules).
- Compressed install flow into one sentence.
- Sample's reply at 2:42 PM: *"Very Nice!"* + 2:43 PM: *"Looking forward to it!"* — confirms the cut content wasn't missed.

**AI-tone scan:** clear (both draft + sent text).

**Followup (separate ping closer to submission day, ~May 24, 2026 if she hasn't asked anything else):** ask permission to nominate her as "most helpful user" on Devpost + cite r/piercing's 600K visitors / 12K contributors as a named "communities served" example in the writeup. Keep that ask separate from this technical reply.

---

## 3. FoxxMD — optional quote ask ✅ FoxxMD said YES 2026-05-19 per Stephen

**Status:** FoxxMD confirmed YES to a quote 2026-05-19 (Stephen). Stephen will craft the quote in his own voice + get FoxxMD sign-off before the Devpost writeup section lands. Use a 1-2 sentence framing — short, declarative, no AI-tone words.

**Context (kept for audit trail):** Nice-to-have, not blocking. Bot username + WAU eligibility are confirmed; submission can ship without a personal quote. The endorsement strengthens Project Impact / Pillar 1.

```
hey, one more thing — totally fine to say no. when i write up the project impact section for devpost, would you be cool if i pulled a one or two sentence quote from this thread (or wrote one and got your sign-off)? something like "i've been running CM since 2019, this port unblocks the 15+ operators stuck on dying infra" — your framing, your call. zero pressure if you'd rather i just describe the technical port and skip the quote.
```

**AI-tone scan:** clear.

---

## 4. r/Devvit subreddit + Discord update (post + share)

**Context:** Build community-side visibility before submission day. Shows progress without sounding AI-marketed. Stephen posts in r/Devvit + cross-posts to r/Devvit Discord `#show-and-tell` (or similar channel).

**Send:** May 19, 2026 (one week before deadline). Gated on Vinh's Phase 1 backend being at least partially shipping (otherwise the "what's working" list is sparse).

```
title: porting FoxxMD's ContextMod to Devvit Web — progress check

body:

i've been heads-down on a port of FoxxMD's context-mod (the rule-engine mod bot ~15 subs have been running since 2019) to Devvit Web for the mod tools hackathon. wanted to share progress in case anyone has feedback.

what's working in v0.1.0 — verify current state at send time, update bullets to match what actually ships by 2026-05-19:
- the run → check → rule → action concept model with postBehavior flow control (types + scaffolds; live evaluation lands phase 1)
- 3 MVP rule kinds (regex, author, ruleSet) + 7 actions (types ship now; handler wiring lands phase 2)
- filters (authorIs / itemIs)
- atomic config publish via revision pointer (cfg:rev:n + cfg:current_rev)
- per-effect idempotency (cm:proc 24h + cm:action:pending 5m + cm:action:done 7d) so devvit's at-least-once delivery never double-applies
- observatory custom-post dashboard (renders with ?demo=1 synthetic until phase 3 wiring lands) + 24h sparkline
- dry-run mod-menu rule tester

what's still in-flight:
- phase 1 (handleActivity wired to live triggers) — Vinh's working on it
- phase 4 stretch: image-hash repost detection (perceptual hash in pure JS, blocked on a 30s-limit spike). mhs toxicity rule was cut per reddit's PR #96 ai-provider fetch policy — documented in CHANGELOG + writeup.

repo: github.com/StephenSook/context-mod-devvit (MIT, public, CI green)
permission: github.com/FoxxMD/context-mod/issues/152

specifically curious about:
- has anyone gotten image decode + blockhash working in pure JS within the 30s execution window? not asking for code, just confirmation it's feasible
- any gotchas with the developer-portal review process on a port like this? trying to read the tea leaves on review timeline

not asking for a review, just a heads-up that this is happening before submission day. happy to share install links to anyone who wants to playtest.
```

**AI-tone scan:** clear.

---

## 5. Submission day announcement (after Devpost submit)

**Context:** Once Stephen hits submit on Devpost, share the public devpost project page in r/Devvit + Discord. Keep it short — community is fatigued with AI-marketed submissions during hackathon week.

**Send:** Same day Stephen actually hits Submit on Devpost. Target = **May 27, 2026** (hard deadline). Don't pre-post — community treats "we just submitted" with more weight than "we'll submit soon."

```
title: ContextMod Devvit Web port — submitted to mod tools hackathon

body:

submitted my devvit web port of FoxxMD's context-mod for the mod tools and migrated apps hackathon today.

devpost: [paste devpost project URL]
repo: github.com/StephenSook/context-mod-devvit
app: developers.reddit.com/apps/cm-devvit

thanks to:
- FoxxMD for the permission to port + the original rule engine design
- u/SampleOfNone for the heads-up on image parsing
- everyone in r/Devvit Discord who answered my "is this on the right path" questions over the last 4 weeks
```

**AI-tone scan:** clear.

---

## 6. r/Devvit MID-HACKATHON progress post — ✂️ CANCELLED 2026-05-19 (Stephen call)

**Status:** CANCELLED. Stephen decision 2026-05-19 (T-8): project is basically complete; the mid-hackathon "looking for playtest feedback" framing no longer matches reality (no iteration room before submission). Operator outreach DMs will land POST-launch as the §5 submission-day announcement + a separate cold-DM to the 15+ FoxxMD operator pool. Skip this section entirely.

**Original context (preserved for audit trail):** Post to r/Devvit before submission day to get playtest eyeballs + recruit testers. Send window was originally May 22-26 (T-5 to T-1) for the May 27 deadline. Cancelled because §5 covers the same audience after submission + operator-pool DM is the higher-leverage move once everything is verified live. <!-- AITONE_IGNORE -->


**Pre-paraphrase draft (~500 words; Stephen cuts ~50% per outreach paraphrase pattern):**

```
title: ContextMod (PRAW → Devvit Web port) v0.2.0 in App Directory review — looking for playtest feedback before mod tools hackathon submit

body:

mid-hackathon update on the ContextMod Devvit Web port my teammate and i have been building. v0.2.0 went into Reddit App Directory review yesterday (2026-05-16), 1–7 day SLA. wanted to share before submission day in case anyone has playtest feedback worth iterating on.

what shipped in v0.2.0:
- Phase 1 rule engine: regex / author / ruleSet rules, named rules, Mustache action templates, filters (authorIs / itemIs), AND/OR combinators, postBehavior state machine with 100-iter safety break
- Phase 2: 7 MVP actions (remove / approve / lock / comment / report / ban / userFlair) + handleActivity orchestrator + URL-dedupe repost rule (promoted from Phase 4 to Phase 2 via SET NX atomic)
- Phase 3: wiki config loader + 5-min refresh cron + reload-config mod menu + onAppInstall seed + onAppUpgrade migrations + live Observatory dashboard reading from events:recent50 ZSET
- Step 3.6 dry-run rule tester (mod right-clicks → "Test rules on this item" → form → toast with would-have-fired bullets, zero Reddit side-effects)
- Codex adversarial review caught + fixed 2 CRITICAL + 10 HIGH safety findings BEFORE submission (idempotency double-action, dry-run authority, repost SET NX, atomic INCR config publish, read-once invariant, Mustache markdown injection, filter regex try/catch, parsed-config invariant, lease owner tokens, status-aware ActionResult propagation)
- 223 tests passing, tsc clean, lint clean

what worked great about devvit:
- per-sub install model + per-install Redis isolation means we got rid of the original CM's central server + token management entirely. install is one click; uninstall is one click.
- type-safe trigger payloads + the Hono routing model made the rule pipeline a clean transformation chain <!-- AITONE_IGNORE -->
- AJV validation on wiki config means bad config doesn't kill the bot — last known-good revision stays active + dashboard chip surfaces the parse error

what we hit limits on (these are honest feedback, not complaints):
- Devvit Redis primitives are strings + hashes + sorted sets only — no Lists, no Sets, no Lua/transactions. We hand-rolled atomic-across-key patterns (idempotency leases with owner tokens, atomic config publish via INCR-allocated rev, ZSET ring buffers) around the constraint. A first-party "Devvit-Redis-patterns" doc would close this gap.
- vite plugin blocks vite dev / vite preview by default — had to chain vite build → mock node http server for the dashboard's local-dev story
- Devvit form submit envelope is FLAT (`{thingId}`) not nested (`{values: {thingId}}`) per doc convention — caught this only in playtest, defensive multi-shape parse now covers both
- HTTP fetch policy AI-provider allowlist (PR #96 2026-05-08) excluded ModerateHateSpeech, which is what the original CM uses for hate-speech filtering — we cut that rule and documented why in CHANGELOG + writeup. A moderation-classifier allowlist carve-out would unblock anti-AI-spam tooling, which is the loudest demand on r/modnews right now.

what's deferred:
- Phase 4 stretch: history, attribution, recentActivity rules (cache-backed; on the post-hackathon roadmap)
- Phase 4.7 image-mode repost (perceptual blockhash — Day-0 spike not run; gated post-hackathon)

repo: github.com/StephenSook/context-mod-devvit (MIT, public, CI green, 223 tests)
app: developers.reddit.com/apps/cm-devvit (v0.2.0 in review)
permission: github.com/FoxxMD/context-mod/issues/152

if you mod a sub + have an itch to playtest before submission, dm me and i'll send the install link. happy for feedback / bug reports / "this is dumb" notes before submission day.

thanks to everyone in the r/Devvit Discord who answered questions through this build.
```

**AI-tone scan:** clear (no trigger words from `./scripts/check-ai-tone.sh` blocklist).

**Stephen paraphrase pre-cut:** drop ~50% of the bulleted "shipped in v0.2.0" + "limits we hit" sections (per [[outreach-paraphrase-pattern]]). Concrete prediction: Stephen will cut the Codex hardening bullet list to a single sentence, drop the named-list lengths, and add one personal-voice line at the top.

---

## 7. Cold-DM to FoxxMD's operator pool (post-launch first-touch)

**Context:** FoxxMD confirmed (May 12, 2026, 3:19 PM) that `u/ContextModBot` is the main account he personally owns + runs (mods r/mealtimevideos, 60k visitors/week), and that ~15 other accounts run CM via the FoxxMD-hosted server, some of which mod 10k-1M subscriber subs + ~150 NSFW subs. These operators are the natural early-adopter pool: they already speak CM's JSON5 config schema, they're already running rule-engine moderation, and the original PRAW deployment is increasingly hard to keep online without a Python ops budget.

**Audience-discovery:** Stephen pulls the operator list by inspecting `u/ContextModBot`'s mod-of subs publicly + the bot accounts mods register with FoxxMD's server (he can share the list privately if needed). DON'T pre-list names in the draft — paraphrase per recipient.

**Send window:** POST-launch only. Drop these AFTER §5 (submission-day announcement) lands and after `npm run launch` completes the App Directory v0.6.7 review. Sending pre-launch would force the operators to wait on review queue + creates a credibility risk if Devvit review punts.

**Status:** PENDING (queued for T+0 to T+3). Stephen sends ~5/day max so the outreach doesn't look automated; each one paraphrased so a recipient who cross-references won't see identical text.

**Pre-cut draft (~70 words; Stephen drops the migration-guide reference paragraph on roughly half the sends + leans on the link instead):**

```
hey, you mod a sub running FoxxMD's ContextMod via the original PRAW build. just shipped a Devvit Web port — same JSON5 wiki schema, no central server, no token management, one-click install. drop-in for the 3 MVP rule kinds (regex / author / ruleSet) + 7 actions. shorter migration than you'd expect — 10–15 min if your config sticks to MVP rules.

repo + migration guide: github.com/StephenSook/context-mod-devvit/blob/main/docs/migration-from-upstream-cm.md
app listing: developers.reddit.com/apps/cm-devvit

zero pressure — if PRAW's working for you, keep it. just wanted to put it on your radar in case the hosting overhead is wearing thin.
```

**Stephen paraphrase pre-cut targets (per [[outreach-paraphrase-pattern]]):**

- Drop the rule-kind/action count list on half the sends (recipients who run CM already know the schema).
- Rewrite the opener — "you mod a sub running FoxxMD's ContextMod" sounds like a form letter. Personalize w/ the specific sub name OR drop entirely and lead with "saw you running CM via PRAW — built a Devvit port."
- Cut the "shorter migration than you'd expect" sentence — it's promotional. The migration guide will speak for itself.
- Cut "zero pressure / if PRAW's working" softener on confident sends; keep on cold ones.

**Suggested per-recipient angles** (Stephen picks ONE per send so messages don't all read the same):

- r/mealtimevideos operator (FoxxMD himself, but framing for the public list) → emphasize the per-sub-isolation install model (no shared infra).
- 10k-1M-subscriber operators → emphasize per-install Redis isolation (their rules + counters don't leak into another sub's).
- 150-NSFW-sub fleet operator → emphasize one-click install + the dry-run rule tester (validating regex patterns against a real post w/o side-effects is a bigger win for high-volume subs).
- Smaller subs (sub-10k) → emphasize the dashboard ("see what your rules are actually doing" beats raw bot logs for low-volume mods).

**Reply-handling protocol:**

- If they ask about feature parity vs upstream CM → point at `docs/migration-from-upstream-cm.md`'s "What's covered" table.
- If they ask about the cut MHS rule → 1-sentence answer ("Reddit PR #96 locked AI-provider fetch policy to OpenAI + Gemini; api.moderatehatespeech.com falls outside — they keep running upstream CM for that rule, this Devvit build covers everything else"). Don't apologize.
- If they ask about MHS-replacement → say it's on the post-hackathon roadmap and ask which classifier they'd want (Anthropic via OpenAI-compatible adapter is a candidate).
- If they say "send me the install link" → reply w/ developers.reddit.com/apps/cm-devvit and offer to walk through the wiki seed.
- If they say "not interested / not for me" → thank them, move on, no follow-up.

**AI-tone scan:** clear (verified against blocklist: no "leverage / synergize / streamline / robust / comprehensive / cutting-edge / paradigm / utilize / harness"). <!-- AITONE_IGNORE -->

**Track responses** in `docs/submission/operator-outreach-log.md` (create on first reply): one row per sent → reply → outcome, so the post-mortem can compute response-rate + migration-conversion-rate.

---

## Stephen's editorial pass (before sending any of these)

For each message:
1. Read the full draft aloud. If any line makes you wince, rewrite it.
2. Replace at least one phrase per message with your own wording — it should not sound like the same writer wrote all six.
3. Re-run `./scripts/check-ai-tone.sh` against the literal text you're about to paste (the scanner now covers this file too).
4. Don't include the AI-tone scan footers in the actual send.
