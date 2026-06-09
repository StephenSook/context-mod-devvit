import { describe, it, expect } from 'vitest';
import { parseConfig } from '../../src/core/config';

describe('parseConfig — valid configs', () => {
  it('parses a minimal valid config with one regex rule', () => {
    const json5 = `{
      // JSON5 comments are allowed
      runs: [{
        name: 'main',
        checks: [{
          name: 'block-scam',
          combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'scam', target: 'title' }],
          actions: [{ kind: 'remove' }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.runs).toHaveLength(1);
      expect(r.config.needsAuthorEnrichment).toBe(false);
    }
  });

  it('computes needsAuthorEnrichment when author rule references karma', () => {
    const json5 = `{
      runs: [{
        name: 'main',
        checks: [{
          name: 'low-karma',
          combinator: 'AND',
          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.needsAuthorEnrichment).toBe(true);
  });

  it('expands named rules inline at parse time', () => {
    const json5 = `{
      namedRules: { spamRegex: { kind: 'regex', pattern: 'scam' } },
      runs: [{
        name: 'main',
        checks: [{
          name: 'use-named',
          combinator: 'AND',
          rules: [{ kind: 'named', name: 'spamRegex' }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.runs[0]!.checks[0]!.rules[0]).toEqual({
        kind: 'regex',
        pattern: 'scam',
      });
    }
  });
});

describe('parseConfig — upstream ContextMod shape (SampleOfNone 2026-06-09)', () => {
  it('accepts a check using upstream condition, enable, description, kind', () => {
    const json5 = `{
      runs: [{
        name: 'main',
        checks: [{
          name: 'block-scam',
          condition: 'OR',
          enable: true,
          description: 'blocks scam titles',
          kind: 'submission',
          rules: [{ kind: 'regex', pattern: 'scam', target: 'title' }],
          actions: [{ kind: 'remove' }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const check = r.config.runs[0]!.checks[0]!;
      expect(check.combinator).toBe('OR'); // condition normalized -> combinator
      expect(check.enable).toBe(true);
      expect(check.kind).toBe('submission');
      expect((check as { condition?: unknown }).condition).toBeUndefined();
    }
  });

  it('defaults a missing combinator to AND', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', rules: [{ kind: 'regex', pattern: 'x' }],
      }] }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.runs[0]!.checks[0]!.combinator).toBe('AND');
  });

  it('lifts check-level itemIs/authorIs into filters', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', combinator: 'AND',
        itemIs: { over18: true },
        authorIs: { isMod: false },
        rules: [{ kind: 'regex', pattern: 'x' }],
      }] }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const check = r.config.runs[0]!.checks[0]!;
      expect(check.filters?.itemIs).toEqual({ over18: true });
      expect(check.filters?.authorIs).toEqual({ isMod: false });
      expect((check as { itemIs?: unknown }).itemIs).toBeUndefined();
    }
  });

  it('still rejects a genuinely unsupported check field (clear error, not silent)', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', combinator: 'AND', rules: [{ kind: 'regex', pattern: 'x' }],
        notARealField: true,
      }] }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });

  it('rejects an unrecognized condition value instead of silently defaulting to AND', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', condition: 'XOR', rules: [{ kind: 'regex', pattern: 'x' }],
      }] }],
    }`;
    const r = parseConfig(json5);
    // left in place -> AJV rejects it as an additional property (no silent AND coercion)
    expect(r.ok).toBe(false);
  });

  it('rejects a non-string condition', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', condition: 5, rules: [{ kind: 'regex', pattern: 'x' }],
      }] }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });
});

describe('parseConfig — malformed configs', () => {
  it('returns ok=false on JSON5 parse error', () => {
    const r = parseConfig('this is not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(typeof r.errors).toBe('string');
  });

  it('rejects unknown rule kind', () => {
    const json5 = `{
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'made-up-rule', pattern: 'x' }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });

  it('rejects missing required field', () => {
    const json5 = `{
      runs: [{
        name: 'r',
        checks: [{
          // missing required \`rules\` (combinator is optional since 2026-06-09)
          name: 'c',
          combinator: 'AND',
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });

  it('rejects additionalProperties on RegexRule', () => {
    const json5 = `{
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'x', unexpectedField: 1 }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown postBehavior shape', () => {
    const json5 = `{
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'regex', pattern: 'x' }],
          postBehavior: 'not-a-real-behavior',
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
  });

  it('Codex H6: returns {ok:false} (NOT throws) on unknown named-rule reference', () => {
    // expandNamedRules throws on unknown names. parseConfig must catch it so
    // callers get a structured ParseResult, not a 500. The error message must
    // be informative enough for the wiki-load failure toast to be actionable.
    const json5 = `{
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'named', name: 'doesNotExist' }],
        }],
      }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.errors === 'string' ? r.errors : JSON.stringify(r.errors)).toMatch(
        /unknown rule name/
      );
    }
  });
});

