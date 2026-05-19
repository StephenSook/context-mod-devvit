#!/usr/bin/env node
/**
 * AE Pull-Forward #10 — one-shot YAML → JSON5 migrator for upstream FoxxMD
 * ContextMod configs.
 *
 * Reads a `.yaml` config (the upstream PRAW format), applies the 10 schema
 * renames documented in `docs/migration-from-upstream-cm.md` Step 3,
 * deletes the rule kinds + actions that don't run on Devvit per Step 4,
 * and writes a `.json5`-compatible JSON file the mod can paste into
 * `r/<sub>/wiki/botconfig/contextmod`.
 *
 * Usage:
 *   node scripts/migrate-upstream-config.mjs <input.yaml> [output.json5]
 *
 * If output is omitted the migrated config is printed to stdout. Exit code
 * 0 on success, 1 on read/parse/write failure, 2 on validation cuts that
 * the operator should review (e.g. cut rules in the input).
 *
 * Operator note: this is "translate, don't audit". A successful run
 * doesn't guarantee the migrated config matches your intent — the rules
 * that got CUT silently won't fire after migration. The script emits a
 * `# CUT:` header in the output naming everything it dropped, so you
 * can verify against the upstream YAML before committing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit, stdout } from 'node:process';
import yaml from 'js-yaml';

// --- 10 field renames per migration-from-upstream-cm.md Step 3 ---
const FIELD_RENAMES = {
  condition: 'combinator',
  criteria: 'filter',
  named_rules: 'namedRules',
};

// --- Per-kind rename ('ruleSet' named-rule-ref → 'named') ---
function renameKind(node) {
  if (node && typeof node === 'object' && node.kind === 'ruleSet' && typeof node.name === 'string' && !Array.isArray(node.rules)) {
    // upstream's `{kind: 'ruleSet', name: 'X'}` was a named-rule ref, not a ruleset definition
    return { ...node, kind: 'named' };
  }
  return node;
}

// --- regex rule shape: testOn[] → target string + patterns[] → pattern string ---
function renameRegexRule(node) {
  if (!node || typeof node !== 'object' || node.kind !== 'regex') return node;
  const out = { ...node };
  if (Array.isArray(out.testOn) && out.testOn.length > 0) {
    out.target = String(out.testOn[0]);
    delete out.testOn;
  }
  if (Array.isArray(out.patterns) && out.patterns.length > 0) {
    out.pattern = out.patterns.join('|');
    delete out.patterns;
  }
  return out;
}

// --- comment action: body → template ---
function renameCommentAction(node) {
  if (!node || typeof node !== 'object' || node.kind !== 'comment') return node;
  if (typeof node.body === 'string') {
    const { body, ...rest } = node;
    return { ...rest, template: body };
  }
  return node;
}

// --- remove action: spam → isSpam ---
function renameRemoveAction(node) {
  if (!node || typeof node !== 'object' || node.kind !== 'remove') return node;
  if (typeof node.spam === 'boolean') {
    const { spam, ...rest } = node;
    return { ...rest, isSpam: spam };
  }
  return node;
}

// --- postBehavior: 'continue' → 'next' ---
function renamePostBehavior(node) {
  if (!node || typeof node !== 'object') return node;
  if (node.postBehavior === 'continue') {
    return { ...node, postBehavior: 'next' };
  }
  return node;
}

// --- Rule kinds cut from Devvit port (per Step 4 of migration doc) ---
const CUT_RULE_KINDS = new Set(['mhs', 'sentiment', 'repeatActivity']);
// --- Action kinds cut from Devvit port ---
const CUT_ACTION_KINDS = new Set([
  'dispatch',
  'cancelDispatch',
  'message',
  'modnote',
  'usernote',
  'submission',
  'contributor',
]);

const cuts = []; // collect for the # CUT: header

function transform(node, path = '$') {
  if (Array.isArray(node)) {
    return node
      .map((item, i) => transform(item, `${path}[${i}]`))
      .filter((item) => item !== undefined);
  }
  if (!node || typeof node !== 'object') return node;

  // Drop cut rule kinds (return undefined → filtered out at array level)
  if (node.kind && CUT_RULE_KINDS.has(node.kind)) {
    cuts.push(`${path}: rule kind '${node.kind}' (not portable to Devvit)`);
    return undefined;
  }
  if (node.kind && CUT_ACTION_KINDS.has(node.kind)) {
    cuts.push(`${path}: action kind '${node.kind}' (not portable to Devvit)`);
    return undefined;
  }

  // Drop top-level keys that don't apply
  const dropTopLevel = ['schema_version', 'nicknames', 'polling'];
  for (const k of dropTopLevel) {
    if (k in node && path === '$') {
      cuts.push(`top-level '${k}' (not used by Devvit port)`);
      delete node[k];
    }
  }

  // Apply field renames + per-kind rewrites
  let out = renameKind(node);
  out = renameRegexRule(out);
  out = renameCommentAction(out);
  out = renameRemoveAction(out);
  out = renamePostBehavior(out);

  // Field-level renames
  const renamed = {};
  for (const [k, v] of Object.entries(out)) {
    const newKey = FIELD_RENAMES[k] ?? k;
    renamed[newKey] = transform(v, `${path}.${newKey}`);
  }
  return renamed;
}

function main() {
  const [, , inPath, outPath] = argv;
  if (!inPath) {
    console.error('Usage: node scripts/migrate-upstream-config.mjs <input.yaml> [output.json5]');
    exit(1);
  }

  let raw;
  try {
    raw = readFileSync(inPath, 'utf8');
  } catch (err) {
    console.error(`Failed to read ${inPath}: ${err.message}`);
    exit(1);
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    console.error(`YAML parse failed: ${err.message}`);
    exit(1);
  }

  const migrated = transform(parsed);

  // JSON5 is a superset of JSON — emitting JSON is valid JSON5. Use 2-space
  // indent for readability + trailing newline.
  const json = JSON.stringify(migrated, null, 2) + '\n';

  // Prepend a # CUT: header documenting what got dropped (as a JSON5 comment).
  let output = '// Migrated from upstream FoxxMD ContextMod YAML via\n';
  output += '// scripts/migrate-upstream-config.mjs (AE Pull-Forward #10).\n';
  output += `// Source: ${inPath}\n`;
  output += `// Generated: ${new Date().toISOString()}\n`;
  if (cuts.length > 0) {
    output += '//\n// CUT during migration (review against your upstream YAML):\n';
    for (const c of cuts) output += `//   - ${c}\n`;
    output += '//\n';
  }
  output += '\n';
  output += json;

  if (outPath) {
    try {
      writeFileSync(outPath, output);
      console.error(`Wrote ${outPath} (${json.length} bytes JSON + ${cuts.length} cut notes)`);
    } catch (err) {
      console.error(`Failed to write ${outPath}: ${err.message}`);
      exit(1);
    }
  } else {
    stdout.write(output);
  }

  exit(cuts.length > 0 ? 2 : 0);
}

main();
