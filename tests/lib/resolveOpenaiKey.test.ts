import { describe, it, expect, vi, beforeEach } from 'vitest';

const getOpenaiKey = vi.fn();
const settingsGet = vi.fn();
vi.mock('../../src/state/apiKeyStore', () => ({ getOpenaiKey: (s: string) => getOpenaiKey(s) }));
vi.mock('@devvit/web/server', () => ({ settings: { get: (k: string) => settingsGet(k) } }));

import { resolveOpenaiKey } from '../../src/lib/resolveOpenaiKey';

describe('resolveOpenaiKey', () => {
  beforeEach(() => { getOpenaiKey.mockReset(); settingsGet.mockReset(); });

  it('prefers the Redis key', async () => {
    getOpenaiKey.mockResolvedValue('sk-redis');
    expect(await resolveOpenaiKey('sub')).toBe('sk-redis');
    expect(settingsGet).not.toHaveBeenCalled();
  });

  it('falls back to settings, trimmed', async () => {
    getOpenaiKey.mockResolvedValue(null);
    settingsGet.mockResolvedValue('  sk-settings  ');
    expect(await resolveOpenaiKey('sub')).toBe('sk-settings');
  });

  it('returns empty string when neither source has a key', async () => {
    getOpenaiKey.mockResolvedValue(null);
    settingsGet.mockResolvedValue(undefined);
    expect(await resolveOpenaiKey('sub')).toBe('');
  });
});
