/**
 * AE Pull-Forward #10 — migrate-upstream-config.mjs regression suite.
 *
 * Pins the 10 schema renames + the cut-list. The script is operator-facing
 * (run by 15+ FoxxMD operators per the migration story); a regression here
 * silently corrupts every operator's migrated config — so the lint applies
 * to every rename branch.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT = join(process.cwd(), 'scripts', 'migrate-upstream-config.mjs');

function migrate(yamlContent: string): { json: unknown; stderr: string; exitCode: number } {
  const dir = mkdtempSync(join(tmpdir(), 'cm-migrate-test-'));
  const inPath = join(dir, 'in.yaml');
  writeFileSync(inPath, yamlContent);
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    stdout = execFileSync('node', [SCRIPT, inPath], { encoding: 'utf8' });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = e.status ?? 1;
    stdout = e.stdout ?? '';
    stderr = e.stderr ?? '';
  } finally {
    try {
      unlinkSync(inPath);
    } catch {
      /* best-effort cleanup */
    }
  }
  // Strip comment lines (// ...) before JSON parse — JSON5 supports them
  // but JSON.parse doesn't.
  const jsonOnly = stdout
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
  const json = jsonOnly.trim() ? JSON.parse(jsonOnly) : null;
  return { json, stderr, exitCode };
}

describe('migrate-upstream-config (AE Pull-Forward #10)', () => {
  it('renames condition → combinator on runs + checks + rulesets', () => {
    const { json } = migrate(`
runs:
  - name: r1
    condition: AND
    checks:
      - name: c1
        condition: OR
        rules:
          - kind: regex
            pattern: x
`);
    const out = json as { runs: { combinator: string; checks: { combinator: string }[] }[] };
    expect(out.runs[0]!.combinator).toBe('AND');
    expect(out.runs[0]!.checks[0]!.combinator).toBe('OR');
  });

  it('renames criteria → filter on author rules', () => {
    const { json } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: author
            criteria:
              isMod: true
              ageMinSec: 86400
`);
    const out = json as {
      runs: { checks: { rules: { filter: { isMod: boolean; ageMinSec: number } }[] }[] }[];
    };
    const filter = out.runs[0]!.checks[0]!.rules[0]!.filter;
    expect(filter.isMod).toBe(true);
    expect(filter.ageMinSec).toBe(86400);
  });

  it('regex rule: testOn[] → target string + patterns[] → pattern string (joined w/ |)', () => {
    const { json } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            testOn: [body]
            patterns: [scam, spam, fraud]
`);
    const out = json as {
      runs: { checks: { rules: { target: string; pattern: string }[] }[] }[];
    };
    const rule = out.runs[0]!.checks[0]!.rules[0]!;
    expect(rule.target).toBe('body');
    expect(rule.pattern).toBe('scam|spam|fraud');
  });

  it('comment action body → template, remove action spam → isSpam', () => {
    const { json } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            pattern: x
        actions:
          - kind: remove
            spam: true
          - kind: comment
            body: "removed for X"
`);
    const out = json as {
      runs: { checks: { actions: { kind: string; isSpam?: boolean; template?: string }[] }[] }[];
    };
    const acts = out.runs[0]!.checks[0]!.actions;
    expect(acts[0]!.isSpam).toBe(true);
    expect(acts[1]!.template).toBe('removed for X');
  });

  it('named_rules → namedRules + {kind: ruleSet, name} → {kind: named, name}', () => {
    const { json } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: ruleSet
            name: trusted
        actions:
          - kind: remove
named_rules:
  trusted:
    kind: author
    criteria:
      isMod: true
`);
    const out = json as { namedRules: Record<string, unknown>; runs: unknown[] };
    expect(out.namedRules).toBeDefined();
    expect(out.namedRules.trusted).toBeDefined();
    const ref = (out.runs[0] as { checks: { rules: { kind: string; name: string }[] }[] })
      .checks[0]!.rules[0]!;
    expect(ref.kind).toBe('named');
    expect(ref.name).toBe('trusted');
  });

  it('postBehavior: continue → next', () => {
    const { json } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        postBehavior: continue
        rules:
          - kind: regex
            pattern: x
`);
    const out = json as { runs: { checks: { postBehavior: string }[] }[] };
    expect(out.runs[0]!.checks[0]!.postBehavior).toBe('next');
  });

  it('drops cut rule kinds (mhs, sentiment, repeatActivity) + reports them as CUT', () => {
    const { json, exitCode } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            pattern: keep-me
          - kind: mhs
            threshold: 0.8
          - kind: sentiment
            negative: true
`);
    const out = json as { runs: { checks: { rules: { kind: string }[] }[] }[] };
    const rules = out.runs[0]!.checks[0]!.rules;
    expect(rules).toHaveLength(1);
    expect(rules[0]!.kind).toBe('regex');
    // Exit code 2 = cuts happened, operator should review.
    expect(exitCode).toBe(2);
  });

  it('drops cut action kinds (dispatch, message, modnote, etc.)', () => {
    const { json, exitCode } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            pattern: x
        actions:
          - kind: remove
          - kind: dispatch
            target: queue
          - kind: message
            to: user
            body: hi
          - kind: comment
            body: bye
`);
    const out = json as {
      runs: { checks: { actions: { kind: string }[] }[] }[];
    };
    const acts = out.runs[0]!.checks[0]!.actions;
    expect(acts.map((a) => a.kind)).toEqual(['remove', 'comment']);
    expect(exitCode).toBe(2);
  });

  it('drops schema_version, nicknames, polling at top level', () => {
    const { json } = migrate(`
schema_version: 1
nicknames:
  bob: alice
polling:
  interval: 60
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            pattern: x
`);
    const out = json as Record<string, unknown>;
    expect(out.schema_version).toBeUndefined();
    expect(out.nicknames).toBeUndefined();
    expect(out.polling).toBeUndefined();
    expect(out.runs).toBeDefined();
  });

  it('exit code 0 on clean migration (no cuts)', () => {
    const { exitCode } = migrate(`
runs:
  - name: r1
    checks:
      - name: c1
        rules:
          - kind: regex
            pattern: x
`);
    expect(exitCode).toBe(0);
  });

  it('Polish #22: exit code 1 on YAML parse failure + stderr explains why', () => {
    const { exitCode, stderr } = migrate(`
runs:
  - name: r1
    unclosed: "literally a [bracket without close
    rules:
      - kind: regex
`);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/YAML parse failed/i);
  });

  it('Polish #22: exit code 1 on missing file + stderr includes the path', () => {
    // Bypass our helper — call the script directly with a non-existent path.
    const missing = join(tmpdir(), 'cm-migrate-does-not-exist-' + Date.now() + '.yaml');
    let exitCode = 0;
    let stderr = '';
    try {
      execFileSync('node', [SCRIPT, missing], { encoding: 'utf8' });
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 1;
      stderr = e.stderr ?? '';
    }
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/Failed to read/i);
    expect(stderr).toContain(missing);
  });

  it('Polish #22: exit code 1 + usage on missing args (no input path)', () => {
    let exitCode = 0;
    let stderr = '';
    try {
      execFileSync('node', [SCRIPT], { encoding: 'utf8' });
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 1;
      stderr = e.stderr ?? '';
    }
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/Usage:/);
  });
});
