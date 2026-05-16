/**
 * The seeded default config must parse cleanly against the live AJV schema —
 * otherwise fresh installs silently start with no published config and the
 * pipeline is a no-op until a mod hand-writes the wiki page.
 */

import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../src/core/config';
import { DEFAULT_CONFIG_JSON5 } from '../../src/config/default-config';

describe('DEFAULT_CONFIG_JSON5', () => {
  it('parses and AJV-validates against the live schema', () => {
    const result = parseConfig(DEFAULT_CONFIG_JSON5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.runs.length).toBeGreaterThan(0);
    expect(result.config.runs[0]?.checks.length).toBeGreaterThan(0);
  });
});
