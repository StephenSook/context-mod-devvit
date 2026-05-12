import type { EventRecord, StatsRollup } from './types';

export async function fetchRecent(): Promise<EventRecord[]> {
  try {
    const res = await fetch('/api/recent');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch {
    return [];
  }
}

export async function fetchStats(): Promise<StatsRollup | null> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.counters;
    // Treat empty/partial response as "no stats yet" so demo fallback kicks in
    if (!c || typeof c !== 'object' || !Array.isArray(c.hourlyActions24h)) return null;
    return c as StatsRollup;
  } catch {
    return null;
  }
}

// Demo fixture for empty-state preview (used when API returns nothing — Phase 0-1)
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
