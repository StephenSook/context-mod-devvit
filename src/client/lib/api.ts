import type { ApiResult, EventRecord, StatsRollup } from './types';

/**
 * fetchRecentSafe / fetchStatsSafe — return a discriminated ApiResult so the
 * dashboard can distinguish (success+data) vs (success+empty) vs (real error).
 *
 * Replaces the prior `return []` / `return null` swallow pattern that made an
 * API outage indistinguishable from "no events yet" (Codex review HIGH F5).
 */

export async function fetchRecentSafe(): Promise<ApiResult<EventRecord[]>> {
  try {
    const res = await fetch('/api/recent');
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const events = Array.isArray(data?.events) ? (data.events as EventRecord[]) : [];
    if (events.length === 0) return { ok: true, empty: true };
    return { ok: true, empty: false, data: events };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

export async function fetchStatsSafe(): Promise<ApiResult<StatsRollup>> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const c = data?.counters;
    if (!c || typeof c !== 'object' || !Array.isArray(c.hourlyActions24h)) {
      return { ok: true, empty: true };
    }
    return { ok: true, empty: false, data: c as StatsRollup };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Genuine zero-state stats. Used when the API is reachable + empty (no demo flag).
 * Replaces the fabricated DEMO_STATS as the default empty-state shape so production
 * never shows invented mod-action counts (per Codex review M6).
 */
export const ZERO_STATS: StatsRollup = {
  actionsToday: 0,
  timeSavedMin: 0,
  activeRules: 0,
  topRule: '—',
  hourlyActions24h: new Array(24).fill(0),
};

/**
 * Demo fixtures. Opt-in only via ?demo=1 in URL — never auto-shown in production.
 * Helps capture screenshots + verify dashboard chrome before Phase 2 backend lands.
 */
export const DEMO_EVENTS: EventRecord[] = [
  { ts: Date.now() - 1000 * 60 * 2, activityId: 't3_demo_a', runName: 'main', checkName: 'spam-filter', triggered: true, actions: [{ kind: 'remove', ok: true }, { kind: 'comment', ok: true }] },
  { ts: Date.now() - 1000 * 60 * 7, activityId: 't1_demo_b', runName: 'main', checkName: 'age-gate', triggered: true, actions: [{ kind: 'remove', ok: true }] },
  { ts: Date.now() - 1000 * 60 * 15, activityId: 't3_demo_c', runName: 'main', checkName: 'mod-approve', triggered: true, actions: [{ kind: 'approve', ok: true }] },
  { ts: Date.now() - 1000 * 60 * 23, activityId: 't1_demo_d', runName: 'main', checkName: 'warn-rule', triggered: true, actions: [{ kind: 'comment', ok: true }, { kind: 'lock', ok: true }] },
  { ts: Date.now() - 1000 * 60 * 41, activityId: 't3_demo_e', runName: 'main', checkName: 'spam-filter', triggered: true, actions: [{ kind: 'remove', ok: false }] },
];

export const DEMO_STATS: StatsRollup = {
  actionsToday: 47,
  timeSavedMin: 188,
  activeRules: 12,
  topRule: 'spam-filter',
  hourlyActions24h: [1, 0, 0, 2, 0, 1, 3, 5, 7, 9, 12, 10, 8, 6, 4, 3, 5, 7, 11, 9, 6, 4, 2, 1],
};
