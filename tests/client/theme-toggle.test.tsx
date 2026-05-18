// @vitest-environment jsdom
/**
 * AA — ThemeToggle round-trip. Verifies the data-theme attribute on
 * <html> + localStorage 'cm-theme' both update on toggle, and that
 * a fresh component picks up the stored preference.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ThemeToggle } from '../../src/client/components/ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => cleanup());

describe('ThemeToggle (AA)', () => {
  it('renders w/ Sun icon when no preference set (default dark)', () => {
    const { container } = render(<ThemeToggle />);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles to light + persists', () => {
    const { container } = render(<ThemeToggle />);
    const btn = container.querySelector('button');
    fireEvent.click(btn!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('cm-theme')).toBe('light');
  });

  it('toggles back to dark + persists', () => {
    const { container } = render(<ThemeToggle />);
    const btn = container.querySelector('button')!;
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('cm-theme')).toBe('dark');
  });

  it('picks up stored preference on mount', () => {
    localStorage.setItem('cm-theme', 'light');
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
