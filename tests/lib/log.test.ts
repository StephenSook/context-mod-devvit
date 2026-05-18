/**
 * X33 logger contract — JSON shape stays stable so downstream aggregators
 * (jq, Datadog, Honeycomb) don't need migration when log lines evolve.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../../src/lib/log';

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

function emitted(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const line = spy.mock.calls[0]?.[0] as string;
  return JSON.parse(line);
}

describe('log (X33)', () => {
  it('info routes to console.log + emits JSON w/ level=info', () => {
    log.info('cm/test', 'hello', { foo: 'bar' });
    const out = emitted(logSpy);
    expect(out.level).toBe('info');
    expect(out.tag).toBe('cm/test');
    expect(out.msg).toBe('hello');
    expect(out.foo).toBe('bar');
    expect(typeof out.ts).toBe('number');
  });

  it('warn routes to console.warn', () => {
    log.warn('cm/test', 'careful');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('error routes to console.error', () => {
    log.error('cm/test', 'bad');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('serializes Error.message + name when ctx.err is an Error', () => {
    log.error('cm/test', 'oops', { err: new Error('boom') });
    const out = emitted(errorSpy);
    expect(out.err).toBe('boom');
    expect(out.errName).toBe('Error');
  });

  it('does NOT crash on undefined ctx', () => {
    expect(() => log.info('cm/test', 'no ctx')).not.toThrow();
  });
});
