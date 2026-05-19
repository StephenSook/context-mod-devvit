// AE Polish #66: derive ActionKind from the server-side Action union
// (src/shared/types.ts). Previously this file hand-mirrored the union
// as a string-literal alias — drift was caught only by manual review,
// and Polish #53 had to be filed to back-port `'distinguish'` AFTER it
// had shipped server-side and produced a fallback AlertTriangle icon
// in EventRow. Deriving `Action['kind']` makes the drift class
// structurally impossible: adding a new action variant server-side
// (e.g. an `unfair-mute` upstream pull-forward) automatically expands
// the client union, and forgetting the client KIND_ICON / KIND_COLOR /
// chip entry surfaces as a compile error at the switch sites instead
// of a runtime fallback.
import type { Action } from '../../shared/types';
export type ActionKind = Action['kind'];

export type EventRecord = {
  ts: number;
  activityId: string;
  runName?: string;
  checkName?: string;
  triggered: boolean;
  /**
   * Server propagates status + optional wouldHaveCalled per Codex session
   * HIGH 2026-05-16 so a future dashboard pass can render distinct chips
   * for dry-run / skipped-locked / error / ok. Today the client renders
   * on `ok` boolean only — both shapes co-exist.
   */
  actions: {
    kind: ActionKind;
    ok: boolean;
    status?: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
    wouldHaveCalled?: string;
    error?: string;
  }[];
  /**
   * Optional drill-down context (S2 Wave). Populated by handleActivity when
   * a rule fires — names the run + check + rule + (for regex) matched substring.
   * Frontend EventRow renders these in the expanded panel when present.
   */
  matchedRule?: string;
  runPath?: string;
  matchedSubstring?: string;
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
