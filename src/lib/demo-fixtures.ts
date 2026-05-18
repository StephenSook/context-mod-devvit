/**
 * Demo fixtures shared between client + server.
 *
 * Opt-in only via ?demo=1 query parameter — production never seeds
 * fabricated mod-action counts (per Codex review M6). The server-side
 * gate lives in src/routes/api.ts; the client-side fallback gate
 * lives in src/client/App.tsx (kicks in when API is unreachable).
 *
 * EventRecord + StatsRollup shapes are duplicated locally to avoid
 * a server→client/lib/types cross-import that would pull React types
 * into the server bundle.
 */

export interface DemoAction {
  kind:
    | 'remove'
    | 'approve'
    | 'lock'
    | 'comment'
    | 'report'
    | 'ban'
    | 'userFlair';
  ok: boolean;
}

export interface DemoEvent {
  ts: number;
  activityId: string;
  runName: string;
  checkName: string;
  triggered: boolean;
  actions: DemoAction[];
}

export interface DemoStats {
  actionsToday: number;
  timeSavedMin: number;
  activeRules: number;
  topRule: string;
  hourlyActions24h: number[];
}

export function demoEvents(now: number = Date.now()): DemoEvent[] {
  // Guard against caller passing NaN/Infinity — would propagate to Date and
  // render "Invalid Date" silently. Fall back to Date.now() with a log.
  if (!Number.isFinite(now)) {
    console.error(
      '[cm/demo-fixtures] demoEvents called with non-finite now:',
      now
    );
    now = Date.now();
  }
  return [
    {
      ts: now - 1000 * 60 * 2,
      activityId: 't3_demo_a',
      runName: 'main',
      checkName: 'spam-filter',
      triggered: true,
      actions: [
        { kind: 'remove', ok: true },
        { kind: 'comment', ok: true },
      ],
    },
    {
      ts: now - 1000 * 60 * 7,
      activityId: 't1_demo_b',
      runName: 'main',
      checkName: 'age-gate',
      triggered: true,
      actions: [{ kind: 'remove', ok: true }],
    },
    {
      ts: now - 1000 * 60 * 15,
      activityId: 't3_demo_c',
      runName: 'main',
      checkName: 'mod-approve',
      triggered: true,
      actions: [{ kind: 'approve', ok: true }],
    },
    {
      ts: now - 1000 * 60 * 23,
      activityId: 't1_demo_d',
      runName: 'main',
      checkName: 'warn-rule',
      triggered: true,
      actions: [
        { kind: 'comment', ok: true },
        { kind: 'lock', ok: true },
      ],
    },
    {
      ts: now - 1000 * 60 * 41,
      activityId: 't3_demo_e',
      runName: 'main',
      checkName: 'spam-filter',
      triggered: true,
      actions: [{ kind: 'remove', ok: false }],
    },
  ];
}

// Freeze the constant + its array property so consumer mutations can't leak
// across requests in the same isolate.
export const DEMO_STATS: Readonly<DemoStats> = Object.freeze({
  actionsToday: 47,
  timeSavedMin: 188,
  activeRules: 12,
  topRule: 'spam-filter',
  hourlyActions24h: Object.freeze([
    1, 0, 0, 2, 0, 1, 3, 5, 7, 9, 12, 10, 8, 6, 4, 3, 5, 7, 11, 9, 6, 4, 2, 1,
  ]) as number[],
});
