/**
 * Engine-internal types. The `Item` and `Author` shapes are the strict, fully
 * defaulted view every rule reads — the V2 trigger payload (every field
 * optional) is normalized into these shapes by `src/shared/normalize.ts`.
 *
 * Output-side contracts (RuleResult / CheckResult / RunResult / ActionResult
 * / ActionContext) are locked here so Step 2.1 dispatcher + Step 2.3
 * handleActivity + Step 3.5 recordEvent all type-check end-to-end.
 */

// AE Polish #81: type-design-analyzer #2 — branded Reddit thing-id.
// Reddit's fullname format is `t<type>_<base36>`; rule engine only sees
// posts (t3_) and comments (t1_), so the union is closed. Branding the
// shape at the type system level lets action-dispatch sites (lock.ts,
// report.ts, distinguish.ts) narrow via `isPostId` / `isCommentId`
// predicates and drop their ad-hoc `as` casts. The pre-Polish
// "unexpected id prefix" runtime throws in distinguish.ts + lock.ts
// became provably unreachable under the brand — they were deleted
// (TS proves the union exhaustively narrowed).
//
// Construction-site validation lives in `src/shared/normalize.ts` —
// invalid IDs throw BadTriggerIdError; handleActivity's per-run
// try/catch records that as a (run-error) event so the dashboard sees
// the failure instead of the activity silently disappearing.
export type ThingId = `t3_${string}` | `t1_${string}`;
export type PostId = `t3_${string}`;
export type CommentId = `t1_${string}`;

export function isThingId(s: string): s is ThingId {
  return s.startsWith('t3_') || s.startsWith('t1_');
}

// Per-arm narrowing. TS 4.5+'s template-literal-union narrowing via
// startsWith doesn't always trigger automatically on a wide union; an
// explicit `is`-predicate guard reliably narrows ThingId → PostId/
// CommentId at action-dispatch sites (lock / report / distinguish).
export function isPostId(id: ThingId): id is PostId {
  return id.startsWith('t3_');
}
export function isCommentId(id: ThingId): id is CommentId {
  return id.startsWith('t1_');
}

// Inputs — Item & Author (post-normalization, no `undefined` fields).
export interface Item {
  id: ThingId; // t3_xxx (post) or t1_xxx (comment) — branded; constructed via normalize.ts
  title: string; // empty for comments
  body: string; // selftext for posts, body for comments
  url: string;
  author: string; // username
  age: number; // seconds since creation
  score: number;
  isSelf: boolean;
  over18: boolean;
  removed: boolean;
  approved: boolean;
  locked: boolean;
  stickied: boolean;
  linkFlairText: string | null;
  depth?: number; // comments only
  op?: boolean; // comment was authored by OP
  /**
   * Phase 4.7 — preview-variant image URL for ImageRepostRule. Populated by
   * normalize.ts when the V2 payload carries `post.preview.images[].resolutions[]`.
   * Selected variant is the largest whose width ≤ 640 (Vinh's optimal RAM
   * zone — 0-2/256 bit hash drift vs full-res, <5MB peak vs 180MB for 4K).
   * Undefined when post is not an image / has no preview.
   */
  imageUrl?: string;
}

export interface Author {
  name: string;
  id: string;
  age: number; // seconds since account creation
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
  nameIn?: string[]; // exact-match usernames
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
  titleMatches?: string; // regex source
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
  name?: string; // optional for inline rules
  pattern: string; // regex source
  flags?: string; // 'i' / 'm' / 'mi' / etc.
  target?: RegexTarget; // default 'title'
}

export interface AuthorRule {
  kind: 'author';
  name?: string;
  filter: AuthorFilter; // reuses the filter shape
}

/**
 * RuleSetRule combinators:
 *   - AND — triggers only when ALL nested rules trigger
 *   - OR  — triggers when ANY nested rule triggers
 *   - NOT — triggers when NONE of the nested rules trigger (AE Pull-Forward
 *           #3, upstream FoxxMD parity). Use case: "catch new accounts EXCEPT
 *           trusted contributors" — wrap the trust check in NOT inside an
 *           outer AND combinator. Equivalent to De Morgan'd NAND of all
 *           sub-rules. Empty NOT vacuously triggers (no rules to negate).
 */
export interface RuleSetRule {
  kind: 'ruleset';
  name?: string;
  combinator: 'AND' | 'OR' | 'NOT';
  rules: Rule[];
}

