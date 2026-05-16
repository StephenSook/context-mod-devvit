/**
 * Default config seeded on fresh install (Step 3.1).
 *
 * Minimal — one regex rule + one remove action — so a new install does
 * something useful before the mod creates a wiki config page. Mods replace
 * this by editing `r/<sub>/wiki/botconfig/contextmod` (Step 3.2).
 *
 * Stored as a JSON5 string (not a JS literal) so the install path exercises
 * the same `parseConfig` → AJV pipeline a wiki edit hits — if the schema
 * tightens and this default drifts, tests catch it.
 */

export const DEFAULT_CONFIG_JSON5 = `{
  // Default config seeded on install. Edit r/<sub>/wiki/botconfig/contextmod
  // to replace, then click "ContextMod: Reload config from wiki" in the mod
  // menu (or wait up to 5 min for the cron to pick it up).
  dryRun: false,
  runs: [
    {
      name: 'starter',
      checks: [
        {
          name: 'crypto-giveaway-spam',
          combinator: 'OR',
          rules: [
            { kind: 'regex', name: 'scam-words', pattern: 'scam|giveaway|free crypto', flags: 'i' },
          ],
          actions: [
            { kind: 'remove', isSpam: true },
          ],
        },
      ],
    },
  ],
}`;
