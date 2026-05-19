/**
 * Minimal type stub for upng-js — the upstream package ships no .d.ts.
 * Only the two functions we actually call are declared. Add more here
 * if the rest of the API is ever needed (encode / encodeLL / etc.).
 */
declare module 'upng-js' {
  export interface Decoded {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: unknown;
    data: Uint8Array;
  }

  /** Decode a PNG ArrayBuffer into the intermediate representation. */
  export function decode(buf: ArrayBuffer | Uint8Array): Decoded;

  /** Convert decoded frames to flat RGBA8 ArrayBuffer per frame. */
  export function toRGBA8(decoded: Decoded): ArrayBuffer[];

  const _default: {
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
  };
  export default _default;
}
