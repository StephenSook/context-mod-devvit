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
          // missing combinator
          name: 'c',
          rules: [{ kind: 'regex', pattern: 'x' }],
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

  it('Codex H6 — returns {ok:false} (NOT throws) on unknown named-rule reference', () => {
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
