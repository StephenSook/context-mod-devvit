import { describe, it, expect } from 'vitest';
import { authFailToast } from '../../src/lib/authFailToast';

/**
 * Pins the toast wording shared by forms.ts + menu.ts (extracted 2026-06-07
 * for the App Review mod-permission fix). A reword in one call site can no
 * longer silently diverge from the other.
 */
describe('authFailToast', () => {
  it('403 (not a mod) → terminal "mod-only" message naming the action', () => {
    const msg = authFailToast(403, 'reload the config');
    expect(msg).toMatch(/mod-only/i);
    expect(msg).toContain('reload the config');
  });

  it('401 (unauthenticated) → same terminal "mod-only" message', () => {
    expect(authFailToast(401, 'reload the config')).toMatch(/mod-only/i);
  });

  it('503 (transient mod-check blip) → retry message, NOT a permission denial', () => {
    const msg = authFailToast(503, 'simulate rules');
    expect(msg).toMatch(/temporarily unavailable|retry/i);
    expect(msg).not.toMatch(/mod-only/i);
    expect(msg).toContain('simulate rules');
  });

  it('500 (mod-check failure) → server-error message, NOT a permission denial', () => {
    const msg = authFailToast(500, 'set the OpenAI key');
    expect(msg).toMatch(/failed/i);
    expect(msg).not.toMatch(/mod-only/i);
  });
});
