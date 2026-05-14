import type { ApiResult, EventRecord, StatsRollup } from './types';

/**
 * fetchRecentSafe / fetchStatsSafe — return a discriminated ApiResult so the
 * dashboard can distinguish (success+data) vs (success+empty) vs (real error).
 *
 * Replaces the prior `return []` / `return null` swallow pattern that made an
 * API outage indistinguishable from "no events yet" (Codex review HIGH F5).
 *
 * ?demo=1 in window.location propagates to the fetch URL so the server returns
 * seeded fixtures from src/lib/demo-fixtures.ts. Read inside each call so
 * runtime URL changes (history.pushState) take effect on the next poll.
 */

function demoSuffix(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('demo') === '1'
    ? '?demo=1'
    : '';
}

export async function fetchRecentSafe(): Promise<ApiResult<EventRecord[]>> {
  try {
    const res = await fetch(`/api/recent${demoSuffix()}`);
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
    const res = await fetch(`/api/stats${demoSuffix()}`);
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
 * Demo fixtures live in src/lib/demo-fixtures.ts now (single source of truth
 * shared with src/routes/api.ts server-side branch). Re-export here so existing
 * client imports (App.tsx) keep working without a deeper import path change.
 */
import { demoEvents, DEMO_STATS as SHARED_DEMO_STATS } from '../../lib/demo-fixtures';
export const DEMO_EVENTS: EventRecord[] = demoEvents() as EventRecord[];
export const DEMO_STATS: StatsRollup = SHARED_DEMO_STATS as StatsRollup;
