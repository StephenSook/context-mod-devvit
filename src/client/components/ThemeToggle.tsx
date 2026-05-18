import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Z4-X58 light-mode MVP toggle. The design system is dark-first; this is a
 * minimum-viable inversion that swaps body background + text color via a
 * `data-theme` attribute on <html>. Most components continue to use their
 * dark-mode design tokens — accent colors (signal-ok/err/info/warn) stay
 * recognizable in both themes.
 *
 * Persists via localStorage 'cm-theme'. Defaults to 'dark' on first visit
 * or when localStorage is blocked (matches design-first preference).
 */
type Theme = 'dark' | 'light';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const v = localStorage.getItem('cm-theme');
    return v === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('cm-theme', theme);
    } catch {
      // localStorage blocked — applyTheme still ran, just won't persist.
    }
  }, [theme]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="inline-flex items-center justify-center w-6 h-6 rounded-sm text-bone-300 hover:text-bone-50 hover:bg-white/[0.03] transition-colors"
    >
      {theme === 'dark' ? (
        <Sun size={12} strokeWidth={1.8} />
      ) : (
        <Moon size={12} strokeWidth={1.8} />
      )}
    </button>
  );
}
