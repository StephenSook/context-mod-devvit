# Vinh ping — Codex contract-touching findings (2026-05-16)

> Draft message for Discord (#devvit-dev or DM). Per PLAN Coordination Rule 10
> (Contract changes require announcement). Send AFTER reading Codex's full
> report at `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`.

---

**Draft message (Stephen-voice, ~50% pre-cut per outreach-paraphrase pattern):**

> Codex did an adversarial pass on phase 1+2 (full report in repo at `docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`). 2 critical + 7 high + 5 med + 3 low.
>
> I already shipped the 4 non-contract fixes — direct push, atomic commits per fix, your code only got 2-line semantic tweaks on each:
> - `fix(dry-run)` 274aef6 — global config.dryRun authoritative (was bypassable per-action)
> - `fix(repost)` 8f6d608 — SET NX atomic (was GET-then-SET race)
> - `fix(idem) commitAction` dafe050 — done-write retry + never release pending on failure (was double-action risk)
> - `fix(idem) lease token` fc3851a — owner-token compare-and-delete (was third-execution race on slow worker)
>
> 152 tests still green after all 4. Type-check clean.
>
> The 5 contract-touching findings I held back for you to weigh in on — these all want a `⚠️ CONTRACT:` PR per the protocol:
>
> 1. **`src/state/configStore.ts:31`** — `publish()` read-modify-write race. Two concurrent publishers can both win rev N+1. Fix: wrap in `acquireLock('config-publish', sub)` or use Redis atomic incr for revision counter.
> 2. **`src/routes/triggers.ts:76` + `src/core/handleActivity.ts:32`** — config-rev read-once invariant is violated. Trigger reads, then handleActivity reads AGAIN. Publish in between → normalize on rev A, execute on rev B. Fix: pass ConfigSnapshot into handleActivity, drop its internal read.
> 3. **`src/core/template.ts:20` + `src/actions/comment.ts:17`** — Mustache context exposes both raw + safe fields; `{{item.title}}` re-enables injection. Fix: `Mustache.escape = escapeMarkdown` for normal `{{...}}`, or only expose safe fields + require triple-stash for raw.
> 4. **`src/rules/regex.ts:11` + `src/core/filters.ts:51`** — user regexes run with raw `RegExp.test`. Catastrophic backtracking → blocks Devvit worker. Filter regexes additionally throw at runtime (inconsistent w/ rule regex which returns non-match). Fix: validate regex at parse time + reject known unsafe patterns OR safe-regex package.
> 5. **`src/core/config.ts:40` + `src/core/namedRules.ts:38`** — AJV passes but `expandNamedRules` throws on unknown ref → breaks ParseResult contract → 500 instead of structured validation error. Fix: wrap expandNamedRules + return `{ok:false}` w/ config error.
>
> Plus 5 MED + 3 LOW — also contract-touching mostly (event-status collapse, normalize createdAt unit detection, K.* segment encoding, schema minItems). I'll open GH issues tagged `post-hackathon` for those unless you think any are urgent.
>
> Pick the contract changes you want to tackle yourself vs let me draft. No urgency on any single one (we're T-11 days + the hotfixes covered the actual safety stuff). Mostly want your eyes before touching the shared types or schema.

---

## Send checklist

- [ ] Push hotfix commits live first (already done — 4 commits in main)
- [ ] Read Codex full report to double-check the 5 listed findings + confirm severity
- [ ] Copy-paste draft above to Discord, paraphrase ~50% in own voice
- [ ] Add link to report (`docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`)
- [ ] Tag Vinh
- [ ] Wait for response before drafting any PR with `⚠️ CONTRACT:` prefix

---

_Drafted by Claude Code 2026-05-16. Send via Discord DM or #devvit-dev channel._
