/**
 * App-upgrade schema migrations (Step 3.6).
 *
 * On every upgrade the trigger compares `cm:schema-version` to `SCHEMA_VERSION`
 * here; if they differ, `runMigrations(stored, target)` is called to walk the
 * version chain. v0.1 → v0.1 is a no-op today — the seam exists so a future
 * shape change (e.g. RecentEvent v1 → v2, or cfg key renames) can land without
 * silently corrupting every install's persisted state.
 *
 * AE Polish #12 (Agent B #10): returns Result<void, string> so the caller
 * (`/app-upgrade` trigger) can decide whether to advance the schema-version
 * pointer. Previously a failed migration logged + advanced the pointer
 * anyway → state partially migrated + recorded as fully migrated → next
 * upgrade skips the retry. With Result the caller can keep the OLD pointer
 * on failure, retry on next upgrade. MIGRATIONS map is empty today so
 * this is a no-op seam; matters when real migrations land post-MVP.
 */

import { type Result, ok, err } from '../lib/result';

export const SCHEMA_VERSION = '0.1';

type MigrationFn = () => Promise<void>;

const MIGRATIONS: Record<string, MigrationFn> = {
  // Future entries land here, keyed by the target version they produce.
  // e.g. '0.2': async () => { /* rewrite RecentEvent shape, etc. */ },
};

export async function runMigrations(from: string, to: string): Promise<Result<void, string>> {
  if (from === to) return ok(undefined);
  const target = MIGRATIONS[to];
  if (!target) {
    console.log(`[cm/migrations] no migration registered for ${from} → ${to} (no-op)`);
    return ok(undefined);
  }
  try {
    await target();
    console.log(`[cm/migrations] migrated ${from} → ${to}`);
    return ok(undefined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[cm/migrations] ${from} → ${to} failed:`, e);
    return err(msg);
  }
}
