/**
 * Map a requireModerator() failure to user-facing toast text for Devvit
 * menu + form handlers.
 *
 * Extracted from forms.ts (2026-06-07) so the mod-menu handlers in menu.ts
 * can reuse the EXACT same wording when their defense-in-depth
 * requireModerator() gate fails. Single source of truth — two copies of this
 * string WOULD diverge on the next reword (same anti-drift rationale as the
 * openaiErrors.ts + requireModerator.ts extractions).
 *
 * Reddit App Review (2026-06-07) flagged that every mod-only action must
 * verify moderator status server-side, not lean on `forUserType: moderator`
 * alone. The menu handlers now gate with requireModerator() and surface this
 * toast on failure.
 *
 * Why 503/500 get distinct copy (AE Polish #10): a transient mod-check RPC
 * blip (retryable) is split from a genuine "you're not a mod" (terminal) so
 * an actual mod whose auth check 5xx'd is told to retry, not told they lack
 * permission.
 */
export function authFailToast(
  status: 401 | 403 | 500 | 503,
  actionLabel: string,
): string {
  if (status === 503) {
    return `Mod check temporarily unavailable. Retry in ~30s, then ${actionLabel}.`;
  }
  if (status === 500) {
    return `Mod check failed. See logs, then ${actionLabel}.`;
  }
  return `Mod-only action. Only this sub's moderators can ${actionLabel}.`;
}
