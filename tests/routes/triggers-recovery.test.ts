/**
 * AE Polish #14 — pins the AE LOW #10 fix in src/routes/triggers.ts.
 *
 * The /post-submit + /comment-submit catch blocks exist specifically to
 * prevent a Redis blip from 500-ing the trigger handler (which would
 * trigger Devvit's at-least-once retry storm). But the recovery path
 * inside the catch called `recordEvent` — which ALSO writes Redis.
 * If the same blip persisted, the recovery 500'd too.
 *
 * Wave AD LOW #10 wrapped each recordEvent in its own try → log.error
 * → return 'config-read-fail' so a still-flaky Redis can't make the
 * recovery worse than the original failure.
 *
 * These tests pin the recovery contract: when configStore.getCurrentRev
 * throws AND the recovery recordEvent ALSO throws, the handler still
 * returns 200 + {status: 'config-read-fail'} (never propagates → never
 * 500s → never enters Devvit's retry storm).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentRev = vi.fn();
const recordEventMock = vi.fn();
const handleActivity = vi.fn();
const firstSeen = vi.fn();
const normalizePost = vi.fn();
const normalizeComment = vi.fn();
const getCurrentSubreddit = vi.fn();
const getAppUser = vi.fn();
const parseConfigMock = vi.fn();
const publishMock = vi.fn();
const redisGet = vi.fn();
const redisSet = vi.fn();
const runMigrationsMock = vi.fn();

vi.mock('@devvit/web/server', () => ({
  redis: { get: (...a: unknown[]) => redisGet(...a), set: (...a: unknown[]) => redisSet(...a) },
  reddit: {
    getCurrentSubreddit: () => getCurrentSubreddit(),
    getAppUser: () => getAppUser(),
  },
}));
vi.mock('../../src/state/configStore', () => ({
  getCurrentRev: (...a: unknown[]) => getCurrentRev(...a),
  publish: (...a: unknown[]) => publishMock(...a),
  PublishError: class PublishError extends Error {},
}));
vi.mock('../../src/state/recentEvents', () => ({
  recordEvent: (...a: unknown[]) => recordEventMock(...a),
}));
vi.mock('../../src/lib/idem', () => ({
  firstSeen: (...a: unknown[]) => firstSeen(...a),
}));
vi.mock('../../src/shared/normalize', () => ({
  normalizePost: (...a: unknown[]) => normalizePost(...a),
  normalizeComment: (...a: unknown[]) => normalizeComment(...a),
}));
vi.mock('../../src/core/handleActivity', () => ({
  handleActivity: (...a: unknown[]) => handleActivity(...a),
}));
vi.mock('../../src/core/config', () => ({
  parseConfig: (...a: unknown[]) => parseConfigMock(...a),
}));
vi.mock('../../src/state/migrations', () => ({
  SCHEMA_VERSION: '0.1',
  runMigrations: (...a: unknown[]) => runMigrationsMock(...a),
}));

import { triggers } from '../../src/routes/triggers';

async function postJson(path: string, body: unknown): Promise<Response> {
  return triggers.request(
    new Request(`http://x${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  firstSeen.mockResolvedValue(true);
  getCurrentSubreddit.mockResolvedValue({ name: 'r_test' });
  getAppUser.mockResolvedValue(undefined);
});

describe('triggers — recordEvent recovery (AE Polish #14, pins AD LOW #10)', () => {
  it('/post-submit: getCurrentRev throws + recordEvent ALSO throws → returns 200 config-read-fail (never 500s)', async () => {
    getCurrentRev.mockRejectedValue(new Error('redis blip during read'));
    recordEventMock.mockRejectedValue(new Error('redis blip during recovery — still flaky'));

    const res = await postJson('/post-submit', {
      post: { id: 't3_abc', title: 'x' },
      author: { name: 'alice' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('config-read-fail');
    // Handler MUST NOT propagate the recordEvent throw.
    // handleActivity never runs because we hit the config-read-fail branch.
    expect(handleActivity).not.toHaveBeenCalled();
  });

  it('/post-submit: getCurrentRev throws + recordEvent SUCCEEDS → same 200 config-read-fail (recovery happy path)', async () => {
    getCurrentRev.mockRejectedValue(new Error('redis blip'));
    recordEventMock.mockResolvedValue(undefined);

    const res = await postJson('/post-submit', {
      post: { id: 't3_abc', title: 'x' },
      author: { name: 'alice' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('config-read-fail');
    // recordEvent WAS called this time (recovery wasn't tripped) — the
    // event row exists in the ZSET, dashboard surfaces the error.
    expect(recordEventMock).toHaveBeenCalledTimes(1);
  });

  it('/comment-submit: same recovery shape — getCurrentRev throws + recordEvent throws → 200 config-read-fail', async () => {
    getCurrentRev.mockRejectedValue(new Error('redis down'));
    recordEventMock.mockRejectedValue(new Error('still down'));

    const res = await postJson('/comment-submit', {
      comment: { id: 't1_xyz', body: 'hi' },
      author: { name: 'bob' },
      post: { id: 't3_parent' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('config-read-fail');
    expect(handleActivity).not.toHaveBeenCalled();
  });
});
