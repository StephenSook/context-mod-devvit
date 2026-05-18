import { describe, it, expect } from 'vitest';
import {
  eventsToCsv,
  actionMarker,
  csvFilename,
  neutralizeCsvFormula,
} from '../../src/client/lib/csv-export';
import type { EventRecord } from '../../src/client/lib/types';

const UTF8_BOM = '﻿';
const CRLF = '\r\n';

const FIXTURE_TS = Date.UTC(2026, 4, 17, 1, 0, 0, 0); // 2026-05-17T01:00:00.000Z

const baseEvent: EventRecord = {
  ts: FIXTURE_TS,
  activityId: 't3_abc123',
  runName: 'spam-removal',
  checkName: 'crypto-giveaway',
  triggered: true,
  actions: [{ kind: 'remove', ok: true, status: 'ok' }],
};

describe('actionMarker', () => {
  it('returns no marker for status:ok', () => {
    expect(actionMarker('ok', true)).toBe('');
  });

  it('returns diamond marker for status:dry-run', () => {
    expect(actionMarker('dry-run', false)).toBe('◆');
  });

  it('returns prohibition marker for status:skipped-locked', () => {
    expect(actionMarker('skipped-locked', false)).toBe('⊘');
  });

  it('returns X marker for status:error', () => {
    expect(actionMarker('error', false)).toBe('✗');
  });

  it('back-compat: undefined status + ok:true → no marker', () => {
    expect(actionMarker(undefined, true)).toBe('');
  });

  it('back-compat: undefined status + ok:false → X marker', () => {
    expect(actionMarker(undefined, false)).toBe('✗');
  });
});

describe('eventsToCsv', () => {
  it('empty events array → BOM + header-only CSV', () => {
    const out = eventsToCsv([]);
    expect(out).toBe(UTF8_BOM + 'ts,activityId,runName,checkName,actions,allOk');
  });

  it('starts with UTF-8 BOM for Excel locale auto-detect', () => {
    const out = eventsToCsv([baseEvent]);
    expect(out.charAt(0)).toBe(UTF8_BOM);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it('joins rows with CRLF per RFC 4180', () => {
    const out = eventsToCsv([baseEvent, baseEvent]);
    const dataPortion = out.slice(UTF8_BOM.length);
    const lines = dataPortion.split(CRLF);
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('renders ISO timestamp + escaped fields', () => {
    const out = eventsToCsv([baseEvent]);
    expect(out).toContain('"2026-05-17T01:00:00.000Z"');
    expect(out).toContain('"t3_abc123"');
    expect(out).toContain('"spam-removal"');
    expect(out).toContain('"true"');
  });

  it('quotes fields containing commas', () => {
    const event: EventRecord = {
      ...baseEvent,
      checkName: 'rule, with comma',
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"rule, with comma"');
  });

  it('escapes double-quotes via doubling', () => {
    const event: EventRecord = {
      ...baseEvent,
      checkName: 'rule "quoted"',
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"rule ""quoted"""');
  });

  it('renders dry-run action with diamond marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        {
          kind: 'remove',
          ok: false,
          status: 'dry-run',
          wouldHaveCalled: 'reddit.remove(t3_abc123, true)',
        },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('remove◆(reddit.remove(t3_abc123, true))');
  });

  it('renders error action with X marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [{ kind: 'ban', ok: false, status: 'error' }],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('ban✗');
  });

  it('renders skipped-locked action with prohibition marker', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [{ kind: 'lock', ok: false, status: 'skipped-locked' }],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('lock⊘');
  });

  it('joins multiple actions per event with semicolons', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: true, status: 'ok' },
        { kind: 'comment', ok: true, status: 'ok' },
        { kind: 'lock', ok: true, status: 'ok' },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('remove;comment;lock');
  });

  it('allOk false when any action failed', () => {
    const event: EventRecord = {
      ...baseEvent,
      actions: [
        { kind: 'remove', ok: true, status: 'ok' },
        { kind: 'comment', ok: false, status: 'error' },
      ],
    };
    const out = eventsToCsv([event]);
    expect(out).toContain('"false"');
  });

  it('produces one header row + N event rows', () => {
    const events: EventRecord[] = [baseEvent, baseEvent, baseEvent];
    const out = eventsToCsv(events);
    const dataPortion = out.slice(UTF8_BOM.length);
    const lines = dataPortion.split(CRLF);
    expect(lines).toHaveLength(4);
  });
});

