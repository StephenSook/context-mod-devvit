import { describe, it, expect } from 'vitest';
import { render, escapeMarkdown, type TemplateContext } from '../../src/core/template';
import type { Item, Author } from '../../src/shared/types';

function makeCtx(): TemplateContext {
  const item: Item & { titleSafe: string; bodySafe: string } = {
    id: 't3_abc',
    title: 'free crypto giveaway scam',
    titleSafe: 'free crypto giveaway scam',
    body: '',
    bodySafe: '',
    url: 'https://example.com',
    author: 'someUser',
    age: 60,
    score: 1,
    isSelf: false,
    over18: false,
    removed: false,
    approved: false,
    locked: false,
    stickied: false,
    linkFlairText: null,
  };
  const author: Author & { nameSafe: string } = {
    name: 'someUser',
    nameSafe: 'someUser',
    id: 't2_zzz',
    age: 86_400,
    linkKarma: 0,
    commentKarma: 0,
    flairText: null,
    isMod: false,
    isContributor: false,
    verified: false,
    shadowBanned: false,
  };
  return { item, author };
}

describe('render', () => {
  it('substitutes author.name and item.title', () => {
    const out = render(
      'Hello {{author.name}}, your post {{item.title}} was removed',
      makeCtx(),
    );
    expect(out).toBe('Hello someUser, your post free crypto giveaway scam was removed');
  });

  it('does NOT HTML-escape ampersands or apostrophes (Reddit is markdown, not HTML)', () => {
    const ctx = makeCtx();
    ctx.author.name = "Joe's & Co";
    const out = render('Hi {{author.name}}', ctx);
    expect(out).toBe("Hi Joe's & Co");
  });

  // Codex H4 2026-05-16: Mustache.escape now defaults to escapeMarkdown so
  // that mods using `{{item.title}}` (instead of `{{item.titleSafe}}`)
  // can't be exploited via u/-pings, r/-pings, or link-injection.
  it('Codex H4 — defangs u/-pings in raw {{author.name}} (default escape now escapeMarkdown)', () => {
    const ctx = makeCtx();
    ctx.author.name = 'u/evilbot';
    const out = render('Hello {{author.name}}', ctx);
    expect(out).toBe('Hello u\\/evilbot');
  });

  it('Codex H4 — neutralizes link injection in raw {{item.title}}', () => {
    const ctx = makeCtx();
    ctx.item.title = '[click](javascript:alert(1))';
    const out = render('Title: {{item.title}}', ctx);
    expect(out).toContain('\\[click\\]');
    expect(out).toContain('\\(javascript');
  });

  it('Codex H4 — triple-stash {{{ }}} bypass for explicitly-raw moderator-authored fields', () => {
    const ctx = makeCtx();
    ctx.item.title = 'u/somebody'; // would normally be defanged
    const out = render('Raw: {{{item.title}}}', ctx);
    expect(out).toBe('Raw: u/somebody');
  });
});

describe('escapeMarkdown', () => {
  it('escapes the markdown-active char set', () => {
    expect(escapeMarkdown('*bold* _italic_ `code`')).toBe('\\*bold\\* \\_italic\\_ \\`code\\`');
  });

  it('defangs u/ pings on a word boundary', () => {
    expect(escapeMarkdown('u/spammer pinged you')).toBe('u\\/spammer pinged you');
  });

  it('defangs r/ subreddit links on a word boundary', () => {
    expect(escapeMarkdown('check r/funny later')).toBe('check r\\/funny later');
  });

  it('does NOT mangle `u/` inside URLs (the \\b anchor regression test)', () => {
    // The pre-fix /u\//gi mangled `https://youtu.be/...` into `yo*u\/*tu` —
    // the bug was inserting a `\/` mid-word. The fix: `\b` anchors u/ to a
    // word boundary so it only matches at the start of `u/name` tokens.
    //
    // The general regex still escapes `.`, so `youtu.be` becomes `youtu\.be`.
    // Per plan line 794: Reddit's auto-linker still resolves `youtu\.be`, so
    // the goal is "Reddit renders the URL correctly," NOT byte-equality.
    const out = escapeMarkdown('https://youtu.be/abc');
    // The 'youtu' token is intact (not mangled mid-word) and `be/abc` follows
    // — only the dot is escaped, the u/ injection bug does NOT occur.
    expect(out).toContain('youtu');
    expect(out).not.toContain('yo\\u\\/tu');
    expect(out).toContain('be');
    expect(out).toContain('/abc');
  });

  it('neutralizes link injection — brackets + parens escaped', () => {
    const out = escapeMarkdown('[click](javascript:alert(1))');
    expect(out).toContain('\\[');
    expect(out).toContain('\\]');
    expect(out).toContain('\\(');
    expect(out).toContain('\\)');
  });

  it('returns empty string for empty input without crashing', () => {
    expect(escapeMarkdown('')).toBe('');
  });

  // Phase 2.5 Step 2.5.3 — the four mandatory fixtures from the plan.
  // These pin the contract; in-playtest renderer verification is a separate
  // manual gate (paste each into a comment in r/cm_devvit_test, confirm Reddit
  // renders the URL auto-link / defanged ping / literal brackets).
  describe('Phase 2.5 mandatory fixtures', () => {
    it('fixture 1 — YouTube URL: only the dot is escaped; auto-link survives', () => {
      expect(escapeMarkdown('https://youtu.be/abc')).toBe('https://youtu\\.be/abc');
    });
    it('fixture 2 — user ping is defanged', () => {
      expect(escapeMarkdown('u/spammer pinged you')).toBe('u\\/spammer pinged you');
    });
    it('fixture 3 — subreddit ping is defanged', () => {
      expect(escapeMarkdown('check r/funny')).toBe('check r\\/funny');
    });
    it('fixture 4 — link injection neutralized (brackets + parens both escaped)', () => {
      const out = escapeMarkdown('[click](javascript:alert(1))');
      expect(out).toBe('\\[click\\]\\(javascript:alert\\(1\\)\\)');
    });
  });
});
