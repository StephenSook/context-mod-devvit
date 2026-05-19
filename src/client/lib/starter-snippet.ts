// Trimmed snapshot of examples/starter-config.json5 kept inline so the
// empty-state can render zero-fetch. Full schema + 12 working configs live
// in /examples/ + are referenced in README "Config schema" + "Quick start".
//
// AE Polish #28: schema previously DIVERGED from the live AJV schema —
// used `schema_version:1` (rejected by strict mode), `condition:'AND'`
// (correct field is `combinator`), `testOn`/`patterns`/`threshold` (correct
// fields are flat `target: string` + `pattern: string`), `reason` on remove
// (correct field is `isSpam: boolean`), `body` on comment (correct field
// is `template`). Mods who copy-pasted this would hit "Config parse failed"
// on first wiki publish + lose trust in the bot before it ever fired.
// Now matches examples/starter-config.json5 exactly + ships behind
// dryRun:true for safety.
export const STARTER_CONFIG_SNIPPET = `{
  dryRun: true,
  runs: [{
    name: 'spam-removal',
    checks: [{
      name: 'crypto-giveaway',
      combinator: 'OR',
      filters: { authorIs: { isMod: false, isContributor: false } },
      rules: [{
        kind: 'regex',
        name: 'scam-words',
        pattern: 'crypto|giveaway|scam|free\\\\s+nft',
        flags: 'i',
      }],
      actions: [
        { kind: 'remove', isSpam: true },
        {
          kind: 'comment',
          template: 'Hi {{author.name}}, your post "{{item.title}}" was removed as suspected spam.',
        },
      ],
    }],
  }],
}`;
