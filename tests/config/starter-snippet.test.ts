/**
 * Polish #28 — the inline STARTER_CONFIG_SNIPPET shown in the EmptyState
 * empty-dashboard view MUST parse + AJV-validate against the live schema.
 *
 * Mods who hit the empty dashboard see this snippet + are encouraged to
 * paste it as their first wiki config. A snippet that doesn't validate
 * sends them to "Config parse failed" on first save — a wildly bad first
 * impression. Before Polish #28 the snippet had drifted to use legacy
 * field names (schema_version, condition, testOn, patterns, threshold,
 * reason, body) that no longer match the shipped AJV schema, so any mod
 * who copy-pasted it would have failed every publish attempt.
 */

import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../src/core/config';
import { STARTER_CONFIG_SNIPPET } from '../../src/client/lib/starter-snippet';

describe('STARTER_CONFIG_SNIPPET (EmptyState shown to first-install mods)', () => {
  it('Polish #28: parses + AJV-validates against the live schema', () => {
    const result = parseConfig(STARTER_CONFIG_SNIPPET);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      // Help diagnose drift if the schema tightens.
      throw new Error(`STARTER_CONFIG_SNIPPET no longer validates: ${result.error}`);
    }
    expect(result.config.runs.length).toBeGreaterThan(0);
  });

  it('Polish #28: ships behind dryRun:true (safety on copy-paste)', () => {
    const result = parseConfig(STARTER_CONFIG_SNIPPET);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.dryRun).toBe(true);
  });

  it('Polish #28: uses correct field names (combinator NOT condition, pattern NOT patterns, etc.)', () => {
    // Defensive: catches a regression to legacy field names that AJV would
    // reject. Asserts the shape of the parsed config matches the live schema's
    // expectations. Without this, a future "let's use schema_version again"
    // PR could land + the snippet would silently invalidate.
    expect(STARTER_CONFIG_SNIPPET).not.toMatch(/schema_version/);
    expect(STARTER_CONFIG_SNIPPET).not.toMatch(/condition:\s*'/); // Use combinator
    expect(STARTER_CONFIG_SNIPPET).not.toMatch(/testOn:/); // Use target
    expect(STARTER_CONFIG_SNIPPET).not.toMatch(/patterns:/); // Use pattern
    expect(STARTER_CONFIG_SNIPPET).not.toMatch(/threshold:/); // Removed in flat schema
    expect(STARTER_CONFIG_SNIPPET).toMatch(/combinator:/);
    expect(STARTER_CONFIG_SNIPPET).toMatch(/pattern:/);
    expect(STARTER_CONFIG_SNIPPET).toMatch(/template:/); // NOT body:
    expect(STARTER_CONFIG_SNIPPET).toMatch(/isSpam:/); // NOT reason: on remove
  });
});
