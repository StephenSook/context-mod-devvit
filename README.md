# context-mod-devvit

Devvit Web port of [ContextMod](https://github.com/FoxxMD/context-mod) — FoxxMD's sophisticated rule-engine moderation bot for Reddit.

Built for the [Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com/) (Apr 29 – May 27, 2026). Ported with explicit written permission from FoxxMD.

## What it does

ContextMod evaluates new posts and comments against a flexible, mod-defined rule engine and takes moderation actions when checks trigger. Each rule + action set is defined in a JSON5 config (loaded from your sub's wiki), composable with named rules, filters, and Mustache-templated action messages.

The Devvit port preserves the rule/check/action concept model that mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors), [r/piercing](https://reddit.com/r/piercing) (600K visitors, 12K contributors), and 15+ other communities already know — while solving the central-server bottleneck that capped CM's adoption on the original PRAW infrastructure. With Devvit's per-subreddit install model, every mod team can install their own instance.

## Status

**Hackathon-era MVP.** Active development; expect rough edges. See [implementation plan](../docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md) for what's in scope.

## Credits

- **Original bot:** FoxxMD ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)) — MIT License. Used with written permission.
- **Devvit Web template:** Reddit Inc — BSD-3-Clause, see `NOTICES.md`.
- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.

## Fetch Domains

Per Devvit policy, this app fetches the following external domains:

- `api.moderatehatespeech.com` — toxicity classification used by MHSRule (port of CM's MHSRule)
- `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it` — Reddit-hosted image fetch for perceptual-hash (blockhash) repost detection

## License

MIT. See `LICENSE`.
