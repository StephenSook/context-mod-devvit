/**
 * Engine-internal types. The `Item` and `Author` shapes are the strict, fully
 * defaulted view every rule reads — the V2 trigger payload (every field
 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
 *
 * Output-side contracts (RuleResult / CheckResult / RunResult / ActionResult
 * / ActionContext) are locked here so Step 2.1 dispatcher + Step 2.3
 * handleActivity + Step 3.5 recordEvent all type-check end-to-end.
 */

// ---------------------------------------------------------------------------
// Inputs — Item & Author (post-normalization, no `undefined` fields)
// ---------------------------------------------------------------------------

export interface Item {
  id: string;            // t3_xxx (post) or t1_xxx (comment)
  title: string;         // empty for comments
  body: string;          // selftext for posts, body for comments
  url: string;
  author: string;        // username
  age: number;           // seconds since creation
  score: number;
  isSelf: boolean;
  over18: boolean;
  removed: boolean;
  approved: boolean;
  locked: boolean;
  stickied: boolean;
  linkFlairText: string | null;
  depth?: number;        // comments only
  op?: boolean;          // comment was authored by OP
}

export interface Author {
  name: string;
  id: string;
  age: number;           // seconds since account creation
  linkKarma: number;
  commentKarma: number;
  flairText: string | null;
  isMod: boolean;
  isContributor: boolean;
  verified: boolean;
  shadowBanned: boolean;
}

// ---------------------------------------------------------------------------
// Filters (Step 1.5) — predicates over Item / Author
// ---------------------------------------------------------------------------

export interface AuthorFilter {
  nameIn?: string[];                  // exact-match usernames
  nameNotIn?: string[];
  flairTextIn?: string[];
  flairTextNotIn?: string[];
  ageMinSec?: number;
  ageMaxSec?: number;
  linkKarmaMin?: number;
  linkKarmaMax?: number;
  commentKarmaMin?: number;
  commentKarmaMax?: number;
  isMod?: boolean;
  isContributor?: boolean;
  verified?: boolean;
  shadowBanned?: boolean;
}

export interface ItemFilter {
  over18?: boolean;
  locked?: boolean;
  stickied?: boolean;
  removed?: boolean;
  approved?: boolean;
  isSelf?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  linkFlairTextIn?: string[];
  linkFlairTextNotIn?: string[];
  titleMatches?: string;              // regex source
  bodyMatches?: string;
  urlMatches?: string;
}

export interface FilterSpec {
  authorIs?: AuthorFilter;
  itemIs?: ItemFilter;
}

// ---------------------------------------------------------------------------
// Config — rules, checks, runs, actions
// ---------------------------------------------------------------------------

export type RegexTarget = 'title' | 'body' | 'url';

export interface RegexRule {
  kind: 'regex';
  name?: string;                      // optional for inline rules
  pattern: string;                    // regex source
  flags?: string;                     // 'i' / 'm' / 'mi' / etc.
  target?: RegexTarget;               // default 'title'
}

export interface AuthorRule {
  kind: 'author';
  name?: string;
  filter: AuthorFilter;               // reuses the filter shape
}

export interface RuleSetRule {
  kind: 'ruleset';
  name?: string;
  combinator: 'AND' | 'OR';
  rules: Rule[];
}

export interface NamedRuleRef {
  kind: 'named';                      // alias to a top-level namedRules[name]
  name: string;
}

export type Rule = RegexRule | AuthorRule | RuleSetRule | NamedRuleRef;

// Actions — shape is shared with src/actions/* in Phase 2. Phase 1 only needs
// the type so RunResult.actions[] type-checks; runtime dispatch lands in 2.1.
export interface RemoveAction { kind: 'remove'; isSpam?: boolean; dryRun?: boolean; }
export interface ApproveAction { kind: 'approve'; dryRun?: boolean; }
export interface CommentAction { kind: 'comment'; template: string; dryRun?: boolean; }
export interface LockAction { kind: 'lock'; dryRun?: boolean; }
export interface ReportAction { kind: 'report'; reason: string; dryRun?: boolean; }
export interface BanAction {
  kind: 'ban';
  duration?: number;                  // 0 = permanent
  reason?: string;
  note?: string;
  message?: string;
  dryRun?: boolean;
}
export interface UserFlairAction {
  kind: 'userFlair';
  text?: string;
  cssClass?: string;
  dryRun?: boolean;
}

export type Action =
  | RemoveAction
  | ApproveAction
  | CommentAction
  | LockAction
  | ReportAction
  | BanAction
  | UserFlairAction;

export type CheckCombinator = 'AND' | 'OR';
export type PostBehavior = 'next' | 'stop' | { goto: string };

export interface Check {
  name: string;
  combinator: CheckCombinator;
  rules: Rule[];
  filters?: FilterSpec;
  actions?: Action[];                 // fired when the check triggers; the run
                                      // collects these in order on a triggered run.
  postBehavior?: PostBehavior;        // default 'next'
}

export interface Run {
  name: string;
  checks: Check[];
}

export interface AppConfig {
  runs: Run[];
  namedRules?: Record<string, Rule>;
  dryRun?: boolean;                   // global dry-run flag (Phase 2.5)
  needsAuthorEnrichment?: boolean;    // set at parse time by inspecting rule kinds
                                      // — gates the expensive getUserByUsername call
                                      // (Step 1.3 short-circuit, Council Software Lead).
}

// ---------------------------------------------------------------------------
// Engine output contracts (Council fix 2026-05-14 21:30, Software Lead)
// ---------------------------------------------------------------------------

export interface RuleResult {
  triggered: boolean;
}

export interface CheckResult {
  triggered: boolean;
  checkName: string;
  actions: Action[];                  // empty when triggered = false
}

export interface RunResult {
  triggered: boolean;
  checkName: string;
  actions: Action[];                  // actions to fire when triggered === true
  terminated?: 'iteration-limit';
  lastCheckName?: string;             // populated when terminated set
}

export interface ActionResult {
  status: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
  kind: string;
  wouldHaveCalled?: string;           // populated when status === 'dry-run'
}

// ActionContext.config is REQUIRED (Council 2026-05-14 23:00, Software Lead) —
// Phase 2.5's dry-run gate reads `ctx.config.dryRun`. Without `config` on this
// contract, the safety net silently evaluates undefined → false → every repost
// action would go live by default, the OPPOSITE of the claimed contract.
export interface ActionContext {
  item: Item;
  author: Author;
  subredditName: string;
  rev: number;
  config: AppConfig;
}
