import { useEffect } from 'react';

export type KeyboardShortcut = {
  key: string;
  label: string;
  handler: () => void;
};

/**
 * Global keyboard shortcut hook. Skip when focus is inside an input/textarea/
 * contenteditable so the mod can type into form fields without triggering shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const match = shortcuts.find((s) => s.key === e.key);
      if (match) {
        e.preventDefault();
        // Wave U WARN fix (Codex CR3 #10): wrap handler so a thrown error
        // doesn't kill the listener silently. React error boundaries don't
        // catch errors inside DOM event listeners.
        try {
          match.handler();
        } catch (err) {
          console.error(`[cm/keyboard] handler for "${match.key}" threw:`, err);
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
