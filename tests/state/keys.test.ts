import { describe, it, expect } from 'vitest';
import { K, SUB_SENTINEL } from '../../src/state/keys';

describe('K (Redis key schema)', () => {
  it('defaults to sentinel sub', () => {
    expect(K.proc('t3_abc')).toBe('cm:_:proc:t3_abc');
    expect(K.actionDone('hash')).toBe('cm:_:action:done:hash');
    expect(K.actionPending('hash')).toBe('cm:_:action:pending:hash');
    expect(K.lock('refresh-config')).toBe('cm:_:lock:refresh-config');
    expect(K.cfgCurrentRev()).toBe('cm:_:cfg:current_rev');
    expect(K.cfgRev(3)).toBe('cm:_:cfg:rev:3');
    expect(K.eventsRecent()).toBe('cm:_:events:recent50');
  });

  it('threads explicit sub into the namespace', () => {
    expect(K.proc('t3_abc', 'mysub')).toBe('cm:mysub:proc:t3_abc');
    expect(K.actionDone('hash', 'mysub')).toBe('cm:mysub:action:done:hash');
    expect(K.cfgRev(7, 'mysub')).toBe('cm:mysub:cfg:rev:7');
    expect(K.eventsRecent('mysub')).toBe('cm:mysub:events:recent50');
  });

  it('installSubname keys by installId, NOT by sub (cross-tenant safe)', () => {
    expect(K.installSubname('inst_123')).toBe('cm:install:inst_123:subname');
  });

  it('SUB_SENTINEL is the underscore sentinel', () => {
    expect(SUB_SENTINEL).toBe('_');
  });
});