export interface NamedRuleRef {
  kind: 'named'; // alias to a top-level namedRules[name]
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
  windowDays?: number; // default 30
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
  postCountLt?: number; // recent posts seen < N
  postCountGt?: number;
  commentCountLt?: number;
  commentCountGt?: number;
  linkKarmaLt?: number;
  linkKarmaGt?: number;
  commentKarmaLt?: number;
  commentKarmaGt?: number;
  /**
   * AE Pull-Forward #9 — upstream FoxxMD parity. Count only posts/comments
   * within the last N seconds. Defaults to undefined = unlimited (use all
   * cached entries up to FETCH_LIMIT=100). Useful for "fresh activity" rules
   * like "5+ comments in the last hour" — without windowSec, the 1h
   * authorHistory cache TTL is the only window control.
   */
  windowSec?: number;
}

/**
 * AttributionRule (Step 4.4) — fraction of an author's recent posts that
 * link to a configured set of domains. Catches drive-by self-promo even
 * when each individual post looks fine.
 */
export interface AttributionRule {
  kind: 'attribution';
  name?: string;
  domains: string[]; // case-insensitive substring match against post.domain
  domainPercent: number; // 0..100 — trigger when matching% >= this
  minPosts?: number; // default 5 — don't trigger on tiny samples
  /** AE Pull-Forward #9 — only count posts within the last N seconds. Defaults unlimited. */
  windowSec?: number;
}

/**
 * RecentActivityRule (Step 4.5) — per-target-sub thresholds on the cached
 * listings. Catches "this user has 50 comments in r/spam this week" without
 * a separate Reddit query.
 */
export interface RecentActivityRule {
  kind: 'recentActivity';
  name?: string;
  subreddits: string[]; // case-insensitive
  postCountGt?: number;
  commentCountGt?: number;
  /** AE Pull-Forward #9 — only count entries within the last N seconds. Defaults unlimited. */
  windowSec?: number;
}

/**
 * Phase 4.7 — Image-repost detection via perceptual blockhash (gated on
 * 0.10 spike). Vinh's spike landed clean GO 2026-05-18 (commits 00feca5 +
 * 19e94f0): pure-JS pipeline (upng-js + jpeg-js + blockhash-core) decodes
 * preview.redd.it 320-640px variants in <1s + <5MB peak RAM + 0-2/256 bit
 * fidelity vs full-res (within the 5-8 bit "same image" threshold).
 *
 * Triggers when a new image post's perceptual hash matches a recently-seen
 * hash from the same sub within `hammingThreshold` bits. Sub-scoped store;
 * fail-OPEN on decode/Reddit/Redis errors (image-repost is a soft signal,
 * not a safety gate — same fail-open posture as RepostRule).
 */
export interface ImageRepostRule {
  kind: 'imageRepost';
  name?: string;
  /** Default 8 — within upstream CM's "same image" threshold (5-8/256 bits). */
  hammingThreshold?: number;
  /** Default 30 — match window in days. Older hashes are TTL-evicted. */
  windowDays?: number;
}

export type Rule =
  | RegexRule
  | AuthorRule
  | RuleSetRule
  | NamedRuleRef
  | RepostRule
  | HistoryRule
  | AttributionRule
  | RecentActivityRule
  | ImageRepostRule;

