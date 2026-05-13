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

## 1. Reply to FoxxMD — collab access + "let's keep technical on GitHub"

**Context:** FoxxMD added Stephen + Vinh as repo collaborators on May 12 and said he'd prefer technical discussion to live on GitHub issues/discussions for indexability. Also offered to set up a GitHub Project kanban board. Stephen owes a thank-you + acknowledgement + answer on the board.

**Send:** Discord same thread (drafted May 13, 2026 — send within 24h of drafting to keep "thanks for the X today" framing accurate).

```
thanks for the collab access — confirmed on both ends. fully agree on keeping technical discussion in github issues/discussions for indexability, i'll move anything substantive over there.

the kanban project board would actually help — got an internal phase 1-6 plan i can mirror over so you can see what's in scope vs explicitly cut. lmk if you want me to seed the initial cards or you'd rather start blank.

vinh has access too, so once we kick off phase 1 he picks up backend tasks directly from the board.
```

**AI-tone scan:** clear.

---

## 1b. Reply to FoxxMD — kanban board seeded

**Context:** After Stephen's reply offering to seed the board, FoxxMD shared the Projects v2 link (https://github.com/users/FoxxMD/projects/6, "ContextMod Devvit") on May 13, 2026 at 2:50 PM. Stephen confirmed scopes via `gh auth refresh -s project,read:project` and 42 cards were bulk-added via the GraphQL API — full Phase 1-6 mirror of the master plan, tagged `[P1]` through `[P6]` for phase grouping. Stephen owes a heads-up that the seeding is done.

**Send:** Discord same thread (within 24h of seeding — May 13, 2026).

```
seeded 42 cards across phases 1-6 on the board — all tagged [P1]–[P6] so you can group by phase. vinh's tagged on phase 1+2+4 (backend), i'm on phase 3+5+6 (dashboard wire / demo / submission). a few cards have blocked dependencies noted in the body — phase 3 dashboard wire-up depends on phase 1 + 2 shipping, phase 4 image-hash depends on a day-0 spike, mhs rule depends on api.moderatehatespeech.com fetch approval (which is high-risk per reddit's personal-domain policy, decision tree documented).

statuses are all set to default; you or i can flip them in the UI as work moves. happy to add custom fields (Status / Owner / Phase) for more granular tracking if useful.

source-of-truth for the cards is at docs/superpowers/foxxmd-kanban-seed.md in the repo, so if anything drifts we know which doc to update. fyi i temporarily added `project` scope to my gh CLI token for the GraphQL bulk-add — once the board is stable i'll drop it back via `gh auth refresh --remove-scopes project` so i'm not carrying broader write permissions than needed.
```

> Card count current as of seeding (May 13, 2026, 42 items). Verify with `gh project item-list 6 --owner FoxxMD --format json --limit 100` before sending if delayed.

**AI-tone scan:** clear.

---

## 2. Reply to SampleOfNone — "wiki pages for existing CM subs?"

**Context:** SampleOfNone asked on May 12: *"For subs that already run CM, you plan on using their existing wiki pages?"* — a real technical question about the port's compatibility with existing CM operator workflows. Stephen owes a direct answer + this is the natural place to weave in the helper-nomination ask later (separate followup once the Devpost form is filled out).

**Send:** Discord same thread (drafted May 13, 2026 — send within 24h of drafting to keep "thanks for the X today" framing accurate).

```
yeah same wiki path as upstream — r/<sub>/wiki/contextmod. MVP rule kinds (regex / author / ruleSet) + 7 actions use the same JSON5 schema, so existing CM operators can copy their config across with minimal cleanup. Phase 4 rules (history / attribution / recentActivity / repost / mhs) land later and might need a syntax tweak depending on which upstream edge cases we keep — i'm holding the upstream AJV schema as source of truth except where Devvit's runtime can't support a primitive.

install flow: App Directory one-click → seed wiki contents → reload-config from the mod menu. no token migration, no central server.
```

**AI-tone scan:** clear.

**Followup (separate ping closer to submission day, ~May 24, 2026 if she hasn't asked anything else):** ask permission to nominate her as "most helpful user" on Devpost + cite r/piercing's 600K visitors / 12K contributors as a named "communities served" example in the writeup. Keep that ask separate from this technical reply.

---

## 3. FoxxMD — optional quote ask (only if room left)

**Context:** Nice-to-have, not blocking. Bot username + WAU eligibility are confirmed; submission can ship without a personal quote. But a one-sentence FoxxMD endorsement in the Project Impact section helps Pillar 1.

**Send:** May 20, 2026 only IF Stephen has already moved technical discussion to GitHub issues for at least a week (so it doesn't read as a marketing ask). Otherwise skip.

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
- phase 4 stretch: image-hash repost detection (perceptual hash in pure JS, blocked on a 30s-limit spike) + MHS toxicity rule (blocked on api.moderatehatespeech.com fetch approval — might get rejected per personal-domain policy, fine if so)

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

**Send:** May 27, 2026 (after the actual submission lands).

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

## Stephen's editorial pass (before sending any of these)

For each message:
1. Read the full draft aloud. If any line makes you wince, rewrite it.
2. Replace at least one phrase per message with your own wording — it should not sound like the same writer wrote all five.
3. Re-run `./scripts/check-ai-tone.sh` against the literal text you're about to paste (the scanner now covers this file too).
4. Don't include the AI-tone scan footers in the actual send.
