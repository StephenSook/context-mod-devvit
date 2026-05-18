/**
 * App-upgrade schema migrations (Step 3.6).
 *
 * On every upgrade the trigger compares `cm:schema-version` to `SCHEMA_VERSION`
 * here; if they differ, `runMigrations(stored, target)` is called to walk the
 * version chain. v0.1 → v0.1 is a no-op today — the seam exists so a future
 * shape change (e.g. RecentEvent v1 → v2, or cfg key renames) can land without
 * silently corrupting every install's persisted state.
 *
 * Migrations are best-effort: each step logs and continues on error. The
 * alternative (throw + leave the version stamp at the old value) means a
 * single bad migration permanently wedges the install on the next upgrade
 * since the trigger fires once. Best-effort is the right call for v0.1 —
 * revisit when there is a real migration to run.
 */

export const SCHEMA_VERSION = '0.1';

type MigrationFn = () => Promise<void>;

const MIGRATIONS: Record<string, MigrationFn> = {
  // Future entries land here, keyed by the target version they produce.
  // e.g. '0.2': async () => { /* rewrite RecentEvent shape, etc. */ },
};

export async function runMigrations(from: string, to: string): Promise<void> {
  if (from === to) return;
  const target = MIGRATIONS[to];
  if (!target) {
    console.log(`[cm/migrations] no migration registered for ${from} → ${to} (no-op)`);
    return;
  }
  try {
    await target();
    console.log(`[cm/migrations] migrated ${from} → ${to}`);
  } catch (err) {
    console.error(`[cm/migrations] ${from} → ${to} failed:`, err);
  }
}