// Action shapes — runtime dispatch lives in src/actions/*.
export interface RemoveAction {
  kind: 'remove';
  isSpam?: boolean;
  dryRun?: boolean;
}
export interface ApproveAction {
  kind: 'approve';
  dryRun?: boolean;
}
export interface CommentAction {
  kind: 'comment';
  template: string;
  dryRun?: boolean;
}
export interface LockAction {
  kind: 'lock';
  dryRun?: boolean;
}
export interface ReportAction {
  kind: 'report';
  reason: string;
  dryRun?: boolean;
}
export interface BanAction {
  kind: 'ban';
  duration?: number; // 0 = permanent
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
/**
 * AE Pull-Forward — DistinguishAction (upstream FoxxMD parity). Marks the
 * target post or comment as moderator-distinguished (the green [M] tag on
 * Reddit). Most commonly applied alongside a `comment` action so the bot's
 * reply visibly reads as a moderator action instead of a regular user post.
 * Sticky-comment variant via `sticky: true` (post comments only).
 */
export interface DistinguishAction {
  kind: 'distinguish';
  /** Default true. Sticky pins the comment to the top of the thread (post-level only). */
  sticky?: boolean;
  dryRun?: boolean;
}

export type Action =
  | RemoveAction
  | ApproveAction
  | CommentAction
  | LockAction
  | ReportAction
  | BanAction
  | UserFlairAction
  | DistinguishAction;

// AE Polish #66: type-design-analyzer top-1 fix — single source of truth
// for action kinds. Before this, src/client/lib/types.ts hand-mirrored
// the union as `ActionKind = 'remove' | 'approve' | ...` and drift was
// caught only by manual review (Polish #53 added 'distinguish' to the
// client side AFTER it had shipped server-side). Derive once from the
// server-side Action union; importing this from the client makes the
// drift class structurally impossible.
export type ActionKind = Action['kind'];

export type CheckCombinator = 'AND' | 'OR' | 'NOT';
export type PostBehavior = 'next' | 'stop' | { goto: string };

export interface Check {
  name: string;
  combinator: CheckCombinator;
  rules: Rule[];
  filters?: FilterSpec;
  actions?: Action[]; // fired when the check triggers; the run
  // collects these in order on a triggered run.
  postBehavior?: PostBehavior; // default 'next'
  // Upstream ContextMod compatibility (2026-06-09, SampleOfNone feedback).
  // `condition` (AND/OR) and check-level `itemIs`/`authorIs` are normalized
  // into `combinator`/`filters` at parse time (see config.ts); these three
  // pass through and are honored by the engine (runCheck.ts).
  enable?: boolean; // when false the check is skipped entirely (default true)
  description?: string; // cosmetic; accepted and ignored by the engine
  kind?: 'submission' | 'comment'; // scope to one item type (default: both)
}

export interface Run {
  name: string;
  checks: Check[];
}

export interface AppConfig {
  runs: Run[];
  namedRules?: Record<string, Rule>;
  dryRun?: boolean; // global dry-run flag (Phase 2.5)
  needsAuthorEnrichment?: boolean; // set at parse time by inspecting rule kinds
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
  actions: Action[]; // empty when triggered = false
}

// AE Polish #96: type-design-analyzer #3 — RunResult as a tagged
// discriminated union. Pre-Polish, three correlated optional fields
// (`terminated`, `lastCheckName`, `missingGotoTarget`) co-existed on
// one interface, so the type system permitted invalid states like
// `{ terminated: 'goto-missing', lastCheckName: undefined }` or
// `{ terminated: 'iteration-limit', missingGotoTarget: 'foo' }`.
// Tagged sub-union encodes the correlations:
//   - terminated=undefined ⇒ no other termination fields
//   - terminated='iteration-limit' ⇒ lastCheckName required, no missingGotoTarget
//   - terminated='goto-missing' ⇒ BOTH lastCheckName AND missingGotoTarget required
// Producers (runRun) and consumers (handleActivity termination logger)
// get exhaustive TS narrowing for free.
export type RunResultBase = {
  triggered: boolean;
  checkName: string;
  actions: Action[];
};
export type RunResultActive = RunResultBase & { terminated?: undefined };
export type RunResultIterationLimit = RunResultBase & {
  terminated: 'iteration-limit';
  lastCheckName: string;
};
export type RunResultGotoMissing = RunResultBase & {
  terminated: 'goto-missing';
  lastCheckName: string;
  missingGotoTarget: string;
};
export type RunResult = RunResultActive | RunResultIterationLimit | RunResultGotoMissing;

export interface ActionResult {
  status: 'ok' | 'skipped-locked' | 'dry-run' | 'error';
  // AE Polish #70: type-design-analyzer top-5 fix — narrow from
  // `string` to `ActionKind` (= Action['kind']). Same drift-elimination
  // motive as Polish #66 (deriving client ActionKind from server). When
  // a new Action variant lands (e.g. an unfair-mute pull-forward), the
  // ActionResult.kind field automatically accepts the new literal AND
  // refuses any unrelated string — eliminates a class of "kind got
  // misspelled in a result-emitting site" bugs that the prior
  // `kind: string` would silently swallow.
  kind: ActionKind;
  wouldHaveCalled?: string; // populated when status === 'dry-run'
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
  /**
   * AE CRITICAL #7: bypass the reserveAction/commitAction idempotency
   * primitives. Set TRUE only by the mod-menu dryRunActivity sibling so
   * a mod hitting "Test rules on this item" multiple times sees the full
   * eval trace each time (the production path needs idempotency to
   * survive Devvit retries; the mod-menu sibling has no retry concern +
   * needs repeatability). FALSE / undefined = default production path.
   */
  bypassIdempotency?: boolean;
}
