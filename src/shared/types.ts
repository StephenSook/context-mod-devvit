/**
 * Engine-internal types. The `Item` and `Author` shapes are the strict, fully
 * defaulted view every rule reads — the V2 trigger payload (every field
 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
 *
 * Output-side contracts (RuleResult / CheckResult / RunResult / ActionResult
 * / ActionContext) are locked here so Step 2.1 dispatcher + Step 2.3
 * handleActivity + Step 3.5 recordEvent all type-check end-to-end.
 */

// Inputs — Item & Author (post-normalization, no `undefined` fields).
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
  // X2: set true when getUserByUsername threw — every enrichment field above
  // is a default (age=0, karma=0, isMod=false, etc) and any rule that reads
  // them is operating on bogus data. Dashboard surfaces this in drill-down
  // so mods can spot false-negative scenarios (a karma-min rule that should
  // have caught a spammer but defaulted them to 0 karma + passed through).
  enrichmentFailed?: boolean;
}

// Filters — predicates over Item / Author.
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

// Config — rules, checks, runs, actions.
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

/**
 * URL-dedupe repost rule (Phase 2.5, Council Expansionist).
 * Fingerprints `item.url` via FNV-1a64 and writes a 30-day Redis seen-marker;
 * triggers on the second submission of the same URL. Sub-scoped to avoid
 * cross-tenant pollution. SRE flagged: ship behind `dryRun` until mods watch
 * the dry-run feed for a few days — false positives nuke legitimate crossposts.
 */
export interface RepostRule {
  kind: 'repost';
  name?: string;
  windowDays?: number;                // default 30
}

/**
 * Phase 4 — history-based rules. All three read from the per-author cache in
 * `src/state/authorHistory.ts` (Step 4.2). The cache fans out one Reddit
 * listing fetch per author per hour; the rules below are pure predicates
 * over the cached payload.
 */

/**
 * HistoryRule (Step 4.3) — count + karma thresholds against the cached
 * post/comment listings. Karma comes off the enriched `Author` (already
 * fetched by `normalize.ts`); counts come from the cached listings.
 * Triggers when ANY supplied threshold is satisfied (OR semantics) so
 * mods can keep configs short.
 */
export interface HistoryRule {
  kind: 'history';
  name?: string;
  postCountLt?: number;               // recent posts seen < N
  postCountGt?: number;
  commentCountLt?: number;
  commentCountGt?: number;
  linkKarmaLt?: number;
  linkKarmaGt?: number;
  commentKarmaLt?: number;
  commentKarmaGt?: number;
}

/**
 * AttributionRule (Step 4.4) — fraction of an author's recent posts that
 * link to a configured set of domains. Catches drive-by self-promo even
 * when each individual post looks fine.
 */
export interface AttributionRule {
  kind: 'attribution';
  name?: string;
  domains: string[];                  // case-insensitive substring match against post.domain
  domainPercent: number;              // 0..100 — trigger when matching% >= this
  minPosts?: number;                  // default 5 — don't trigger on tiny samples
}

/**
 * RecentActivityRule (Step 4.5) — per-target-sub thresholds on the cached
 * listings. Catches "this user has 50 comments in r/spam this week" without
 * a separate Reddit query.
 */
export interface RecentActivityRule {
  kind: 'recentActivity';
  name?: string;
  subreddits: string[];               // case-insensitive
  postCountGt?: number;
  commentCountGt?: number;
}

export type Rule =
  | RegexRule
  | AuthorRule
  | RuleSetRule
  | NamedRuleRef
  | RepostRule
  | HistoryRule
  | AttributionRule
  | RecentActivityRule;

// Action shapes — runtime dispatch lives in src/actions/*.
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

// Engine output contracts.
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

// ActionContext.config is REQUIRED — the dry-run gate in runAction reads
// `ctx.config.dryRun`. Without it on this contract, the safety net evaluates
// undefined → false → every action goes live by default. Don't optionalize.
export interface ActionContext {
  item: Item;
  author: Author;
  subredditName: string;
  rev: number;
  config: AppConfig;
}
