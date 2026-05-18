/**
 * Per-sub muted-rule SET.
 *
 * Stores rule keys ({runName}/{checkName}) that the mod has muted from the
 * dashboard. Current behavior is soft-mute: dashboard filters events but
 * backend rules still fire. TODO: runCheck consults this for hard-mute —
 * not wired yet.
 *
 * Storage: Redis hash at `cm:muted-rules:{sub}` (Devvit lacks native SET).
 * Field key = rule key, value = ISO timestamp mute was applied (audit trail).
 */

import { redis } from '@devvit/web/server';

function key(sub: string): string {
  return `cm:muted-rules:${sub}`;
}

export function ruleKey(runName: string, checkName: string): string {
  return `${runName}/${checkName}`;
}

export type MuteResult = { ok: true } | { ok: false; error: string };

export async function muteRule(
  sub: string,
  runName: string,
  checkName: string
): Promise<MuteResult> {
  if (!sub || !runName || !checkName)
    return { ok: false, error: 'sub + runName + checkName required' };
  try {
    await redis.hSet(key(sub), {
      [ruleKey(runName, checkName)]: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[cm/muteSet] muteRule failed:', err);
    return { ok: false, error: msg };
  }
}

export async function unmuteRule(
  sub: string,
  runName: string,
  checkName: string
): Promise<MuteResult> {
  if (!sub || !runName || !checkName)
    return { ok: false, error: 'sub + runName + checkName required' };
  try {
    await redis.hDel(key(sub), [ruleKey(runName, checkName)]);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[cm/muteSet] unmuteRule failed:', err);
    return { ok: false, error: msg };
  }
}

export async function listMutedRules(
  sub: string | undefined
): Promise<string[]> {
  if (!sub) return [];
  try {
    const all = await redis.hGetAll(key(sub));
    return Object.keys(all ?? {});
  } catch (err) {
    console.warn('[cm/muteSet] listMutedRules failed:', err);
    return [];
  }
}

export async function isRuleMuted(
  sub: string,
  runName: string,
  checkName: string
): Promise<boolean> {
  if (!sub || !runName || !checkName) return false;
  try {
    const value = await redis.hGet(key(sub), ruleKey(runName, checkName));
    return value != null;
  } catch (err) {
    // X48: surface the failure instead of silent-false. Soft fail-open is
    // intentional (a Redis blip on the mute check shouldn't kill the rule),
    // but the log line gives ops visibility.
    console.warn('[cm/muteSet] isRuleMuted failed (fail-open):', {
      sub,
      runName,
      checkName,
      err,
    });
    return false;
  }
}
