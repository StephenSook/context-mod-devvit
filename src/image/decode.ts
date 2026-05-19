/**
 * Phase 4.7 — pure-JS image decode for blockhash pipeline.
 *
 * Verified via Vinh's 0.10 spike 2026-05-18 (commits 00feca5 + 19e94f0):
 *   - PNG 369ms cold, JPEG 207ms, 4K JPEG 913ms — well under 5s budget
 *   - Bundle adds ~88KB to dist/server/index.cjs, 0 errors
 *   - preview.redd.it 320-640px variants give 0-2/256 bit hash drift vs
 *     full-res (within 5-8 bit "same image" threshold) AT <5MB peak RAM
 *     instead of 180MB for 4K originals → ALWAYS prefer preview.
 *
 * `Accept: image/jpeg,image/png;q=0.9` MUST exclude `image/webp` because
 * jpeg-js cannot decode WebP. Reddit returns image/jpeg as long as the
 * Accept header obliges.
 */

import UPNG from 'upng-js';
import jpeg from 'jpeg-js';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 6 * 1024 * 1024; // 6MB hard cap — defense vs malicious large payload
const ACCEPT_HEADER = 'image/jpeg,image/png;q=0.9';

export interface DecodedFrame {
  width: number;
  height: number;
  /** RGBA pixel data, 4 bytes per pixel, row-major. */
  rgba: Uint8Array;
}

export type DecodeResult =
  | { ok: true; frame: DecodedFrame; bytes: number; contentType: string }
  | { ok: false; error: string; phase: 'fetch' | 'too-large' | 'unsupported-type' | 'decode' };

/**
 * Fetch + decode an image URL into RGBA pixels. Caller is responsible for
 * preferring preview.redd.it variants (see imageRepost.ts:resolvePreviewUrl).
 */
export async function fetchAndDecode(url: string): Promise<DecodeResult> {
  if (!url) return { ok: false, error: 'empty url', phase: 'fetch' };

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: ACCEPT_HEADER },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `fetch failed: ${msg}`, phase: 'fetch' };
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status} ${res.statusText}`, phase: 'fetch' };
  }

  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('image/jpeg') && !contentType.includes('image/png')) {
    return {
      ok: false,
      error: `unsupported content-type: "${contentType || '(missing)'}" — only image/jpeg + image/png supported by the pure-JS decode pipeline`,
      phase: 'unsupported-type',
    };
  }

  // Polish #23: Content-Length pre-check BEFORE buffering the full body.
  // arrayBuffer() reads everything into memory regardless of advertised size,
  // so without this check a malicious server could deliver a 100MB payload
  // and we'd buffer all 100MB before the post-read MAX_BYTES gate rejected
  // it. Truthful servers (Reddit's CDN among them) advertise Content-Length
  // correctly and we cut the fetch short. Lying servers still get buffered
  // up to the runtime's own response cap — defense in depth, not absolute.
  const contentLengthRaw = res.headers.get('content-length');
  if (contentLengthRaw !== null) {
    const advertised = Number.parseInt(contentLengthRaw, 10);
    if (Number.isFinite(advertised) && advertised > MAX_BYTES) {
      return {
        ok: false,
        error: `Content-Length ${advertised} exceeds ${MAX_BYTES}-byte cap (advertised; body not read)`,
        phase: 'too-large',
      };
    }
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return {
      ok: false,
      error: `payload ${buf.byteLength} bytes exceeds ${MAX_BYTES}-byte cap`,
      phase: 'too-large',
    };
  }

  try {
    if (contentType.includes('image/png')) {
      const decoded = UPNG.decode(buf);
      // UPNG returns RGBA pixel buffer as the first toRGBA8 frame.
      const frames = UPNG.toRGBA8(decoded);
      if (!frames.length) return { ok: false, error: 'PNG decoded to 0 frames', phase: 'decode' };
      return {
        ok: true,
        frame: {
          width: decoded.width,
          height: decoded.height,
          rgba: new Uint8Array(frames[0]!),
        },
        bytes: buf.byteLength,
        contentType,
      };
    }
    // JPEG branch
    const decoded = jpeg.decode(new Uint8Array(buf), { useTArray: true });
    return {
      ok: true,
      frame: {
        width: decoded.width,
        height: decoded.height,
        rgba: decoded.data as Uint8Array,
      },
      bytes: buf.byteLength,
      contentType,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `decode failed: ${msg}`, phase: 'decode' };
  }
}
