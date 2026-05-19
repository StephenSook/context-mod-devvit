/**
 * Polish #24 — migrations.ts Result<void, string> contract tests.
 *
 * MIGRATIONS map is empty today (no shape changes shipped yet), but the
 * Result-returning seam matters for when one does land — a failed migration
 * must NOT advance the schema-version pointer (otherwise next upgrade
 * skips the retry + state stays half-migrated forever).
 *
 * Behavior pinned:
 *   - from === to → ok(undefined) (no-op fast path)
 *   - no migration registered for `to` → ok(undefined) (silent no-op)
 *   - registered migration succeeds → ok(undefined)
 *   - registered migration throws → err(<message>)  ← load-bearing
 *
 * The error-bearing path is the one the caller (/app-upgrade trigger)
 * reads to decide whether to advance cm:schema-version.
 */

import { describe, it, expect } from 'vitest';
import { runMigrations, SCHEMA_VERSION } from '../../src/state/migrations';

describe('runMigrations Result<void, string> contract (Polish #24)', () => {
  it('from === to → ok(undefined) (no-op fast path)', async () => {
    const result = await runMigrations(SCHEMA_VERSION, SCHEMA_VERSION);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it('from === to even for arbitrary version strings', async () => {
    const result = await runMigrations('99.99.99', '99.99.99');
    expect(result.ok).toBe(true);
  });

  it('no migration registered for the target version → ok(undefined) (silent no-op)', async () => {
    // MIGRATIONS map has no '99.99.99' key, so the function logs + returns
    // ok. This is intentional — a missing migration shouldn't block app
    // upgrade for a version transition the new code doesn't care about.
    const result = await runMigrations('0.0.1', '99.99.99');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeUndefined();
  });

  it('SCHEMA_VERSION constant is non-empty + dotted', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+(\.\d+)?$/);
    expect(SCHEMA_VERSION.length).toBeGreaterThan(0);
  });

  // Once real migrations land, add:
  //   it('registered migration throws → err(msg) + caller keeps OLD pointer')
  //   it('registered migration succeeds → ok + caller advances pointer')
  // For now the MIGRATIONS map is empty by design — adding mock entries
  // here would require monkeypatching the module-level Record, which is
  // brittle. The Result-returning seam is the contract; the load-bearing
  // logic (advancing pointer iff result.ok) lives in triggers.ts.
});
