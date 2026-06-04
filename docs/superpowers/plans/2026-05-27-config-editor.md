# Config Editor (Observatory Workbench) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app config editor to the ContextMod Observatory dashboard so mods load, edit (with YAML/JSON syntax + schema hints + inline validation), preview live impact, and save back to the wiki, with no copy/paste.

**Architecture:** A new server surface adds read/validate/simulate/explain/save endpoints to the existing Hono `api` app, reusing `parseConfig` + AJV, `simulateRule`, `explainRule`, and `configStore.publish`. The client adds a lazy-loaded `ConfigWorkbench` opened via Devvit `requestExpandedMode`, built on CodeMirror 6 + `codemirror-json-schema` (CSP-safe, monaco is not viable on Devvit). Save-back uses `reddit.updateWikiPage`, gated by server-side re-validation + an optimistic lock.

**Tech Stack:** TypeScript, Hono, React 18, Vite, CodeMirror 6, `codemirror-json-schema`, AJV, json5, js-yaml, Devvit Web, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-27-config-editor-design.md`

---

## Conventions (apply to every task)

- Branch: `feat/config-editor` (already checked out).
- Test: `npm test` (alias for `vitest run --config vitest.config.ts`). Single file: `npm test -- <path>`.
- Type-check: `npm run type-check`. Lint: `npm run lint`. Build: `npm run build`.
- Commit messages: Conventional Commits, subject <= 100 chars, no em-dash, end body with:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Test mocking pattern (mirror `tests/routes/forms-simulate-rule.test.ts`): `vi.mock('@devvit/web/server', ...)` and `vi.mock('../../src/lib/requireModerator', ...)` BEFORE importing the Hono app, then `await api.request(new Request('http://x/<path>', {...}))`.
- Existing reused symbols: `WIKI_PAGE` + `loadFromWiki` (`src/core/configSource.ts`), `parseConfig` (`src/core/config.ts`), `publish` + `getCurrentRev` + `getRecentRevs` (`src/state/configStore.ts`), `requireModerator` (`src/lib/requireModerator.ts`, returns `{ok:true,sub,username} | {ok:false,status,error}`), `simulateRule` + `SimulationSample` (`src/core/simulateRule.ts`), `explainRule` (`src/core/explainRule.ts`), `checkRateLimit` (`src/lib/ratelimit`), `logModActivity` (`src/state/modActivity`), `K` (`src/state/keys.ts`).

---

## File Structure

New:
- `src/lib/resolveOpenaiKey.ts` — shared OpenAI key resolver (extracted from `forms.ts`).
- `src/core/recentSample.ts` — fetch + normalize + cache the sub's recent items as `SimulationSample[]`.
- `src/routes/configEditor.ts` — the new `/api/config/*` route group (raw, validate, simulate-live, explain, save).
- `src/client/components/ConfigEditor.tsx` — CodeMirror 6 wrapper.
- `src/client/components/ConfigWorkbench.tsx` — orchestrator (load, edit, preview, save), lazy-loaded.
- `src/client/components/PreviewPane.tsx` — Impact / Explain / Diff tabs.
- `scripts/gen-schema-descriptions.mjs` — inject `description` fields into `app.schema.json` from `src/shared/types.ts` JSDoc.

Modified:
- `src/routes/api.ts` — mount the config-editor routes.
- `src/routes/forms.ts` — use the extracted `resolveOpenaiKey` + `getRecentSample`.
- `src/client/lib/api.ts` — add `fetchConfigRawSafe`, `validateConfigSafe`, `saveConfigSafe`, `simulateLiveSafe`, `explainConfigSafe`.
- `src/client/lib/types.ts` — add wire types.
- `src/client/components/ActionBar.tsx` — add "Edit config" button + `onEditConfig` prop.
- `src/client/App.tsx` — `editorOpen` state + lazy `<ConfigWorkbench>` + Escape close.
- `src/schema/app.schema.json` — add `description` fields.
- `package.json` — add CodeMirror deps.

---

## PHASE 1 — Server (read, validate, simulate, explain, save)

### Task 1: Extract `resolveOpenaiKey` (DRY prep)

**Files:**
- Create: `src/lib/resolveOpenaiKey.ts`
- Modify: `src/routes/forms.ts` (replace the local `resolveOpenaiKey`)
- Test: `tests/lib/resolveOpenaiKey.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/resolveOpenaiKey.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getOpenaiKey = vi.fn();
const settingsGet = vi.fn();
vi.mock('../../src/state/apiKeyStore', () => ({ getOpenaiKey: (s: string) => getOpenaiKey(s) }));
vi.mock('@devvit/web/server', () => ({ settings: { get: (k: string) => settingsGet(k) } }));

import { resolveOpenaiKey } from '../../src/lib/resolveOpenaiKey';

describe('resolveOpenaiKey', () => {
  beforeEach(() => { getOpenaiKey.mockReset(); settingsGet.mockReset(); });

  it('prefers the Redis key', async () => {
    getOpenaiKey.mockResolvedValue('sk-redis');
    expect(await resolveOpenaiKey('sub')).toBe('sk-redis');
  });

  it('falls back to settings, trimmed', async () => {
    getOpenaiKey.mockResolvedValue(null);
    settingsGet.mockResolvedValue('  sk-settings  ');
    expect(await resolveOpenaiKey('sub')).toBe('sk-settings');
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `npm test -- tests/lib/resolveOpenaiKey.test.ts`
Expected: FAIL ("Cannot find module '../../src/lib/resolveOpenaiKey'").

- [ ] **Step 3: Implement**

```ts
// src/lib/resolveOpenaiKey.ts
import { settings } from '@devvit/web/server';
import { getOpenaiKey } from '../state/apiKeyStore';

/** Resolve the OpenAI key for a sub: encrypted-Redis key first, then the
 * plaintext Devvit subreddit-setting fallback. Returns '' when neither set. */
