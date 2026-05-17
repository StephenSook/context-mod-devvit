import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cm-tour-seen-v1';

/**
 * Wave U BUG fix (Codex CR3 #9): in-session fallback when localStorage is
 * blocked (Safari/Firefox enhanced tracking + iframe-restricted storage). Tour
 * never reappears within the same session even if persistence fails.
 */
let inMemorySeen = false;

const STEPS = [
  {
    title: 'Welcome to ContextMod Observatory',
    body: 'Live mod-action telemetry for your sub. Every remove, comment, lock, and approve fires here within seconds.',
  },
  {
    title: 'Three mod-menu entries',
    body: 'In your sub overflow menu: "Reload config from wiki" pulls the latest rules · "View recent actions" opens this dashboard · "Test rules on this item" runs a dry-run against any post or comment.',
  },
  {
    title: 'Edit your rules in the sub wiki',
    body: 'Your config lives at r/<your-sub>/wiki/botconfig/contextmod. Paste a starter config from the examples/ folder. Press ? anytime for keyboard shortcuts.',
  },
];

export function hasSeenTour(): boolean {
  // SSR / no-DOM: suppress tour (correct — DOM isn't ready yet).
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
  // In-memory flag honored first so within-session dismiss persists even when
  // localStorage write failed.
  if (inMemorySeen) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Wave U BUG fix (Codex CR3 #9): fail-OPEN on localStorage exception so
    // first-time mods in restricted iframes (Safari/Firefox enhanced tracking)
    // still see the tour. Previously failed-CLOSED which silently stripped the
    // feature for those browsers.
    console.warn('[cm/onboarding] localStorage read blocked, falling back to in-memory flag');
    return false;
  }
}

export function markTourSeen() {
  // Always set in-memory flag so within-session dismiss persists even when
  // localStorage write fails.
  inMemorySeen = true;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    console.warn('[cm/onboarding] localStorage write blocked; in-memory flag still suppresses re-show this session');
  }
}

export function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  function handleNext() {
    if (step + 1 < STEPS.length) {
      setStep(step + 1);
    } else {
      markTourSeen();
      onDone();
    }
  }

  function handleSkip() {
    markTourSeen();
    onDone();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        markTourSeen();
        onDone();
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step + 1 < STEPS.length) {
          setStep(step + 1);
        } else {
          markTourSeen();
          onDone();
        }
      }
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onDone]);

  const current = STEPS[step];
  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-tour-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm px-4"
    >
      <div className="cm-fade-up max-w-md w-full rounded-xl glass p-6 border border-line">
        <div className="flex items-baseline justify-between mb-4">
          <span className="telemetry text-[10px] uppercase tracking-wider text-bone-300/80">
            step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="telemetry text-[10px] uppercase tracking-wider text-bone-300 hover:text-bone-50 transition-colors"
          >
            skip tour
          </button>
        </div>

        <h2 id="cm-tour-title" className="text-[15px] tracking-tight text-bone-50 font-medium mb-2">
          {current.title}
        </h2>
        <p className="text-[12.5px] text-bone-200 leading-relaxed mb-5">{current.body}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${
                  i === step ? 'bg-signal-ok' : i < step ? 'bg-signal-ok/50' : 'bg-bone-300/20'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="telemetry text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border border-line text-bone-200 hover:text-bone-50 hover:border-bone-200/40 transition-colors"
              >
                back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="telemetry text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm bg-signal-ok/15 border border-signal-ok/60 text-signal-ok hover:bg-signal-ok/25 transition-colors"
              autoFocus
            >
              {step + 1 < STEPS.length ? 'next' : 'done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
