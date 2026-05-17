/**
 * Wave S Phase S10 — Per-sub muted-rule SET.
 *
 * Stores rule keys ({runName}/{checkName}) that the mod has muted from the
 * dashboard. v0 ships as a soft-mute (dashboard filters events; backend rules
 * still fire) so Vinh's runCheck doesn't need to change in this wave. Phase 4
 * follow-up will read this set in runCheck for hard-mute behavior.
 *
 * Storage: Redis SET `cm:muted-rules:{sub}` (uses hash since Devvit lacks
 * native SET) — keys are the rule keys, values are the ISO timestamp the mute
 * was applied (for future audit).
 */

import { redis } from '@devvit/web/server';

function key(sub: string): string {
  return `cm:muted-rules:${sub}`;
}

export function ruleKey(runName: string, checkName: string): string {
  return `${runName}/${checkName}`;
}

export async function muteRule(sub: string, runName: string, checkName: string): Promise<void> {
  if (!sub || !runName || !checkName) return;
  try {
    await redis.hSet(key(sub), { [ruleKey(runName, checkName)]: new Date().toISOString() });
  } catch (err) {
    console.warn('[cm/muteSet] muteRule failed:', err);
  }
}

export async function unmuteRule(sub: string, runName: string, checkName: string): Promise<void> {
  if (!sub || !runName || !checkName) return;
  try {
    await redis.hDel(key(sub), [ruleKey(runName, checkName)]);
  } catch (err) {
    console.warn('[cm/muteSet] unmuteRule failed:', err);
  }
}

export async function listMutedRules(sub: string | undefined): Promise<string[]> {
  if (!sub) return [];
  try {
    const all = await redis.hGetAll(key(sub));
    return Object.keys(all ?? {});
  } catch (err) {
    console.warn('[cm/muteSet] listMutedRules failed:', err);
    return [];
  }
}

export async function isRuleMuted(sub: string, runName: string, checkName: string): Promise<boolean> {
  if (!sub || !runName || !checkName) return false;
  try {
    const value = await redis.hGet(key(sub), ruleKey(runName, checkName));
    return value != null;
  } catch {
    return false;
  }
}