describe('neutralizeCsvFormula (Codex BLOCKER fix — OWASP CSV injection)', () => {
  it('prefixes = with single quote to neutralize formula', () => {
    expect(neutralizeCsvFormula('=cmd|"/c calc"!A1')).toBe('\'=cmd|"/c calc"!A1');
  });

  it('prefixes + with single quote', () => {
    expect(neutralizeCsvFormula('+1234')).toBe("'+1234");
  });

  it('prefixes - with single quote (covers leading dash)', () => {
    expect(neutralizeCsvFormula('-2+3+cmd')).toBe("'-2+3+cmd");
  });

  it('prefixes @ with single quote (covers SUM @ syntax)', () => {
    expect(neutralizeCsvFormula('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('prefixes leading-tab-then-= with single quote (formula after strip)', () => {
    expect(neutralizeCsvFormula('\t=cmd')).toBe("'\t=cmd");
  });

  it('does NOT prefix bare CR + non-formula content (no formula visible after strip — Q2 semantics)', () => {
    // Old behavior over-aggressive: flagged any CR-prefixed content. New (Q2)
    // strips CR + checks visible char — "malicious" is not a formula, no neutralize.
    expect(neutralizeCsvFormula('\rmalicious')).toBe('\rmalicious');
  });

  it('prefixes CR-then-= with single quote (formula after strip)', () => {
    expect(neutralizeCsvFormula('\r=cmd')).toBe("'\r=cmd");
  });

  it('leaves safe values unchanged', () => {
    expect(neutralizeCsvFormula('normal-value')).toBe('normal-value');
    expect(neutralizeCsvFormula('t3_abc123')).toBe('t3_abc123');
    expect(neutralizeCsvFormula('spam-removal')).toBe('spam-removal');
  });

  it('leaves empty string unchanged', () => {
    expect(neutralizeCsvFormula('')).toBe('');
  });

  describe('OWASP bypass-class hardening (Codex second-pass BLOCKER)', () => {
    it('prefixes when leading single ASCII space hides the =', () => {
      const out = neutralizeCsvFormula(' =cmd|"/c calc"!A1');
      expect(out.charAt(0)).toBe("'");
      expect(out).toBe('\' =cmd|"/c calc"!A1');
    });

    it('prefixes when leading multiple spaces hide the =', () => {
      expect(neutralizeCsvFormula('   =HYPERLINK("evil","x")')).toBe('\'   =HYPERLINK("evil","x")');
    });

    it('prefixes when leading tab + space mix hides the +', () => {
      expect(neutralizeCsvFormula('\t +cmd')).toBe("'\t +cmd");
    });

    it('prefixes when leading U+202E RLO (bidi) hides the =', () => {
      const evil = '‮=HYPERLINK("https://attacker.test","click")';
      const out = neutralizeCsvFormula(evil);
      expect(out.charAt(0)).toBe("'");
      expect(out).toBe("'" + evil);
    });

    it('prefixes when leading U+200B ZWSP (zero-width) hides the +', () => {
      const out = neutralizeCsvFormula('​+SUM(A1)');
      expect(out.charAt(0)).toBe("'");
    });

    it('prefixes when leading U+FEFF (BOM mid-string position 0) hides the =', () => {
      const out = neutralizeCsvFormula('﻿=DDE("cmd","/c calc","")');
      expect(out.charAt(0)).toBe("'");
    });

    it('prefixes when leading U+202D LRO hides the @', () => {
      const out = neutralizeCsvFormula('‭@SUM(A1)');
      expect(out.charAt(0)).toBe("'");
    });

    it('prefixes when leading C0 control char (U+0001 SOH) hides the =', () => {
      const out = neutralizeCsvFormula('=cmd');
      expect(out.charAt(0)).toBe("'");
    });

    it('leaves all-whitespace value unchanged (no formula present)', () => {
      expect(neutralizeCsvFormula('   ')).toBe('   ');
      expect(neutralizeCsvFormula('\t\t')).toBe('\t\t');
    });

    it('leaves all-bidi-control value unchanged (no visible content)', () => {
      const out = neutralizeCsvFormula('‮​﻿');
      expect(out).toBe('‮​﻿');
    });
  });

  it('eventsToCsv integration: malicious activityId neutralized in output', () => {
    const evilEvent: EventRecord = {
      ...baseEvent,
      activityId: '=HYPERLINK("https://attacker.test","click")',
    };
    const out = eventsToCsv([evilEvent]);
    expect(out).toContain('"\'=HYPERLINK(""https://attacker.test"",""click"")"');
    // No bare =HYPERLINK that Excel would evaluate
    expect(out).not.toContain('"=HYPERLINK');
  });

  it('eventsToCsv integration: malicious checkName with leading @ neutralized', () => {
    const evilEvent: EventRecord = {
      ...baseEvent,
      checkName: '@SUM(1+1)*cmd',
    };
    const out = eventsToCsv([evilEvent]);
    expect(out).toContain('"\'@SUM(1+1)*cmd"');
  });
});

describe('csvFilename', () => {
  it('replaces unsafe filename chars in subreddit', () => {
    const out = csvFilename('test/sub with spaces', new Date('2026-05-17T01:00:00Z'));
    expect(out).toBe('contextmod-events-test_sub_with_spaces-2026-05-17T01-00.csv');
  });

  it('uses safe subreddit name unchanged', () => {
    const out = csvFilename('cm_devvit_test', new Date('2026-05-17T01:00:00Z'));
    expect(out).toBe('contextmod-events-cm_devvit_test-2026-05-17T01-00.csv');
  });
});