export async function resolveOpenaiKey(sub: string): Promise<string> {
  const fromRedis = await getOpenaiKey(sub);
  if (fromRedis) return fromRedis;
  return ((await settings.get<string>('openai_api_key')) ?? '').trim();
}
```

- [ ] **Step 4: Refactor `forms.ts`** — delete its local `resolveOpenaiKey` (the agent located it near line 46) and add `import { resolveOpenaiKey } from '../lib/resolveOpenaiKey';`. Leave call sites unchanged.

- [ ] **Step 5: Run tests + type-check**

Run: `npm test -- tests/lib/resolveOpenaiKey.test.ts && npm run type-check`
Expected: PASS, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/resolveOpenaiKey.ts src/routes/forms.ts tests/lib/resolveOpenaiKey.test.ts
git commit -m "refactor: extract resolveOpenaiKey into a shared lib" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extract + cache the recent-items sample (`getRecentSample`)

**Files:**
- Create: `src/core/recentSample.ts`
- Modify: `src/routes/forms.ts` (use `getRecentSample` in the simulate-rule handler)
- Test: `tests/core/recentSample.test.ts`

The simulate-rule form currently builds samples inline (`fetchRecentPostsSafe` + a `normalizePost` loop). Extract that into a cached helper so the editor's live-impact endpoint reuses it without re-fetching Reddit on every keystroke.

- [ ] **Step 1: Write the failing test**

```ts
// tests/core/recentSample.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getNewPosts = vi.fn();
const redisGet = vi.fn();
const redisSet = vi.fn();
vi.mock('@devvit/web/server', () => ({
  reddit: { getNewPosts: (o: unknown) => getNewPosts(o) },
  redis: { get: (k: string) => redisGet(k), set: (k: string, v: string, o?: unknown) => redisSet(k, v, o) },
}));

import { getRecentSample } from '../../src/core/recentSample';

