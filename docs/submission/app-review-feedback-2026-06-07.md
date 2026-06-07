# Reddit App Review feedback response: mod permissions (2026-06-07)

Structured response to the Reddit App Review rejection of cm-devvit 0.3.0, received 2026-06-07 in the r/Devvit App Review chat thread. 0.3.0 was the first version the reviewer could actually test: 0.2.7 auto-rejected on subreddit privacy before any functional review (the sub has been public since 2026-05-24). This wave closes the mod-permission gap, then re-submits via `npm run launch`.

## Rejection (verbatim)

From r/Devvit (App Review), 2026-06-07 1:00 PM, to u/CowSufficient3840:

> Thank you for submitting cm-devvit (cm-devvit). Please ensure the following is resolved before an approval can be made.
>
> 1: Privacy and Data Rules: Be transparent – be up front about your data practices, ensure all consents and permissions are complete, accurate, and clearly labeled, and notify Reddit and your users if your app is compromised (e.g., data breach, unauthorized access).
>
> Your mod tool doesn't handle mod permissions correctly. Remember:
>
> - Any mod-only menu items should use "forUserType": "moderator"
> - Any mod-only forms or webview posts should only display mod data to mods with proper permissions to see that data
> - Any mod-only actions should check for proper mod perms before allowing the action to be submitted.
>
> Any exceptions must have a valid use case for your tool and be properly documented in your README so subreddits using the app know what to expect.

## Audit findings (tiered)

### TIER 1 (BLOCKER, fixed this wave)

**Mod menu action handlers did not verify mod status server-side.** All six `/internal/menu/*` handlers relied only on the menu item's `forUserType: "moderator"`. Those handler endpoints are HTTP-reachable by any authenticated viewer of the Observatory custom post (the same class of reachability the `/api/*` and `/internal/form/*` handlers already defend against, per Polish #135 and Wave W). `reload-config` (publishes config to internal state) and `recent-actions` (creates a custom post) were the live exposures; the four form-display handlers were lower risk but are gated too for a uniform posture. This is the literal subject of the reviewer's bullet 3.

Fix: `requireModerator()` on all six handlers (`src/routes/menu.ts`), shared `authFailToast` (`src/lib/authFailToast.ts`), regression test `tests/routes/menu-auth.test.ts`.

### TIER 2 (HIGH, fixed this wave)

**The non-mod webview state was a misleading error banner, not an explicit gate.** The `/api/*` data endpoints were already mod-gated (Polish #135 and Wave W), so a non-mod never received mod data. But the dashboard rendered an empty shell plus a red "Telemetry API unreachable" banner, which reads as a bug rather than an intentional permission boundary. Reviewer bullet 2 is about webview posts displaying mod data only to mods; an explicit gate removes the ambiguity.

Fix: client "Moderators only" notice on `403` (`src/client/App.tsx`, `lib/api.ts`, `lib/types.ts`), tests in `tests/client/`.

### TIER 3 (DOC, fixed this wave)

**The permission model was not documented for installing subreddits.** Reviewer bullet 4 requires that any exceptions have a valid use case documented in the README. The gate is binary "is a moderator" (not granular per Reddit mod-permission), and the in-app editor lets any moderator edit config via the app's moderator scope. Both are intentional and now documented.

Fix: README "Moderator permissions and data access" section + corrected FAQ.

## Bullet-by-bullet status

1. Mod-only menu items use `forUserType: "moderator"`: already true in `devvit.json` for all six items (no code change; now documented).
2. Forms/webview display mod data only to mods: server-gated already; the client gate now makes it explicit.
3. Mod-only actions check perms before submit: now gated server-side on all menu, form, and api handlers.
4. Exceptions documented in README: new permission-model section.

## On granular permissions

The reviewer wrote "proper mod perms." ContextMod gates on subreddit moderator membership (binary), not on granular Reddit moderator permissions (`wiki` / `config` / `flair` / etc). This is intentional and documented as the "exception" the reviewer's bullet 4 anticipates: ContextMod's wiki config is the bot's control surface, managed by the moderator team as a whole, the same way AutoModerator's config is. Restricting config editing to specific mods is left to Reddit's native moderator-permission system plus the team's own process. The binary model also matches the prior production smoke test (Polish #135) that proved `requireModerator` returns 403 to non-mods and 200 to mods in the live webview.

## Verification

- `npm run type-check`, `npm run lint`: clean.
- `npm run test`: 923/923 pass (adds menu-auth, authFailToast, and client 403-gate coverage).
- Adversarial review: the Codex CLI was unavailable (account model restriction), so a second-model audit was run via gemini-agent. It enumerated every route and confirmed every mod-data or mod-action endpoint calls `requireModerator()` and fails closed; the only ungated endpoints are the unauthenticated liveness probe (`/api/health`, no data), platform-fired triggers, and platform-fired crons.

## Remaining (Stephen-side)

- Confirm r/cm_devvit_test is still public and the Observatory example post is visible, so the reviewer can test (the sub-privacy gotcha that auto-rejected 0.2.7).
- After CI is green on main, re-submit via `npm run launch` (ships the next patch, 0.3.1, for review).
- Optional reply in the App Review chat once re-submitted (Stephen sends; the CLI cannot drive Reddit chat).
- Live smoke (nice-to-have): hit a `/api/*` route and a `/internal/menu/*` route from a non-mod test account to empirically confirm the 403 / mod-only toast in the menu execution context (the source is correct by inspection and the form-submit context was already live-verified).
