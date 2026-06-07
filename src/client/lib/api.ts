import type { ApiResult, EventRecord, StatsRollup, ConfigRaw, SaveResult, SimResult } from './types';

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
  return new URLSearchParams(window.location.search).get('demo') === '1' ? '?demo=1' : '';
}

/**
 * Polish #21: extract the server-supplied `error` field from a non-200
 * response body, falling back to `HTTP <status>` when the body isn't
 * JSON or doesn't carry an error field. Without this, mods see the
 * generic "HTTP 503" banner instead of the more useful
 * "subreddit context unavailable: <detail>" the server already returns.
 */
// AE Polish #58: exported so ConfigDiffViewer + ModActivityFeed (which
// had their OWN ad-hoc `HTTP ${res.status}` error paths) can reuse the
// same body-extraction logic. Centralizes the "surface server error
// detail" behavior introduced in Polish #21.
export async function extractServerError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && body.error.trim().length > 0) {
      return `HTTP ${res.status}: ${body.error}`;
    }
  } catch {
    /* body was not JSON — fall through */
  }
  return `HTTP ${res.status}`;
}

export async function fetchRecentSafe(): Promise<ApiResult<EventRecord[]>> {
  try {
    const res = await fetch(`/api/recent${demoSuffix()}`);
    // forbidden: a 403 means "not a moderator", not an outage — the dashboard
    // renders a "moderators only" notice instead of the retry banner.
    if (!res.ok)
      return { ok: false, error: await extractServerError(res), forbidden: res.status === 403 };
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
    if (!res.ok)
      return { ok: false, error: await extractServerError(res), forbidden: res.status === 403 };
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

// ---------------------------------------------------------------------------
// Config editor API helpers (Task 9)
// Follow the same ApiResult<T> + extractServerError + demoSuffix pattern.
// ---------------------------------------------------------------------------

export async function fetchConfigRawSafe(): Promise<ApiResult<ConfigRaw>> {
  try {
    const res = await fetch(`/api/config/raw${demoSuffix()}`);
    if (!res.ok) return { ok: false, error: await extractServerError(res) };
    const data = (await res.json()) as ConfigRaw;
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function validateConfigSafe(text: string): Promise<{ ok: boolean; errors?: unknown }> {
  try {
    const res = await fetch('/api/config/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    return (await res.json()) as { ok: boolean; errors?: unknown };
  } catch (err) {
    return { ok: false, errors: err instanceof Error ? err.message : String(err) };
  }
}

export async function simulateLiveSafe(text: string): Promise<ApiResult<SimResult>> {
  try {
    const res = await fetch('/api/config/simulate-live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    if (!res.ok) return { ok: false, error: await extractServerError(res) };
    const data = (await res.json()) as { ok: boolean; error?: string } & SimResult;
    if (!data.ok) return { ok: false, error: data.error ?? 'simulation failed' };
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function explainConfigSafe(text: string): Promise<ApiResult<string>> {
  try {
    const res = await fetch('/api/config/explain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    const data = (await res.json()) as { ok: boolean; explanation?: string; error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, empty: false, data: data.explanation ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveConfigSafe(text: string, baseRevisionId: string | null): Promise<ApiResult<SaveResult>> {
  try {
    const res = await fetch('/api/config/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseRevisionId }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string } & SaveResult;
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
