export type ActionKind =
  | 'remove'
  | 'approve'
  | 'lock'
  | 'comment'
  | 'report'
  | 'ban'
  | 'userFlair';

export type EventRecord = {
  ts: number;
  activityId: string;
  runName?: string;
  checkName?: string;
  triggered: boolean;
  actions: { kind: ActionKind; ok: boolean }[];
};

export type StatsRollup = {
  actionsToday: number;
  timeSavedMin: number;
  activeRules: number;
  topRule: string;
  hourlyActions24h: number[]; // 24 ints
};

/**
 * Discriminated union for API responses.
 *
 * Distinguishes three real-world states the dashboard needs to render:
 *   - { ok: true, empty: false, data }: server returned actual data → show it
 *   - { ok: true, empty: true }:        server returned 200 + empty payload → show zero-state (fresh install, no rules firing yet)
 *   - { ok: false, error }:             network failure, 5xx, parse error → show error banner
 *
 * Replaces the prior "return [] on any failure" pattern (Codex review HIGH F5)
 * where a backend outage was indistinguishable from "no events yet."
 */
export type ApiResult<T> =
  | { ok: true; empty: false; data: T }
  | { ok: true; empty: true }
  | { ok: false; error: string };
