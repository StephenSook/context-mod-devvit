/**
 * Codex session HIGH-2 propagation — pure-function tests for chip color +
 * marker helpers. Distinct chip rendering for ok / dry-run / error /
 * skipped-locked statuses with back-compat fallback for undefined status.
 */

import { describe, it, expect } from 'vitest';
import {
  chipColorForStatus,
  chipMarkerForStatus,
} from '../../src/client/lib/chip';
import { SIGNAL } from '../../src/client/lib/design-tokens';

describe('chipColorForStatus', () => {
  it('status ok renders the action kind color (green for approve)', () => {
    expect(chipColorForStatus('ok', 'approve', true)).toBe(SIGNAL.ok);
  });

  it('status ok renders the action kind color (red for remove)', () => {
    expect(chipColorForStatus('ok', 'remove', true)).toBe(SIGNAL.err);
  });

  it('status dry-run renders info blue regardless of kind', () => {
    expect(chipColorForStatus('dry-run', 'remove', false)).toBe(SIGNAL.info);
    expect(chipColorForStatus('dry-run', 'comment', false)).toBe(SIGNAL.info);
  });

  it('status error renders err red regardless of kind', () => {
    expect(chipColorForStatus('error', 'remove', false)).toBe(SIGNAL.err);
    expect(chipColorForStatus('error', 'approve', false)).toBe(SIGNAL.err);
  });

  it('status skipped-locked renders muted gray', () => {
    expect(chipColorForStatus('skipped-locked', 'remove', false)).toBe(
      SIGNAL.muted
    );
  });

  it('back-compat: undefined status + ok=true falls back to kind color', () => {
    expect(chipColorForStatus(undefined, 'approve', true)).toBe(SIGNAL.ok);
    expect(chipColorForStatus(undefined, 'remove', true)).toBe(SIGNAL.err);
  });

  it('back-compat: undefined status + ok=false falls back to err red', () => {
    expect(chipColorForStatus(undefined, 'approve', false)).toBe(SIGNAL.err);
    expect(chipColorForStatus(undefined, 'comment', false)).toBe(SIGNAL.err);
  });
});

describe('chipMarkerForStatus', () => {
  it('status ok renders no marker', () => {
    expect(chipMarkerForStatus('ok', true)).toBe('');
  });

  it('status dry-run renders diamond marker', () => {
    expect(chipMarkerForStatus('dry-run', false)).toBe(' ◆');
  });

  it('status error renders X marker', () => {
    expect(chipMarkerForStatus('error', false)).toBe(' ✗');
  });

  it('status skipped-locked renders prohibition marker', () => {
    expect(chipMarkerForStatus('skipped-locked', false)).toBe(' ⊘');
  });

  it('back-compat: undefined status + ok=true renders no marker', () => {
    expect(chipMarkerForStatus(undefined, true)).toBe('');
  });

  it('back-compat: undefined status + ok=false renders X marker (legacy)', () => {
    expect(chipMarkerForStatus(undefined, false)).toBe('✗');
  });
});
