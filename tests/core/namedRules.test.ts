import { describe, it, expect } from 'vitest';
import { expandNamedRules } from '../../src/core/namedRules';
import type { AppConfig } from '../../src/shared/types';

describe('expandNamedRules', () => {
  it('inlines a named regex rule', () => {
    const cfg: AppConfig = {
      namedRules: { spamRegex: { kind: 'regex', pattern: 'scam' } },
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'named', name: 'spamRegex' }],
        }],
      }],
    };
    const out = expandNamedRules(cfg);
    expect(out.runs[0]!.checks[0]!.rules[0]).toEqual({ kind: 'regex', pattern: 'scam' });
  });

  it('expands inside a ruleset', () => {
    const cfg: AppConfig = {
      namedRules: { spamRegex: { kind: 'regex', pattern: 'scam' } },
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{
            kind: 'ruleset',
            combinator: 'AND',
            rules: [{ kind: 'named', name: 'spamRegex' }],
          }],
        }],
      }],
    };
    const out = expandNamedRules(cfg);
    const inner = out.runs[0]!.checks[0]!.rules[0] as { rules: unknown[] };
    expect(inner.rules[0]).toEqual({ kind: 'regex', pattern: 'scam' });
  });

  it('throws on unknown name', () => {
    const cfg: AppConfig = {
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'named', name: 'doesNotExist' }],
        }],
      }],
    };
    expect(() => expandNamedRules(cfg)).toThrow(/unknown rule name/);
  });

  it('breaks cycles by short-circuiting to empty ruleset', () => {
    // a → ruleset(b), b → ruleset(a)
    const cfg: AppConfig = {
      namedRules: {
        a: { kind: 'ruleset', combinator: 'AND', rules: [{ kind: 'named', name: 'b' }] },
        b: { kind: 'ruleset', combinator: 'AND', rules: [{ kind: 'named', name: 'a' }] },
      },
      runs: [{
        name: 'r',
        checks: [{
          name: 'c',
          combinator: 'AND',
          rules: [{ kind: 'named', name: 'a' }],
        }],
      }],
    };
    const out = expandNamedRules(cfg);
    // Don't crash + produce something rather than throw.
    expect(out.runs[0]!.checks[0]!.rules.length).toBe(1);
  });
});
