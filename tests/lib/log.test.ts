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

  it('AC — newTraceId returns a UUID v4 string', () => {
    const id = log.newTraceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('AC — two newTraceId calls return distinct IDs', () => {
    const a = log.newTraceId();
    const b = log.newTraceId();
    expect(a).not.toBe(b);
  });

  it('AC — error level captures err.stack first 5 lines; info level does not', () => {
    const err = new Error('boom');
    err.stack = 'Error: boom\n    at one\n    at two\n    at three\n    at four\n    at five\n    at six';
    log.error('cm/test', 'oops', { err });
    const errEmit = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    // Top-5 lines includes the "Error: boom" header line + 4 frames.
    expect(errEmit.errStack).toContain('at one');
    expect(errEmit.errStack).toContain('at four');
    expect(errEmit.errStack).not.toContain('at five');
    expect(errEmit.errStack).not.toContain('at six');

    log.info('cm/test', 'fyi', { err });
    const infoEmit = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(infoEmit.errStack).toBeUndefined();
  });
});
