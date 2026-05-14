# Solo Artifacts Plan — 2026-05-14

> **STATUS: COMPLETE** — executed before 2026-05-14; preserved for audit trail. See `git log --oneline` for the commit sequence implementing this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the 3 solo-doable items from the next-steps brief (#5/#6/#7 partials) — pre-baked `captions.srt` + ffmpeg stitch script, MEMORY.md continuity entries, and Vinh-ping draft variants. No Vinh-lane interference.

**Architecture:** Three independent artifacts, each one atomic commit. No cross-file dependencies.

**Tech Stack:** SRT subtitle format / ffmpeg / bash / markdown memory files.

---

## Tool inventory audit (per `memory/tool-inventory-audit-per-task.md`)

| Tool | Used? | Why / Why not |
|------|-------|---------------|
| `writing-plans` skill | ✅ | This plan |
| `session-memory` skill | ✅ | MEMORY.md entries |
| `check-ai-tone.sh --strict` | ✅ | Gate per commit |
| `green-dot` atomic policy | ✅ | One commit per artifact |
| `codex:codex-rescue` | ⛔ | No code/docs requiring adversarial review (Vinh ping draft is single-line, MEMORY is project-internal, captions/stitch is pattern-from-runbook) |
| `Playwright` MCP | ⛔ | Nothing renders to verify |
| `Firecrawl` / `context7` MCP | ⛔ | No external sources |
| `feature-dev:code-reviewer` | ⛔ | Bash + SRT + markdown, no logic |
| `three-brain` Gemini route | ⛔ | No multimodal / long-context |
| `last30days` | ⛔ | No fresh intel needed |
| `banana` | ⛔ | No new images |

---

## Phase 1 — Vinh ping draft variants

**Files:**
- Modify: `docs/submission/stephen-action-list.md` — expand T-6 (today) section with 3 ping-tone variants

**Why three:** Stephen picks the tone (Discord-casual / PLAN.md-formal / super-short). Reduces his decision overhead.

- [ ] **Step 1.1:** Add T-6 Action 1 block to stephen-action-list with three ping draft options + selection guidance.

- [ ] **Step 1.2:** Strict AI-tone scan must stay 0 hits.

- [ ] **Step 1.3:** Atomic commit.

---

## Phase 2 — MEMORY.md continuity entries

**Files:**
- Create: `memory/outreach-paraphrase-pattern.md`
- Create: `memory/mhs-rule-cut-locked.md`
- Modify: `memory/MEMORY.md` (add 2 index pointers)

**Why these two:**
- `outreach-paraphrase-pattern` — Stephen consistently cuts ~50% from outreach drafts (verified across §1, §1b, §2 sent 5/13). Future drafts should pre-cut to that target to reduce paraphrase friction. **feedback type.**
- `mhs-rule-cut-locked` — MHS cut per PR #96 on 2026-05-13. Locked decision. Prevents future-session drift back to "let's add MHS." **project type.**

- [ ] **Step 2.1:** Write `memory/outreach-paraphrase-pattern.md` with feedback frontmatter + Why/How-to-apply structure.

- [ ] **Step 2.2:** Write `memory/mhs-rule-cut-locked.md` with project frontmatter + Why/How-to-apply structure.

- [ ] **Step 2.3:** Update `memory/MEMORY.md` with 2 new index pointers.

- [ ] **Step 2.4:** Atomic commit (memory files are outside repo — no git, but document in session memory protocol).

---

## Phase 3 — captions.srt + ffmpeg stitch script

**Files:**
- Create: `scripts/demo/captions-live-data.srt` — 8 beat VO captions (live-data path, no truth caption)
- Create: `scripts/demo/captions-synthetic-fallback.srt` — 8 beat VO captions + truth caption at 36-50s
- Create: `scripts/demo/stitch.sh` — executable ffmpeg pipeline: concat raw clips → bake captions → output mp4
- Modify: `docs/submission/demo-video-runbook.md` — replace inline ffmpeg snippets with reference to scripts/demo/

**Why:** The runbook documents the ffmpeg commands as instructional text. Stephen's 5/18 recording day is stressful enough without copy-pasting bash from markdown. Make them executable.

**Risk:** Stephen's actual VO will paraphrase the script (per the outreach-paraphrase-pattern observation). Pre-baked SRT is a starting point, not final. Mark each line with a `<!-- script -->` comment so Stephen knows to swap in actual VO transcription post-record.

Wait — SRT doesn't support comments. Use a sibling `.notes.md` file.

- [ ] **Step 3.1:** Write `captions-live-data.srt` w/ 8 VO captions from demo-video-script.md beats.

- [ ] **Step 3.2:** Write `captions-synthetic-fallback.srt` — same 8 beats + truth caption entry at 36-50s.

- [ ] **Step 3.3:** Write `captions.notes.md` — instructions for Stephen on swapping pre-baked captions with actual VO transcription.

- [ ] **Step 3.4:** Write `stitch.sh` — bash script, executable, ffmpeg-as-data not as code-comments. Inputs: per-beat raw `.mkv` + VO `.wav`; output: final `.mp4` with baked captions. Two modes (`--live` / `--synthetic`).

- [ ] **Step 3.5:** Atomic commit — scripts + 1-line demo-runbook update pointing at the scripts dir.

- [ ] **Step 3.6:** Strict AI-tone scan + verify `chmod +x` on stitch.sh.

---

## Phase 4 — Push + summary

- [ ] **Step 4.1:** `git log` to confirm atomic commits stacked correctly.

- [ ] **Step 4.2:** `git push origin main`.

- [ ] **Step 4.3:** Final summary to Stephen: 3 artifacts shipped, what each saves on T-2 / T-1 / today, next milestone.

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SRT format incompatibility with ffmpeg subtitles filter | Low | libass handles standard SRT; truth caption + VO caption overlap at 36-50s rendered stacked |
| `stitch.sh` ffmpeg flags wrong for macOS ffmpeg | Low | Test commands match the inline runbook snippets that have been on Stephen's machine since Day 3 |
| MEMORY entries grow stale fast | Med | mhs-cut-locked is timestamped 2026-05-13; if PR #96 ever reverses, the memory becomes wrong but obviously dated |
| Vinh ping variant tone is off | Low | Three variants give Stephen pick power; he paraphrases anyway per outreach-paraphrase-pattern |
| Pre-baked SRT VO drifts from actual VO | High by design | `.notes.md` explicitly tells Stephen to swap pre-bake for actual transcription post-record |

---

## Verification gates

- After Phase 1: T-6 section in stephen-action-list has 3 ping variants + selection note; strict scan 0 hits.
- After Phase 2: 2 new memory files exist + MEMORY.md index has 5 pointers (was 3).
- After Phase 3: `scripts/demo/{captions-live-data.srt, captions-synthetic-fallback.srt, captions.notes.md, stitch.sh}` exist; stitch.sh has +x bit; runbook references the dir.
- After Phase 4: `git log origin/main..HEAD` empty.

---

## Execution order

1. Phase 1 (Vinh ping) → commit
2. Phase 2 (MEMORY) → memory files saved (no repo commit)
3. Phase 3 (captions + stitch) → commit
4. Phase 4 (push + summary)

All sequential. No parallelism — keeps mental model clean and commit history readable.
