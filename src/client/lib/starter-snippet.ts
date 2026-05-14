// Trimmed snapshot of examples/starter-config.json5 kept inline so the
// empty-state can render zero-fetch. Full schema + 3 working configs live
// in /examples/ and are referenced in README "Config schema" + "Quick start".
export const STARTER_CONFIG_SNIPPET = `{
  schema_version: 1,
  runs: [{
    name: 'safety',
    checks: [{
      name: 'block-spam',
      condition: 'AND',
      rules: [{
        kind: 'regex',
        testOn: ['title', 'body'],
        patterns: ['(?i)\\\\bfree\\\\s+crypto\\\\b'],
        threshold: 1,
      }],
      actions: [
        { kind: 'remove', reason: 'spam pattern' },
        { kind: 'comment', body: 'Hi {{author}}, removed for spam.' },
      ],
    }],
  }],
}`;