describe('parseConfig: Polish #136 YAML support (FoxxMD Discord feedback)', () => {
  it('parses an AutoMod-style YAML config (block-style indented mappings)', () => {
    // FoxxMD 2026-05-20: "most mods use [yaml] since it's the same syntax as
    // automod." Existing CM operators should be able to paste their YAML
    // wiki config into the Devvit port without converting first.
    const yaml = `runs:
  - name: main
    checks:
      - name: block-scam
        combinator: AND
        rules:
          - kind: regex
            pattern: scam
            target: title
        actions:
          - kind: remove
`;
    const r = parseConfig(yaml);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format).toBe('yaml');
      expect(r.config.runs).toHaveLength(1);
      expect(r.config.runs[0]!.checks[0]!.rules[0]).toMatchObject({
        kind: 'regex',
        pattern: 'scam',
        target: 'title',
      });
    }
  });

  it('reports YAML parse error with format prefix when YAML is malformed', () => {
    // Tab-indented YAML is a common operator mistake. js-yaml rejects it.
    const yaml = `runs:
\t- name: main`;
    const r = parseConfig(yaml);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.errors).toBe('string');
      expect(r.errors as string).toMatch(/YAML/i);
    }
  });

  it('sniffs JSON5 (starts with `{`) and reports format=json5 on success', () => {
    const json5 = `{
      runs: [{ name: 'main', checks: [{
        name: 'c', combinator: 'AND',
        rules: [{ kind: 'regex', pattern: 'x', target: 'title' }],
      }] }],
    }`;
    const r = parseConfig(json5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format).toBe('json5');
  });

  it('YAML with `#` comment header still parses cleanly', () => {
    const yaml = `# rule pack: anti-spam (rev 2026-05-20)
# operator: u/mod_alice
runs:
  - name: main
    checks:
      - name: ban-scammer
        combinator: AND
        rules:
          - kind: regex
            pattern: free crypto
            target: body
        actions:
          - kind: remove
`;
    const r = parseConfig(yaml);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format).toBe('yaml');
  });

  it('cross-format equivalence: same config in JSON5 and YAML produces identical parsed output', () => {
    const json5 = `{
      runs: [{
        name: 'main',
        checks: [{
          name: 'low-karma',
          combinator: 'AND',
          rules: [{ kind: 'author', filter: { linkKarmaMax: 10 } }],
          actions: [{ kind: 'remove' }],
        }],
      }],
    }`;
    const yaml = `runs:
  - name: main
    checks:
      - name: low-karma
        combinator: AND
        rules:
          - kind: author
            filter:
              linkKarmaMax: 10
        actions:
          - kind: remove
`;
    const a = parseConfig(json5);
    const b = parseConfig(yaml);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      // Identical AppConfig modulo format discriminator.
      expect(a.config.runs).toEqual(b.config.runs);
      expect(a.config.needsAuthorEnrichment).toBe(b.config.needsAuthorEnrichment);
      expect(a.format).toBe('json5');
      expect(b.format).toBe('yaml');
    }
  });

  it('rejects YAML-parsed bare string with readable error (not AJV noise)', () => {
    // YAML.load('this is not json') returns the string 'this is not json'.
    // Without an object-shape guard, AJV rejects with array of errors,
    // which surfaces as JSON-stringified noise in mod-facing toasts.
    const r = parseConfig('this is not json');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.errors).toBe('string');
      expect(r.errors as string).toMatch(/root must be an object/i);
    }
  });

  it('rejects YAML array at root with readable error', () => {
    const yaml = `- name: main
- name: other`;
    const r = parseConfig(yaml);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.errors).toBe('string');
      expect(r.errors as string).toMatch(/root must be an object/i);
      expect(r.errors as string).toMatch(/array/i);
    }
  });

  it('expands namedRules inside a YAML config (parity with JSON5)', () => {
    const yaml = `namedRules:
  spamRegex:
    kind: regex
    pattern: scam
runs:
  - name: main
    checks:
      - name: use-named
        combinator: AND
        rules:
          - kind: named
            name: spamRegex
`;
    const r = parseConfig(yaml);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.runs[0]!.checks[0]!.rules[0]).toEqual({
        kind: 'regex',
        pattern: 'scam',
      });
    }
  });
});
