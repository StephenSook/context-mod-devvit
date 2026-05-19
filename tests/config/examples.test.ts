/**
 * AE Polish #90: validate every `examples/*.json5` config parses through
 * the live `parseConfig()` pipeline (JSON5 + AJV strict + expandNamedRules).
 *
 * Why: the README + Quick-start flow points mods at `examples/` for working
 * configs they can paste into their sub's wiki. Schema drift after a Phase 4
 * or Polish-wave change to `src/schema/app.schema.json` would silently break
 * the examples without breaking anything else (they're not imported by src
 * — they're just shipped files). This test pins the contract: every example
 * file MUST round-trip through parseConfig without errors. If an example
 * needs to demonstrate an INVALID config for a teaching beat, name it with
 * a `-invalid` suffix or put it in `examples/invalid/` (neither pattern
 * exists yet — all 12 current examples are valid).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseConfig } from '../../src/core/config';

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');

function loadExampleFiles(): string[] {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.json5'))
    .sort();
}

describe('examples/ AJV validation (Polish #90)', () => {
  const files = loadExampleFiles();

  // Sanity guard: if the examples directory empties or someone deletes them
  // all, the test loop below would pass vacuously. Pin a floor count.
  it(`has at least 10 example configs (current: ${files.length})`, () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  // Per-file test so a failure surfaces the offending file name in the
  // vitest report instead of just "examples test failed."
  for (const file of files) {
    it(`${file} parses + validates against current schema`, () => {
      const raw = fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8');
      const result = parseConfig(raw);
      if (!result.ok) {
        const errMsg =
          typeof result.errors === 'string'
            ? result.errors
            : JSON.stringify(result.errors, null, 2);
        throw new Error(`parseConfig failed for ${file}:\n${errMsg}`);
      }
      // Minimum-viable validation: every example must have at least one
      // run with at least one check. (A config with `runs: []` is
      // schema-valid but useless as a teaching example.)
      expect(result.config.runs.length).toBeGreaterThan(0);
      expect(result.config.runs[0]!.checks.length).toBeGreaterThan(0);
    });
  }
});
