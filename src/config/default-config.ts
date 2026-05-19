/**
 * Default config seeded on fresh install (Step 3.1).
 *
 * Minimal — one regex rule + one remove action — so a new install shows
 * something useful in the Observatory dashboard immediately. Mods replace
 * this by editing `r/<sub>/wiki/botconfig/contextmod` (Step 3.2).
 *
 * Stored as a JSON5 string (not a JS literal) so the install path exercises
 * the same `parseConfig` → AJV pipeline a wiki edit hits — if the schema
 * tightens and this default drifts, tests catch it.
 *
 * AE Polish #28: seed with `dryRun: true` for safety. Previously dryRun
 * was false, meaning a fresh install would *immediately* auto-remove any
 * post matching `scam|giveaway|free crypto` — including legit giveaway
 * threads on subs like r/HailCorporate. That's a wildly bad first
 * impression on a sub the mod just installed the bot on.
 *
 * Dry-run mode SIMULATES actions: dashboard shows what would have happened
 * with a 'dry-run' badge instead of executing. Mod watches the bot's
 * judgment for a day, then flips `dryRun: false` in the wiki when
 * comfortable. Same safety posture as every shipped example config
 * (12 in examples/ all behind dryRun OR an authorIs mod-bypass filter).
 */

export const DEFAULT_CONFIG_JSON5 = `{
  // Default config seeded on install. Edit r/<sub>/wiki/botconfig/contextmod
  // to replace, then click "ContextMod: Reload config from wiki" in the mod
  // menu (or wait up to 5 min for the cron to pick it up).
  //
  // IMPORTANT: dryRun:true means actions are SIMULATED, not executed —
  // dashboard shows what would have happened. Flip to false in the wiki
  // when you trust the rule's judgment (recommend: watch for ~1 day first).
  dryRun: true,
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
