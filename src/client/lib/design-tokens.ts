/**
 * Design tokens shared between Tailwind config and client components.
 *
 * Why this file exists:
 * - `tailwind.config.ts` declares `signal.{ok,warn,err,info,author}` for
 *   Tailwind utility-class generation (text-signal-ok / bg-signal-ok / etc).
 * - Some components (e.g., `EventRow.tsx`) need the raw hex values for
 *   inline-style opacity composition (`${color}14` for 8% bg, `${color}33`
 *   for 20% border) which Tailwind utility classes can't synthesize at
 *   runtime from dynamic action-kind variables.
 * - Importing both files from this single source makes the token set
 *   genuinely DRY — there's one canonical hex per signal slot.
 *
 * If you change a value here, Tailwind picks it up at next build.
 */
export const SIGNAL = {
  ok: '#4ADE80',
  warn: '#FBBF24',
  err: '#FB7185',
  info: '#60A5FA',
  author: '#A78BFA',
} as const;

export type SignalKey = keyof typeof SIGNAL;
