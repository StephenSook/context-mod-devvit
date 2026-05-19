/**
 * Polish #23 — Content-Length pre-check on image decode.
 *
 * Before this fix, fetchAndDecode would call res.arrayBuffer() and buffer
 * the full body into memory, then check MAX_BYTES afterward. A malicious
 * server claiming `Content-Type: image/jpeg` could deliver a 100MB payload
 * and we'd hold all 100MB before rejecting.
 *
 * Test verifies the early Content-Length check short-circuits BEFORE the
 * body is read (arrayBuffer is never called when the header says
 * `Content-Length > 6MB`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAndDecode } from '../../src/image/decode';

const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('fetchAndDecode size guard (Polish #23)', () => {
  it('rejects on advertised Content-Length > 6MB WITHOUT reading the body', async () => {
    const arrayBufferSpy = vi.fn(() => Promise.reject(new Error('should not be called')));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) => {
          if (k.toLowerCase() === 'content-type') return 'image/jpeg';
          if (k.toLowerCase() === 'content-length') return String(10 * 1024 * 1024); // 10MB
          return null;
        },
      },
      arrayBuffer: arrayBufferSpy,
    }) as unknown as typeof fetch;

    const result = await fetchAndDecode('https://example.com/big.jpg');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.phase).toBe('too-large');
      expect(result.error).toMatch(/Content-Length \d+ exceeds/i);
      expect(result.error).toMatch(/body not read/i);
    }
    // The critical guarantee: arrayBuffer() was NEVER called.
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });

  it('accepts on advertised Content-Length ≤ 6MB (proceeds to decode path)', async () => {
    // Server claims a tiny size — the decode path will then likely fail on
    // the buffer content, but the size gate should let us through.
    const buf = new ArrayBuffer(100);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) => {
          if (k.toLowerCase() === 'content-type') return 'image/jpeg';
          if (k.toLowerCase() === 'content-length') return '100';
          return null;
        },
      },
      arrayBuffer: () => Promise.resolve(buf),
    }) as unknown as typeof fetch;

    const result = await fetchAndDecode('https://example.com/tiny.jpg');
    // We don't assert ok=true because 100 bytes isn't a real JPEG; what we
    // care about is that the size gate didn't fire — so phase != 'too-large'.
    if (!result.ok) {
      expect(result.phase).not.toBe('too-large');
    }
  });

  it('still gates via post-read MAX_BYTES when Content-Length is missing (lying server)', async () => {
    // 7MB payload, server omits Content-Length (or lies and sends nothing).
    // We still buffer it (defense-in-depth gap remains) but post-read gate fires.
    const buf = new ArrayBuffer(7 * 1024 * 1024);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) => {
          if (k.toLowerCase() === 'content-type') return 'image/jpeg';
          return null; // no Content-Length
        },
      },
      arrayBuffer: () => Promise.resolve(buf),
    }) as unknown as typeof fetch;

    const result = await fetchAndDecode('https://example.com/lying.jpg');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.phase).toBe('too-large');
      expect(result.error).toMatch(/payload \d+ bytes exceeds/i);
      expect(result.error).not.toMatch(/body not read/i);
    }
  });

  it('handles malformed Content-Length string (non-numeric) by falling through to post-read gate', async () => {
    const buf = new ArrayBuffer(100);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) => {
          if (k.toLowerCase() === 'content-type') return 'image/jpeg';
          if (k.toLowerCase() === 'content-length') return 'not-a-number';
          return null;
        },
      },
      arrayBuffer: () => Promise.resolve(buf),
    }) as unknown as typeof fetch;

    const result = await fetchAndDecode('https://example.com/weird.jpg');
    // Should NOT short-circuit on the bad header. Decode path will fire next.
    if (!result.ok) {
      expect(result.phase).not.toBe('too-large');
    }
  });
});