describe('getRecentSample', () => {
  beforeEach(() => { getNewPosts.mockReset(); redisGet.mockReset(); redisSet.mockReset(); });

  it('returns the cached sample without hitting reddit', async () => {
    redisGet.mockResolvedValue(JSON.stringify([{ item: { id: 't3_x' }, author: { name: 'a' } }]));
    const out = await getRecentSample('sub');
    expect(out).toHaveLength(1);
    expect(getNewPosts).not.toHaveBeenCalled();
  });

  it('fetches + caches on a cache miss', async () => {
    redisGet.mockResolvedValue(null);
    getNewPosts.mockReturnValue({ all: async () => [] });
    await getRecentSample('sub');
    expect(getNewPosts).toHaveBeenCalledOnce();
    expect(redisSet).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `npm test -- tests/core/recentSample.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** (move the `fetchRecentPostsSafe` + `normalizePost` logic out of `forms.ts`; reuse the existing `normalizePost` import there)

```ts
// src/core/recentSample.ts
import { reddit, redis } from '@devvit/web/server';
import type { SimulationSample } from './simulateRule';
import { normalizePost } from './normalize'; // same module forms.ts imports normalizePost from
import { getCurrentRev } from '../state/configStore';
import type { AppConfig, PostSubmitPayload } from '../shared/types';

const SAMPLE_LIMIT = 25;
const CACHE_TTL_MS = 60_000; // 60s: fresh enough for live preview, no per-keystroke fetch

function cacheKey(sub: string) { return `cm:${sub}:editor:sample`; }

/** Recent posts of the sub, normalized to SimulationSample[], cached 60s. */
export async function getRecentSample(sub: string): Promise<SimulationSample[]> {
  try {
    const cached = await redis.get(cacheKey(sub));
    if (cached) return JSON.parse(cached) as SimulationSample[];
  } catch {
    /* cache read miss/fail -> fall through to fetch */
  }

  const snapshot = await getCurrentRev(sub);
  const config: AppConfig = snapshot?.config ?? { runs: [], needsAuthorEnrichment: false };

  const redditAny = reddit as unknown as { getNewPosts: (o: unknown) => { all: () => Promise<unknown[]> } };
  const listing = redditAny.getNewPosts({ subredditName: sub, limit: SAMPLE_LIMIT, pageSize: SAMPLE_LIMIT });
  const posts = (await listing.all()).slice(0, SAMPLE_LIMIT) as Array<Record<string, unknown>>;

  const samples: SimulationSample[] = [];
  for (const p of posts) {
    const payload = { post: p, author: { name: (p as { authorName?: string }).authorName } } as unknown as PostSubmitPayload;
    const normalized = await normalizePost(payload, config);
    samples.push({ item: normalized.item, author: normalized.author });
  }

  try {
    await redis.set(cacheKey(sub), JSON.stringify(samples), { expiration: new Date(Date.now() + CACHE_TTL_MS) });
  } catch {
    /* cache write fail is non-fatal */
  }
  return samples;
}
```

NOTE for the implementer: open `src/routes/forms.ts` and copy the exact `normalizePost` import path + the exact `getNewPosts` option object it uses; match them here so the normalization is identical. The payload shape above is the structural form the existing handler builds.

- [ ] **Step 4: Refactor `forms.ts`** — replace its inline sample-building in `/simulate-rule-submit` with `const samples = await getRecentSample(sub.name);`. Keep the `simulateRule(ruleJson5, samples, sub.name)` call.

- [ ] **Step 5: Run tests + type-check**

Run: `npm test -- tests/core/recentSample.test.ts tests/routes/forms-simulate-rule.test.ts && npm run type-check`
Expected: PASS (the existing forms test still passes against the refactor).

- [ ] **Step 6: Commit**

```bash
git add src/core/recentSample.ts src/routes/forms.ts tests/core/recentSample.test.ts
git commit -m "refactor: extract cached getRecentSample for reuse by the editor" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Config-editor route group + `GET /api/config/raw`

**Files:**
- Create: `src/routes/configEditor.ts`
- Modify: `src/routes/api.ts` (mount the sub-app)
- Test: `tests/routes/config-editor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/routes/config-editor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getWikiPage = vi.fn();
const requireModeratorMock = vi.fn();
vi.mock('@devvit/web/server', () => ({
  reddit: { getWikiPage: (s: string, p: string) => getWikiPage(s, p), updateWikiPage: vi.fn() },
  redis: { get: vi.fn(async () => null), set: vi.fn(async () => 'OK') },
  settings: { get: vi.fn() },
}));
vi.mock('../../src/lib/requireModerator', () => ({ requireModerator: () => requireModeratorMock() }));

import { configEditor } from '../../src/routes/configEditor';

const MOD = { ok: true, sub: 'testsub', username: 'mod1' };
const NON_MOD = { ok: false, status: 403, error: 'not a moderator of this sub' };

async function get(path: string) {
  const res = await configEditor.request(new Request(`http://x${path}`));
  return { status: res.status, body: await res.json() };
}

describe('GET /raw', () => {
  beforeEach(() => { getWikiPage.mockReset(); requireModeratorMock.mockReset(); });

  it('returns wiki content + revisionId for a mod', async () => {
    requireModeratorMock.mockResolvedValue(MOD);
    getWikiPage.mockResolvedValue({ content: 'runs: []', revisionId: 'rev-1' });
    const r = await get('/raw');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ content: 'runs: []', revisionId: 'rev-1' });
  });

  it('rejects non-mods', async () => {
    requireModeratorMock.mockResolvedValue(NON_MOD);
    const r = await get('/raw');
    expect(r.status).toBe(403);
  });

  it('returns the default template on a missing page', async () => {
    requireModeratorMock.mockResolvedValue(MOD);
    getWikiPage.mockRejectedValue(new Error('404 not found'));
    const r = await get('/raw');
    expect(r.status).toBe(200);
    expect(r.body.isDefaultTemplate).toBe(true);
    expect(typeof r.body.content).toBe('string');
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `npm test -- tests/routes/config-editor.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the route group + `/raw`**

```ts
// src/routes/configEditor.ts
import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { WIKI_PAGE } from '../core/configSource';
import { requireModerator } from '../lib/requireModerator';
import { DEFAULT_CONFIG_YAML } from '../config/default-config'; // see NOTE below
import { log } from '../lib/log';

export const configEditor = new Hono();

function isNotFound(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return m.includes('not found') || m.includes('404') || m.includes('does not exist');
}

configEditor.get('/raw', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ error: auth.error }, auth.status);
  try {
    const page = await reddit.getWikiPage(auth.sub, WIKI_PAGE);
    return c.json({ content: page.content, revisionId: page.revisionId, isDefaultTemplate: false });
  } catch (err) {
    if (isNotFound(err)) {
      return c.json({ content: DEFAULT_CONFIG_YAML, revisionId: null, isDefaultTemplate: true });
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/config/raw', 'wiki read failed', { err: msg, sub: auth.sub });
    return c.json({ error: `wiki unavailable: ${msg}` }, 503);
  }
});
```

NOTE for the implementer: `src/config/default-config.ts` currently exports a JSON5 default. Add a `DEFAULT_CONFIG_YAML` export (the same starter config rendered as YAML, since YAML is the default editor format). If a YAML constant is awkward to maintain by hand, import the existing default object and `import { dump } from 'js-yaml'` to render it: `export const DEFAULT_CONFIG_YAML = dump(DEFAULT_CONFIG_OBJECT);`.

- [ ] **Step 4: Mount in `api.ts`**

In `src/routes/api.ts`, add near the other imports: `import { configEditor } from './configEditor';` and after `export const api = new Hono();` add: `api.route('/config', configEditor);`

- [ ] **Step 5: Run tests + type-check + lint**

Run: `npm test -- tests/routes/config-editor.test.ts && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/configEditor.ts src/routes/api.ts src/config/default-config.ts tests/routes/config-editor.test.ts
git commit -m "feat(api): GET /api/config/raw returns wiki text + revisionId" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `POST /api/config/validate`

**Files:**
- Modify: `src/routes/configEditor.ts`
- Test: `tests/routes/config-editor.test.ts` (add a describe block)

- [ ] **Step 1: Write the failing test**

```ts
// add to tests/routes/config-editor.test.ts
async function post(path: string, body: unknown) {
  const res = await configEditor.request(new Request(`http://x${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { status: res.status, body: await res.json() };
}

describe('POST /validate', () => {
  beforeEach(() => { requireModeratorMock.mockResolvedValue(MOD); });
  it('accepts a valid config', async () => {
    const r = await post('/validate', { text: 'runs: []' });
    expect(r.body.ok).toBe(true);
  });
  it('reports errors for an invalid config', async () => {
    const r = await post('/validate', { text: 'runs: "not an array"' });
    expect(r.body.ok).toBe(false);
    expect(r.body.errors).toBeDefined();
  });
});
```

- [ ] **Step 2: Run it, expect fail** — Run: `npm test -- tests/routes/config-editor.test.ts` Expected: FAIL ("/validate" 404).

- [ ] **Step 3: Implement**

```ts
// add to src/routes/configEditor.ts
import { parseConfig } from '../core/config';

configEditor.post('/validate', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string') return c.json({ ok: false, error: 'text required' }, 400);
  const parsed = parseConfig(text);
  if (parsed.ok) return c.json({ ok: true, format: parsed.format });
  return c.json({ ok: false, errors: parsed.errors });
});
```

- [ ] **Step 4: Run + commit**

Run: `npm test -- tests/routes/config-editor.test.ts && npm run type-check`
```bash
git add src/routes/configEditor.ts tests/routes/config-editor.test.ts
git commit -m "feat(api): POST /api/config/validate runs parseConfig + AJV" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `POST /api/config/simulate-live`

**Files:**
- Modify: `src/routes/configEditor.ts`
- Test: `tests/routes/config-editor.test.ts`

- [ ] **Step 1: Write the failing test** (mock `getRecentSample` + `simulateRule`)

```ts
// add near the other vi.mock calls in tests/routes/config-editor.test.ts
const getRecentSample = vi.fn();
const simulateRule = vi.fn();
vi.mock('../../src/core/recentSample', () => ({ getRecentSample: (s: string) => getRecentSample(s) }));
vi.mock('../../src/core/simulateRule', () => ({ simulateRule: (...a: unknown[]) => simulateRule(...a) }));

describe('POST /simulate-live', () => {
  beforeEach(() => { requireModeratorMock.mockResolvedValue(MOD); getRecentSample.mockResolvedValue([]); });
  it('returns the simulation result', async () => {
    simulateRule.mockResolvedValue({ ok: true, totalSamples: 25, firedCount: 7, erroredCount: 0, breakdown: [] });
    const r = await post('/simulate-live', { text: 'runs: []' });
    expect(r.body).toMatchObject({ ok: true, firedCount: 7, totalSamples: 25 });
  });
});
```

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/routes/config-editor.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement** (rate-limited; dry-run via `simulateRule`, which never executes actions)

```ts
// add to src/routes/configEditor.ts
import { getRecentSample } from '../core/recentSample';
import { simulateRule } from '../core/simulateRule';
import { checkRateLimit } from '../lib/ratelimit';

configEditor.post('/simulate-live', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }
  // Per-sub limit: live preview fires on debounced edits; cap to protect Reddit-API budget.
  const rl = await checkRateLimit('simulate-live', auth.sub, 120, 60);
  if (!rl.allowed) return c.json({ ok: false, error: 'Slow down a moment, then keep editing.' }, 429);

  const samples = await getRecentSample(auth.sub);
  const result = await simulateRule(text, samples, auth.sub);
  return c.json(result);
});
```

- [ ] **Step 4: Run + commit**

Run: `npm test -- tests/routes/config-editor.test.ts && npm run type-check`
```bash
git add src/routes/configEditor.ts tests/routes/config-editor.test.ts
git commit -m "feat(api): POST /api/config/simulate-live (dry-run impact on cached sample)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `POST /api/config/explain`

**Files:**
- Modify: `src/routes/configEditor.ts`
- Test: `tests/routes/config-editor.test.ts`

Mirror the cost controls already on `/api/explain-event` (breaker + per-sub + per-user rate limit). Reuse `resolveOpenaiKey` (Task 1) + `explainRule`.

- [ ] **Step 1: Write the failing test**

```ts
const explainRule = vi.fn();
const resolveOpenaiKey = vi.fn();
vi.mock('../../src/core/explainRule', () => ({ explainRule: (...a: unknown[]) => explainRule(...a) }));
vi.mock('../../src/lib/resolveOpenaiKey', () => ({ resolveOpenaiKey: (s: string) => resolveOpenaiKey(s) }));

describe('POST /explain', () => {
  beforeEach(() => { requireModeratorMock.mockResolvedValue(MOD); resolveOpenaiKey.mockResolvedValue('sk-x'); });
  it('returns the explanation', async () => {
    explainRule.mockResolvedValue({ ok: true, value: 'This rule removes crypto spam.' });
    const r = await post('/explain', { text: 'runs: []' });
    expect(r.body).toMatchObject({ ok: true, explanation: 'This rule removes crypto spam.' });
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (rate-limit cost gate, fail-closed on degraded as the explain-event route does)

```ts
// add to src/routes/configEditor.ts
import { explainRule } from '../core/explainRule';
import { resolveOpenaiKey } from '../lib/resolveOpenaiKey';

configEditor.post('/explain', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text } = await c.req.json<{ text?: string }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }
  const rl = await checkRateLimit('explain', `${auth.sub}:${auth.username}`, 10, 3600);
  if (rl.degraded) return c.json({ ok: false, error: 'Rate-limit subsystem degraded. Retry in ~60s.' }, 503);
  if (!rl.allowed) return c.json({ ok: false, error: `Your limit: ${rl.count}/${rl.max} this hour.` }, 429);

  const apiKey = await resolveOpenaiKey(auth.sub);
  if (!apiKey) return c.json({ ok: false, error: 'No OpenAI key set. Use the "Set OpenAI API key" mod menu.' }, 400);
  const result = await explainRule(text, apiKey);
  if (!result.ok) return c.json({ ok: false, error: result.error }, 500);
  return c.json({ ok: true, explanation: result.value });
});
```

- [ ] **Step 4: Run + commit**

```bash
git add src/routes/configEditor.ts tests/routes/config-editor.test.ts
git commit -m "feat(api): POST /api/config/explain (AI explainer for the editor)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `POST /api/config/save` (the privileged write)

**Files:**
- Modify: `src/routes/configEditor.ts`
- Test: `tests/routes/config-editor.test.ts`

Order of operations: mod-auth, re-validate (reject invalid), optimistic-lock check (re-read current revisionId, 409 if it moved since the editor loaded), `updateWikiPage`, then `publish` + stamp `cfgLastWikiRev`, then `logModActivity`.

- [ ] **Step 1: Write the failing tests** (invalid -> 400, conflict -> 409, success -> updateWikiPage + publish called)

```ts
const updateWikiPage = vi.fn();
const publish = vi.fn();
const logModActivity = vi.fn();
// extend the @devvit/web/server mock's reddit with updateWikiPage already declared in Task 3 mock.
vi.mock('../../src/state/configStore', () => ({
  publish: (...a: unknown[]) => publish(...a),
  getCurrentRev: vi.fn(),
  getRecentRevs: vi.fn(),
}));
vi.mock('../../src/state/modActivity', () => ({ logModActivity: (...a: unknown[]) => logModActivity(...a) }));

describe('POST /save', () => {
  beforeEach(() => {
    requireModeratorMock.mockResolvedValue(MOD);
    updateWikiPage.mockReset(); publish.mockReset(); getWikiPage.mockReset();
  });

  it('rejects an invalid config without writing', async () => {
    const r = await post('/save', { text: 'runs: "bad"', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(400);
    expect(updateWikiPage).not.toHaveBeenCalled();
  });

  it('409s when the wiki moved since load', async () => {
    getWikiPage.mockResolvedValue({ content: 'runs: []', revisionId: 'rev-2' });
    const r = await post('/save', { text: 'runs: []', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(409);
    expect(updateWikiPage).not.toHaveBeenCalled();
  });

  it('saves a valid config and publishes', async () => {
    getWikiPage.mockResolvedValue({ content: 'old', revisionId: 'rev-1' });
    publish.mockResolvedValue(0);
    const r = await post('/save', { text: 'runs: []', baseRevisionId: 'rev-1' });
    expect(r.status).toBe(200);
    expect(updateWikiPage).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledOnce();
  });
});
```

NOTE: in the `@devvit/web/server` mock from Task 3, change `updateWikiPage: vi.fn()` to `updateWikiPage: (o: unknown) => updateWikiPage(o)` and declare `const updateWikiPage = vi.fn();` at the top so the assertion can see it.

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/routes/config-editor.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// add to src/routes/configEditor.ts
import { publish } from '../state/configStore';
import { redis } from '@devvit/web/server';
import { K } from '../state/keys';
import { logModActivity } from '../state/modActivity';

configEditor.post('/save', async (c) => {
  const auth = await requireModerator();
  if (!auth.ok) return c.json({ ok: false, error: auth.error }, auth.status);
  const { text, baseRevisionId } = await c.req.json<{ text?: string; baseRevisionId?: string | null }>();
  if (typeof text !== 'string' || text.length > 100_000) {
    return c.json({ ok: false, error: 'text required (max 100KB)' }, 400);
  }

  // Gate 1: never write an invalid config to the live moderation wiki.
  const parsed = parseConfig(text);
  if (!parsed.ok) return c.json({ ok: false, error: 'config invalid', errors: parsed.errors }, 400);

  // Gate 2: optimistic lock. Re-read the current wiki rev; if it moved since the
  // editor loaded, refuse so we never silently clobber a concurrent edit.
  try {
    const current = await reddit.getWikiPage(auth.sub, WIKI_PAGE);
    if (baseRevisionId && current.revisionId !== baseRevisionId) {
      return c.json({ ok: false, error: 'The wiki changed since you opened the editor. Reload to merge.', conflict: true }, 409);
    }
  } catch (err) {
    if (!isNotFound(err)) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ ok: false, error: `Could not verify current wiki state: ${msg}` }, 503);
    }
    // not-found = first save on a fresh sub; allow the create.
  }

  // Write, then publish the parsed snapshot + stamp the wiki rev so the 5-min cron
  // does not re-publish an identical config.
  try {
    await reddit.updateWikiPage({
      subredditName: auth.sub,
      page: WIKI_PAGE,
      content: text,
      reason: `Edited via ContextMod Observatory by u/${auth.username}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('cm/api/config/save', 'updateWikiPage failed', { err: msg, sub: auth.sub });
    return c.json({ ok: false, error: `Wiki write failed: ${msg}` }, 502);
  }

  const rev = await publish(parsed.config, auth.sub);
  try {
    const after = await reddit.getWikiPage(auth.sub, WIKI_PAGE);
    await redis.set(K.cfgLastWikiRev(auth.sub), after.revisionId);
  } catch {
    /* stamping is best-effort; the cron self-heals next tick */
  }
  const ruleCount = parsed.config.runs.flatMap((r) => r.checks).flatMap((ch) => ch.rules).length;
  await logModActivity(auth.sub, { ts: Date.now(), actor: auth.username, kind: 'edit-config', detail: `${ruleCount} rules @ rev ${rev}` });
  return c.json({ ok: true, rev, ruleCount });
});
```

NOTE: confirm `publish`'s return value (the agent reported `publish(config, sub)` allocating a rev; if it returns void, drop `rev` from the response and read it via `getCurrentRev`). Confirm `K.cfgLastWikiRev` exists in `src/state/keys.ts` (the agent confirmed it does).

- [ ] **Step 4: Run tests + type-check + lint**

Run: `npm test -- tests/routes/config-editor.test.ts && npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/configEditor.ts tests/routes/config-editor.test.ts
git commit -m "feat(api): POST /api/config/save with validation gate + optimistic lock" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 2 — Client shell + editor

### Task 8: Add CodeMirror dependencies

**Files:** Modify `package.json` + `package-lock.json`.

- [ ] **Step 1: Install** (pinned, CSP-safe set)

```bash
npm install @codemirror/state@^6 @codemirror/view@^6 @codemirror/commands@^6 @codemirror/language@^6 @codemirror/lang-yaml@^6 @codemirror/lang-json@^6 @codemirror/lint@^6 @codemirror/autocomplete@^6 codemirror-json-schema@^0.8
```

- [ ] **Step 2: Verify it builds + type-checks**

Run: `npm run type-check && npm run build`
Expected: clean (deps resolve; no usage yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add CodeMirror 6 + codemirror-json-schema deps" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Client API helpers + wire types

**Files:**
- Modify: `src/client/lib/api.ts`, `src/client/lib/types.ts`
- Test: `tests/client/config-api.test.ts`

- [ ] **Step 1: Write the failing test** (mirror `tests/client/api.test.ts`; mock global `fetch`)

```ts
// tests/client/config-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchConfigRawSafe, saveConfigSafe } from '../../src/client/lib/api';

beforeEach(() => { vi.restoreAllMocks(); });

describe('config api helpers', () => {
  it('fetchConfigRawSafe returns content on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ content: 'runs: []', revisionId: 'rev-1', isDefaultTemplate: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const r = await fetchConfigRawSafe();
    expect(r.ok).toBe(true);
    if (r.ok && !r.empty) expect(r.data.content).toBe('runs: []');
  });

  it('saveConfigSafe surfaces a 409 conflict', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: false, error: 'wiki changed', conflict: true }),
      { status: 409, headers: { 'Content-Type': 'application/json' } })));
    const r = await saveConfigSafe('runs: []', 'rev-1');
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/client/config-api.test.ts` Expected: FAIL.

- [ ] **Step 3: Add wire types** to `src/client/lib/types.ts`

```ts
export type ConfigRaw = { content: string; revisionId: string | null; isDefaultTemplate: boolean };
export type SaveResult = { rev: number; ruleCount: number };
export type SimResult = { totalSamples: number; firedCount: number; erroredCount: number; firstError?: string };
```

- [ ] **Step 4: Implement helpers** in `src/client/lib/api.ts` (follow the existing `ApiResult<T>` + `extractServerError` + `demoSuffix` pattern already in the file)

```ts
import type { ConfigRaw, SaveResult, SimResult } from './types';

export async function fetchConfigRawSafe(): Promise<ApiResult<ConfigRaw>> {
  try {
    const res = await fetch(`/api/config/raw${demoSuffix()}`);
    if (!res.ok) return { ok: false, error: await extractServerError(res) };
    const data = (await res.json()) as ConfigRaw;
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function validateConfigSafe(text: string): Promise<{ ok: boolean; errors?: unknown }> {
  try {
    const res = await fetch('/api/config/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    return (await res.json()) as { ok: boolean; errors?: unknown };
  } catch (err) {
    return { ok: false, errors: err instanceof Error ? err.message : String(err) };
  }
}

export async function simulateLiveSafe(text: string): Promise<ApiResult<SimResult>> {
  try {
    const res = await fetch('/api/config/simulate-live', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    if (!res.ok) return { ok: false, error: await extractServerError(res) };
    const data = (await res.json()) as { ok: boolean; error?: string } & SimResult;
    if (!data.ok) return { ok: false, error: data.error ?? 'simulation failed' };
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function explainConfigSafe(text: string): Promise<ApiResult<string>> {
  try {
    const res = await fetch('/api/config/explain', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
    });
    const data = (await res.json()) as { ok: boolean; explanation?: string; error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? await extractServerError(res) };
    return { ok: true, empty: false, data: data.explanation ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveConfigSafe(text: string, baseRevisionId: string | null): Promise<ApiResult<SaveResult>> {
  try {
    const res = await fetch('/api/config/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, baseRevisionId }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string } & SaveResult;
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? await extractServerError(res) };
    return { ok: true, empty: false, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 5: Run + commit**

Run: `npm test -- tests/client/config-api.test.ts && npm run type-check`
```bash
git add src/client/lib/api.ts src/client/lib/types.ts tests/client/config-api.test.ts
git commit -m "feat(client): config editor API helpers (raw/validate/simulate/explain/save)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `ConfigEditor` (CodeMirror 6 wrapper)

**Files:**
- Create: `src/client/components/ConfigEditor.tsx`
- Test: `tests/client/config-editor.test.tsx`

- [ ] **Step 1: Write the failing test** (jsdom render; assert the editor host mounts + shows the doc)

```tsx
// tests/client/config-editor.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigEditor } from '../../src/client/components/ConfigEditor';

describe('ConfigEditor', () => {
  it('mounts and renders the initial document', () => {
    const { container } = render(
      <ConfigEditor value={'runs: []'} format={'yaml'} onChange={() => {}} />
    );
    expect(container.querySelector('.cm-editor')).toBeTruthy();
    expect(container.textContent).toContain('runs');
  });
});
```

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/client/config-editor.test.tsx` Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/client/components/ConfigEditor.tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { lintGutter } from '@codemirror/lint';
import { yamlSchema, jsonSchema } from 'codemirror-json-schema';
import appSchema from '../../schema/app.schema.json';

// Devvit may enforce a strict style-src; pass the nonce if the platform injects one.
const nonce = (document.querySelector('meta[property="csp-nonce"]') as HTMLMetaElement | null)?.content;

export function ConfigEditor({
  value, format, onChange,
}: { value: string; format: 'yaml' | 'json'; onChange: (text: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const schemaExt = format === 'json'
      ? jsonSchema(appSchema as object)
      : yamlSchema(appSchema as object);
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(), highlightActiveLine(), history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        format === 'json' ? json() : yaml(),
        schemaExt,
        lintGutter(),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
        ...(nonce ? [EditorView.cspNonce.of(nonce)] : []),
        EditorView.theme({ '&': { height: '100%', fontSize: '13px' }, '.cm-scroller': { fontFamily: 'var(--cm-mono, monospace)' } }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => { view.current?.destroy(); view.current = null; };
    // Re-init on format switch only; live value changes flow through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  return <div ref={host} className="cm-host h-full w-full overflow-hidden" />;
}
```

NOTE: confirm `codemirror-json-schema` exports `yamlSchema` + `jsonSchema` at the installed version (per its README); if the names differ, adjust the import. They each return a CM6 extension wiring schema completion + hover + lint.

- [ ] **Step 4: Run + commit**

Run: `npm test -- tests/client/config-editor.test.tsx && npm run type-check`
```bash
git add src/client/components/ConfigEditor.tsx tests/client/config-editor.test.tsx
git commit -m "feat(client): CodeMirror 6 ConfigEditor with schema hints + lint" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: `ConfigWorkbench` + ActionBar button + App wiring

**Files:**
- Create: `src/client/components/ConfigWorkbench.tsx`
- Modify: `src/client/components/ActionBar.tsx`, `src/client/App.tsx`
- Test: `tests/client/config-workbench.test.tsx`

- [ ] **Step 1: Write the failing test** (mock the api helpers; render workbench; assert load + Save call)

```tsx
// tests/client/config-workbench.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const fetchConfigRawSafe = vi.fn();
const saveConfigSafe = vi.fn();
const validateConfigSafe = vi.fn();
vi.mock('../../src/client/lib/api', () => ({
  fetchConfigRawSafe: () => fetchConfigRawSafe(),
  saveConfigSafe: (...a: unknown[]) => saveConfigSafe(...a),
  validateConfigSafe: (...a: unknown[]) => validateConfigSafe(...a),
  simulateLiveSafe: vi.fn(async () => ({ ok: true, empty: false, data: { totalSamples: 0, firedCount: 0, erroredCount: 0 } })),
  explainConfigSafe: vi.fn(async () => ({ ok: true, empty: false, data: '' })),
}));
vi.mock('@devvit/web/client', () => ({ requestExpandedMode: vi.fn() }));

import { ConfigWorkbench } from '../../src/client/components/ConfigWorkbench';

beforeEach(() => {
  fetchConfigRawSafe.mockResolvedValue({ ok: true, empty: false, data: { content: 'runs: []', revisionId: 'rev-1', isDefaultTemplate: false } });
  validateConfigSafe.mockResolvedValue({ ok: true });
  saveConfigSafe.mockResolvedValue({ ok: true, empty: false, data: { rev: 1, ruleCount: 0 } });
});

describe('ConfigWorkbench', () => {
  it('loads config then saves', async () => {
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    const save = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(save);
    await waitFor(() => expect(saveConfigSafe).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/client/config-workbench.test.tsx` Expected: FAIL.

- [ ] **Step 3: Implement `ConfigWorkbench`**

```tsx
// src/client/components/ConfigWorkbench.tsx
import { useEffect, useRef, useState } from 'react';
import { ConfigEditor } from './ConfigEditor';
import { PreviewPane } from './PreviewPane';
import { fetchConfigRawSafe, validateConfigSafe, saveConfigSafe } from '../lib/api';

function detectFormat(text: string): 'yaml' | 'json' {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[') ? 'json' : 'yaml';
}

export function ConfigWorkbench({ subreddit, onClose }: { subreddit: string; onClose: () => void }) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');
  const [baseRev, setBaseRev] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string>('Loading...');
  const [saving, setSaving] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetchConfigRawSafe();
      if (r.ok && !r.empty) {
        setText(r.data.content); setFormat(detectFormat(r.data.content));
        setBaseRev(r.data.revisionId);
        setStatus(r.data.isDefaultTemplate ? 'New config (template)' : 'Loaded');
      } else {
        setStatus(r.ok ? 'Empty' : `Load failed: ${r.error}`);
      }
    })();
  }, []);

  function onChange(next: string) {
    setText(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const v = await validateConfigSafe(next);
      setValid(v.ok);
    }, 600);
  }

  async function onSave() {
    if (saving || valid === false) return;
    setSaving(true); setStatus('Saving...');
    const r = await saveConfigSafe(text, baseRev);
    if (r.ok && !r.empty) { setStatus(`Saved, ${r.data.ruleCount} rules live (rev ${r.data.rev})`); }
    else { setStatus(r.ok ? 'Saved' : `Save failed: ${r.error}`); }
    setSaving(false);
  }

  return (
    <div className="cm-workbench fixed inset-0 z-50 flex flex-col bg-ink-900">
      <header className="flex items-center justify-between px-4 py-2 border-b border-line">
        <span className="text-sm">Edit config: r/{subreddit}</span>
        <div className="flex items-center gap-3 text-xs">
          <span>{valid === false ? 'invalid' : valid === true ? 'valid' : ''}</span>
          <button onClick={onSave} disabled={saving || valid === false} className="px-2 py-1 rounded bg-signal-ok/20">Save</button>
          <button onClick={onClose} aria-label="Close editor">Close</button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 border-r border-line"><ConfigEditor value={text} format={format} onChange={onChange} /></div>
        <div className="w-[40%] min-w-0"><PreviewPane text={text} /></div>
      </div>
      <footer className="px-4 py-1 text-[11px] text-bone-300 border-t border-line">{status}</footer>
    </div>
  );
}
```

- [ ] **Step 4: ActionBar button.** In `src/client/components/ActionBar.tsx`, add `onEditConfig: () => void` to the props type and render a button in the left group (next to Reload), using the lucide `FileEdit` icon:

```tsx
<button onClick={onEditConfig} className="group inline-flex items-center gap-1.5 text-[11px] text-bone-200 hover:text-bone-50 transition-colors">
  <FileEdit size={12} strokeWidth={1.8} />
  <span className="tracking-wide">Edit config</span>
</button>
```

Add `FileEdit` to the `lucide-react` import line.

- [ ] **Step 5: App wiring.** In `src/client/App.tsx`:
  - Add `const [editorOpen, setEditorOpen] = useState(false);` with the other state.
  - Add a lazy import at top: `const ConfigWorkbench = lazy(() => import('./components/ConfigWorkbench').then(m => ({ default: m.ConfigWorkbench })));` and `import { lazy, Suspense } from 'react';`
  - Pass `onEditConfig={() => setEditorOpen(true)}` to `<ActionBar .../>`.
  - In the Escape keyboard shortcut handler, add `setEditorOpen(false);`.
  - Render near the other overlays:
    ```tsx
    {editorOpen && (
      <Suspense fallback={null}>
        <ConfigWorkbench subreddit={subreddit} onClose={() => setEditorOpen(false)} />
      </Suspense>
    )}
    ```

- [ ] **Step 6: Run tests + type-check + lint + build**

Run: `npm test -- tests/client/config-workbench.test.tsx && npm run type-check && npm run lint && npm run build`
Expected: PASS; build emits a separate lazy chunk for the workbench.

- [ ] **Step 7: Commit**

```bash
git add src/client/components/ConfigWorkbench.tsx src/client/components/ActionBar.tsx src/client/App.tsx tests/client/config-workbench.test.tsx
git commit -m "feat(client): ConfigWorkbench + Edit config entry (lazy-loaded)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

NOTE: `requestExpandedMode` from `@devvit/web/client` must be called from the click handler (a trusted event) to satisfy Devvit. Wire it inside `ActionBar`'s `onEditConfig` click (call `requestExpandedMode(e, 'default')` then `onEditConfig()`); pass the event through. Confirm the exact arg shape against the Devvit docs during Task 18 verification.

---

## PHASE 3 — Schema hints

### Task 12: Add `description` fields to the schema

**Files:**
- Create: `scripts/gen-schema-descriptions.mjs`
- Modify: `src/schema/app.schema.json`
- Test: `tests/schema/descriptions.test.ts`

`app.schema.json` has no `description` fields, so hover docs are empty. The JSDoc on the interfaces in `src/shared/types.ts` is the source of truth.

- [ ] **Step 1: Write the failing test**

```ts
// tests/schema/descriptions.test.ts
import { describe, it, expect } from 'vitest';
import schema from '../../src/schema/app.schema.json';

describe('schema descriptions', () => {
  it('documents the top-level runs property', () => {
    const runs = (schema as any).properties?.runs;
    expect(typeof runs?.description).toBe('string');
    expect(runs.description.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, expect fail.** Run: `npm test -- tests/schema/descriptions.test.ts` Expected: FAIL.

- [ ] **Step 3: Implement** — hand-add `description` to the common properties for v1 (root `runs`, and within each rule/action definition the high-traffic fields: `kind`, `name`, `checks`, `rules`, `actions`, `authorIs`, `itemIs`). Keep the text short and copied from the matching JSDoc in `src/shared/types.ts`. Example edit to `app.schema.json`:

```json
"runs": {
  "type": "array",
  "description": "Ordered list of runs. Each run groups checks evaluated against new posts and comments.",
  "items": { "$ref": "#/definitions/Run" }
}
```

Also create `scripts/gen-schema-descriptions.mjs` that reads `src/shared/types.ts`, extracts each interface property's leading JSDoc, and writes matching `description` fields, so future schema changes can regenerate rather than hand-edit. Add an npm script `"gen:schema-docs": "node scripts/gen-schema-descriptions.mjs"`. (For v1 the hand-added descriptions are the shipping artifact; the generator is the maintenance path.)

- [ ] **Step 4: Run + commit**

Run: `npm test -- tests/schema/descriptions.test.ts && npm run type-check`
```bash
git add src/schema/app.schema.json scripts/gen-schema-descriptions.mjs package.json tests/schema/descriptions.test.ts
git commit -m "feat(schema): add property descriptions for editor hover docs" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 4 — Preview pane

### Task 13: `PreviewPane` shell + Explain tab

**Files:**
- Create: `src/client/components/PreviewPane.tsx`
- Test: `tests/client/preview-pane.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/client/preview-pane.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
vi.mock('../../src/client/lib/api', () => ({
  simulateLiveSafe: vi.fn(async () => ({ ok: true, empty: false, data: { totalSamples: 25, firedCount: 3, erroredCount: 0 } })),
  explainConfigSafe: vi.fn(async () => ({ ok: true, empty: false, data: 'Explanation text' })),
}));
import { PreviewPane } from '../../src/client/components/PreviewPane';

describe('PreviewPane', () => {
  it('shows the three tabs', () => {
    render(<PreviewPane text={'runs: []'} />);
    expect(screen.getByRole('tab', { name: /impact/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /explain/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /diff/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** (tabs; Impact debounced; Explain on demand; Diff placeholder wired in Task 14)

```tsx
// src/client/components/PreviewPane.tsx
import { useEffect, useRef, useState } from 'react';
import { simulateLiveSafe, explainConfigSafe } from '../lib/api';

type Tab = 'impact' | 'explain' | 'diff';

export function PreviewPane({ text }: { text: string }) {
  const [tab, setTab] = useState<Tab>('impact');
  const [impact, setImpact] = useState<string>('edit to preview');
  const [explanation, setExplanation] = useState<string>('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tab !== 'impact') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const r = await simulateLiveSafe(text);
      setImpact(r.ok && !r.empty ? `Would fire on ${r.data.firedCount}/${r.data.totalSamples} recent items` : r.ok ? 'no result' : r.error);
    }, 700);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [text, tab]);

  async function runExplain() {
    setExplanation('...');
    const r = await explainConfigSafe(text);
    setExplanation(r.ok && !r.empty ? r.data : `Explain failed: ${r.ok ? 'empty' : r.error}`);
  }

  return (
    <div className="flex flex-col h-full">
      <div role="tablist" className="flex gap-2 px-3 py-2 border-b border-line text-xs">
        <button role="tab" aria-selected={tab === 'impact'} onClick={() => setTab('impact')}>Impact</button>
        <button role="tab" aria-selected={tab === 'explain'} onClick={() => setTab('explain')}>Explain</button>
        <button role="tab" aria-selected={tab === 'diff'} onClick={() => setTab('diff')}>Diff</button>
      </div>
      <div className="flex-1 overflow-auto p-3 text-xs">
        {tab === 'impact' && <p>{impact}</p>}
        {tab === 'explain' && (<div><button onClick={runExplain} className="mb-2 underline">Explain with AI</button><pre className="whitespace-pre-wrap">{explanation}</pre></div>)}
        {tab === 'diff' && <p className="text-bone-300">Diff vs current rev (Task 14).</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run + commit**

Run: `npm test -- tests/client/preview-pane.test.tsx && npm run type-check`
```bash
git add src/client/components/PreviewPane.tsx tests/client/preview-pane.test.tsx
git commit -m "feat(client): PreviewPane with live Impact + AI Explain tabs" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Diff tab (edited text vs current rev)

**Files:**
- Modify: `src/client/components/PreviewPane.tsx`
- Possibly modify: `src/client/components/ConfigDiffViewer.tsx` (export its LCS line-diff helper if not already exported)
- Test: `tests/client/preview-pane.test.tsx` (extend)

- [ ] **Step 1: Write the failing test** — assert the Diff tab renders changed lines when `text` differs from a `currentText` prop.

```tsx
it('diff tab shows changed lines', () => {
  render(<PreviewPane text={'runs: [a]'} currentText={'runs: []'} />);
  fireEvent.click(screen.getByRole('tab', { name: /diff/i }));
  expect(screen.getByText(/runs: \[a\]/)).toBeTruthy();
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** — add an optional `currentText?: string` prop to `PreviewPane`; in the diff tab, reuse the LCS line-diff helper from `ConfigDiffViewer.tsx` (export it from there if needed) to render added/removed lines between `currentText` and `text`. `ConfigWorkbench` passes `currentText` = the originally-loaded content.

- [ ] **Step 4: Wire `currentText` from `ConfigWorkbench`** — store the loaded content in a ref (`loadedText`) and pass it: `<PreviewPane text={text} currentText={loadedText} />`.

- [ ] **Step 5: Run + commit**

Run: `npm test -- tests/client/preview-pane.test.tsx && npm run type-check`
```bash
git add src/client/components/PreviewPane.tsx src/client/components/ConfigDiffViewer.tsx src/client/components/ConfigWorkbench.tsx tests/client/preview-pane.test.tsx
git commit -m "feat(client): Diff tab shows edited config vs current rev" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## PHASE 5 — Polish + verification

### Task 15: Conflict UX + format toggle + template seeding

**Files:** Modify `src/client/components/ConfigWorkbench.tsx`. Test: extend `tests/client/config-workbench.test.tsx`.

- [ ] **Step 1: Write failing tests** — (a) on a 409 save result, status shows a reload prompt and a "Reload" button appears; (b) a format toggle button switches `format` between yaml/json.

```tsx
it('shows a reload prompt on 409 conflict', async () => {
  saveConfigSafe.mockResolvedValue({ ok: false, error: 'The wiki changed since you opened the editor. Reload to merge.' });
  render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
  const save = await screen.findByRole('button', { name: /save/i });
  fireEvent.click(save);
  await waitFor(() => expect(screen.getByText(/wiki changed/i)).toBeTruthy());
  expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement** — add a `conflict` state set when `saveConfigSafe` returns an error containing "wiki changed"; render a Reload button that re-runs the loader; add a format toggle button in the header that flips `format` (the editor re-inits on format change per Task 10). Seed the template note when `isDefaultTemplate` is true.

- [ ] **Step 4: Run + commit**

```bash
git add src/client/components/ConfigWorkbench.tsx tests/client/config-workbench.test.tsx
git commit -m "feat(client): conflict-reload UX + format toggle + template seeding" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: E2E (Playwright, demo mode)

**Files:** Create `tests/e2e/config-editor.spec.ts` (mirror the existing E2E setup; serve via the dev mock server / built dashboard).

- [ ] **Step 1: Write the E2E test**

```ts
// tests/e2e/config-editor.spec.ts
import { test, expect } from '@playwright/test';

test('open editor, edit, see impact, save', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/?demo=1');
  await page.getByRole('button', { name: /edit config/i }).click();
  await expect(page.locator('.cm-editor')).toBeVisible();
  await page.locator('.cm-content').click();
  await page.keyboard.type('\nruns: []');
  await page.getByRole('tab', { name: /impact/i }).click();
  await expect(page.getByText(/would fire on/i)).toBeVisible();
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText(/saved|rules live/i)).toBeVisible();
});
```

NOTE: demo mode must back the new endpoints. Add `?demo=1` handling to `/api/config/raw` (return a sample YAML config), `/simulate-live` (return a canned `{ ok:true, totalSamples:25, firedCount:3 }`), and `/save` (return `{ ok:true, rev:1, ruleCount:1 }` without writing) so the dashboard runs end-to-end with no live install. Add these demo branches to `configEditor.ts` and a quick unit assertion for each.

- [ ] **Step 2: Run** — Run: `npm run build && npx playwright test tests/e2e/config-editor.spec.ts` (start the mock server per the existing E2E harness). Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/config-editor.spec.ts src/routes/configEditor.ts
git commit -m "test(e2e): config editor open/edit/impact/save happy path (demo)" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Devvit build-phase verification (playtest)

**Files:** none (operational). Record results in the PR description.

- [ ] **Step 1:** `npx devvit playtest <test-sub>`; open the dashboard custom post; click Edit config. Confirm: (a) the CM6 editor renders (no blank pane), (b) the browser console shows no CSP violation; if a `style-src` violation appears, confirm the `meta[property="csp-nonce"]` exists and is read by `ConfigEditor` (if Devvit injects the nonce under a different selector, update the selector).
- [ ] **Step 2:** Type a known-bad config; confirm inline lint squiggles + Save disabled. Type a valid config; confirm Impact shows a fire-rate.
- [ ] **Step 3:** Click Save; confirm `reddit.updateWikiPage` succeeds (open the wiki page and verify the new content + the "Edited via ContextMod Observatory" revision reason). If it 403s, the app account lacks wiki-edit on the sub: confirm the app's moderator permissions include wiki, or document the required permission in the README.
- [ ] **Step 4:** Re-check the dashboard initial JS chunk size (`npm run build` output) is unchanged from before this feature; confirm the workbench is a separate lazy chunk.
- [ ] **Step 5: Commit** any selector/permission fixes found, then open the PR.

```bash
git commit -am "fix(client): align CSP nonce selector with Devvit webview" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (run before handoff)

- Spec coverage: load (T3), validate (T4), live impact (T2+T5+T13/14), AI explain (T1+T6+T13), diff (T14), save-back with validation gate + optimistic lock (T7), editor + schema hints (T8-T12), surface + lazy-load (T11), conflict/format/template polish (T15), tests + e2e (per task + T16), build-phase verification (T17). All spec sections map to a task.
- Placeholder scan: every code step has real code; the two `NOTE` items (confirm `publish` return; confirm `codemirror-json-schema` export names) are explicit verification steps with a fallback, not blanks.
- Type consistency: `ConfigRaw`/`SaveResult`/`SimResult` defined in T9 are used consistently in T9-T15; `ApiResult<T>` matches the existing client convention; endpoint paths (`/api/config/raw|validate|simulate-live|explain|save`) are consistent across server (T3-T7) and client (T9).

---

## Open verification items carried into build

1. `publish(config, sub)` return value (rev number vs void) — T7 NOTE.
2. `codemirror-json-schema` export names at the installed version — T10 NOTE.
3. Devvit `requestExpandedMode` exact signature — T11 NOTE.
4. Devvit webview CSP `style-src` nonce selector — T17.
5. App account wiki-edit permission — T17.
