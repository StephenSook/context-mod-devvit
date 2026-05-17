# E2E Screenshot Capture Checklist (Stephen-actionable)

> Mod-menu interactions require an authenticated Reddit moderator session,
> which Playwright MCP can't reach without Stephen's cookies. This file is
> the precise OBS / Reddit-mobile-app capture plan keyed to
> `docs/submission/e2e-scenarios.md` scenarios A–H. Stephen runs each
> sequence on `r/contextmod_vinh_dev` (live Vinh dev sub, Phase 1+2+3
> shipped), captures the moment, exports as PNG, drops in this dir.

**Equipment:** OBS Studio (or Mac built-in `Cmd-Shift-4` for stills) +
optional Reddit mobile app for menu-cleanliness shots. Target resolution:
1440×900 or 1280×800 for desktop, 390×844 for mobile.

**Pre-flight:**
- App installed on `r/contextmod_vinh_dev` (Vinh's dev sub)
- Stephen logged in as a mod of that sub (use `u/CowSufficient3840` or
  whichever mod account has access)
- Wiki page `r/contextmod_vinh_dev/wiki/botconfig/contextmod` populated
  with the hackathon-demo config (a config matching every scenario below)
- Last "Reload config from wiki" toast was successful (visible rule count
  > 0 in the toast text)

---

## Scenario A — Regex spam removal + Mustache comment

**Capture target:** `docs/screenshots/scenario-a-spam-removed.png`

**Steps:**
1. Open `https://www.reddit.com/r/contextmod_vinh_dev/submit` (logged in as a NON-mod test account so the spam-removal isn't bypassed by Scenario C filter)
2. Submit a self-post titled `free crypto giveaway 🚀` (or just `free crypto giveaway`)
3. Wait ~5 sec for trigger → handleActivity → remove + comment
4. Refresh the post permalink. Expected: `[removed]` placeholder + bot comment with rendered Mustache template
5. Capture: post permalink page with BOTH the [removed] state AND the bot's comment visible in one frame (scroll to fit if needed)
6. Crop to remove personal info (your username, sidebar) before saving

**Verification beats:** post is `[removed]`, bot comment text contains your test-account name with any `u/` ping defanged (per Codex H4), no real Reddit notification fired from the defanged ping.

---

## Scenario B — URL-dedupe repost (dry-run)

**Capture target:** `docs/screenshots/scenario-b-dryrun-repost.png`

**Steps:**
1. Submit a link post with URL `https://example.com/test-repost-a` (any URL not previously seen)
2. Wait ~5 sec. Expected: post survives (first-time seen → triggered=false)
3. Submit a SECOND link post with the SAME URL `https://example.com/test-repost-a`
4. Wait ~5 sec. Expected: second post survives BUT Observatory dashboard shows a NEW event row tagged `repost-watch / url-dedupe → remove (dry-run)`
5. Open Observatory dashboard (Scenario H setup needed first), capture the dashboard frame showing the dry-run event row

**Verification beats:** event row indicates the rule TRIGGERED with `remove` action chip in a visually distinct color (per Codex session-HIGH-2 fix, dashboard now carries `status: 'dry-run'` per action). Second post NOT actually removed.

---

## Scenario C — Mod whitelist bypass

**Capture target:** `docs/screenshots/scenario-c-mod-bypass.png`

**Steps:**
1. Switch to your MOD account on `r/contextmod_vinh_dev`
2. Submit a self-post titled `free crypto giveaway 🚀` (same trigger as A)
3. Wait ~10 sec. Expected: post stays LIVE (mod is exempt via `authorIs: { isMod: false }` filter)
4. Open Observatory dashboard. Expected: NO new event row for this post
5. Capture two-frame side-by-side: (a) the surviving mod post, (b) the dashboard with no new row

**Verification beats:** mod post still up + no event in dashboard = filter pre-check short-circuited before rule eval.

---

## Scenario D — Approved-contributor bypass

**Capture target:** `docs/screenshots/scenario-d-approved-bypass.png`

**Steps:**
1. Add a TEST account (not your mod account) as an approved contributor on `r/contextmod_vinh_dev`
2. From that test account, submit a self-post titled `free crypto giveaway 🚀`
3. Expected: post survives (same short-circuit, this time on `authorIs: { isContributor: false }`)
4. Capture same way as Scenario C

---

## Scenario E — Comment moderation + lock parent

**Capture target:** `docs/screenshots/scenario-e-comment-locked.png`

**Steps:**
1. Submit a normal post (e.g. `hello world`) that does NOT trigger any spam rule
2. From a NON-mod test account, leave a comment on that post containing the banned phrase from your demo config (use whatever non-slur trigger you've configured, e.g. `forbidden-test-phrase`)
3. Wait ~5 sec. Expected: comment removed + comment locked
4. Refresh post permalink. Capture comment thread showing `[removed]` placeholder + lock icon on the comment

**Verification beats:** comment is removed AND locked (two actions chained). Observatory event row shows `comment-mod / banned-phrase → remove, lock`.

---

## Scenario F — Dry-run rule tester (Stephen's Step 3.6)

**Capture target:** `docs/screenshots/scenario-f-dryrun-toast.png`

**Steps:**
1. Find any existing post on `r/contextmod_vinh_dev` (a Scenario A removed post works perfectly)
2. Right-click the post → mod overflow menu → `ContextMod: Test rules on this item`
3. Form appears with `thingId` pre-filled (greyed out, disabled). Click `Run dry-run`
4. Toast appears showing eval results. Expected format:
   ```
   Dry-run (rev 3):
   • spam-removal / crypto-giveaway → remove, comment
   ```
5. Capture the post page with the form open AND the resulting toast visible (may need two captures: form-state + toast-state)
6. Verify the post is UNCHANGED before/after (no real removal, no real comment) — this is the screenshot proof that dry-run is read-only

**Verification beats:** toast contains rule + check + action names, post unchanged, NO new event row in Observatory (`dryRunActivity` skips ZSET write by design).

---

## Scenario G — Reload config from wiki

**Capture target:** `docs/screenshots/scenario-g-reload-toast.png`

**Steps:**
1. Edit `r/contextmod_vinh_dev/wiki/botconfig/contextmod` — add one trivial new rule (e.g. an extra regex pattern)
2. Save the wiki edit
3. From the sub's mod menu: `ContextMod: Reload config from wiki`
4. Toast appears showing: `Loaded N rules (rev M).` where N is the new rule count
5. Capture the sub page with the toast still visible

**Verification beats:** toast message shows correct N (matches the new wiki rule count) and incrementing M (rev counter from Codex H2 atomic INCR).

---

## Scenario H — Observatory dashboard (live data)

**Capture target:** `docs/screenshots/scenario-h-dashboard-live.png` (re-capture
of `docs/screenshots/dashboard-desktop.png` against LIVE data, no `?demo=1`)

**Steps:**
1. Run Scenarios A + B + C + E first so the `events:recent50` ZSET has 3+ real entries
2. From the sub's mod menu: `ContextMod: View recent actions`
3. The dashboard custom post is created or navigated to
4. Wait for the dashboard to fully render (stat cards + sparkline + event list)
5. Capture the FULL dashboard frame at 1440×900 desktop resolution

**Verification beats:** dashboard renders WITH live event rows (not `?demo=1` synthetic), stat cards show actual numbers (`Actions today` > 0 reflecting Scenarios A/B/C/E activity), sparkline shows hourly distribution including the recent activity.

---

## Capture deliverables checklist

- [ ] `scenario-a-spam-removed.png`
- [ ] `scenario-b-dryrun-repost.png`
- [ ] `scenario-c-mod-bypass.png`
- [ ] `scenario-d-approved-bypass.png`
- [ ] `scenario-e-comment-locked.png`
- [ ] `scenario-f-dryrun-toast.png`
- [ ] `scenario-g-reload-toast.png`
- [ ] `scenario-h-dashboard-live.png`

After capture: `git add docs/screenshots/scenario-*.png && git commit -m "docs(screenshots): e2e scenarios A–H captured live on r/contextmod_vinh_dev"`.

---

## Why Playwright MCP couldn't auto-capture these

The Playwright MCP can navigate `reddit.com` but reaches only logged-out
public views. All 8 scenarios above require an authenticated Reddit
moderator session on `r/contextmod_vinh_dev` to:
- See and click the mod overflow menu (`ContextMod: ...` entries are mod-only)
- Submit posts (Reddit requires auth even for posting)
- Read/edit the sub's wiki at `botconfig/contextmod`
- See the Observatory custom post embedded in the sub (custom posts are
  mod-installed apps, not public until pinned)

Stephen runs through the checklist manually with OBS/Cmd-Shift-4 and the
two test accounts (one mod, one non-mod, one approved-contributor). 8
captures total. Estimated time: 30–45 minutes including config wiki edit
+ submit + screenshot per scenario.

_Drafted 2026-05-16 by Claude Code._
