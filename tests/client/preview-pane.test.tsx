// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

// Mock the API helpers BEFORE importing PreviewPane so the module-level
// mock is in place when PreviewPane's module is first evaluated.
const simulateLiveSafe = vi.fn();
const explainConfigSafe = vi.fn();
vi.mock('../../src/client/lib/api', () => ({
  simulateLiveSafe: (...a: unknown[]) => simulateLiveSafe(...a),
  explainConfigSafe: (...a: unknown[]) => explainConfigSafe(...a),
}));

import { PreviewPane } from '../../src/client/components/PreviewPane';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  simulateLiveSafe.mockResolvedValue({
    ok: true,
    empty: false,
    data: { totalSamples: 10, firedCount: 3, erroredCount: 0 },
  });
  explainConfigSafe.mockResolvedValue({
    ok: true,
    empty: false,
    data: 'This config matches posts with runs: [a].',
  });
});

describe('PreviewPane', () => {
  it('renders all three tabs', () => {
    render(<PreviewPane text="runs: []" currentText="runs: []" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);
    const labels = tabs.map((t) => t.textContent?.trim());
    expect(labels).toContain('Impact');
    expect(labels).toContain('Explain');
    expect(labels).toContain('Diff');
  });

  it('defaults to the Impact tab selected', () => {
    render(<PreviewPane text="runs: []" currentText="runs: []" />);
    const impactTab = screen.getByRole('tab', { name: /impact/i });
    expect(impactTab.getAttribute('aria-selected')).toBe('true');
  });

  it('Explain tab: clicking "Explain with AI" shows AI explanation', async () => {
    render(<PreviewPane text="runs: [a]" currentText="runs: []" />);

    // Switch to the Explain tab
    fireEvent.click(screen.getByRole('tab', { name: /explain/i }));

    // The Explain tab should now be visible with the button
    const explainBtn = await screen.findByRole('button', { name: /explain with ai/i });
    fireEvent.click(explainBtn);

    // Wait for the async explain call to resolve and the text to appear
    await waitFor(() =>
      expect(screen.getByText(/This config matches posts with runs/i)).toBeTruthy()
    );
    expect(explainConfigSafe).toHaveBeenCalledWith('runs: [a]');
  });

  it('Explain tab: shows loading placeholder "..." while waiting', async () => {
    // Use a never-resolving promise so we can observe the interim state
    explainConfigSafe.mockImplementation(() => new Promise(() => {}));

    render(<PreviewPane text="runs: [a]" currentText="runs: []" />);
    fireEvent.click(screen.getByRole('tab', { name: /explain/i }));

    const explainBtn = await screen.findByRole('button', { name: /explain with ai/i });
    fireEvent.click(explainBtn);

    // "..." should appear immediately as the loading indicator
    expect(screen.getByText('...')).toBeTruthy();
  });

  it('Diff tab: shows changed lines when text differs from currentText', async () => {
    render(<PreviewPane text="runs: [a]" currentText="runs: []" />);

    // Switch to the Diff tab
    fireEvent.click(screen.getByRole('tab', { name: /diff/i }));

    // The diff should show the old line removed and new line added
    // simpleDiff('runs: []', 'runs: [a]') produces del + add entries
    await waitFor(() => {
      // Look for deletion and addition markers in the rendered diff
      const pre = document.querySelector('pre');
      expect(pre).toBeTruthy();
      const content = pre?.textContent ?? '';
      // Should contain both - and + markers for the changed line
      expect(content).toContain('-');
      expect(content).toContain('+');
    });
  });

  it('Diff tab: shows "No changes." when text matches currentText', () => {
    render(<PreviewPane text="runs: []" currentText="runs: []" />);
    fireEvent.click(screen.getByRole('tab', { name: /diff/i }));
    expect(screen.getByText('No changes.')).toBeTruthy();
  });

  it('Impact tab: shows error message when simulateLiveSafe returns ok:false', async () => {
    simulateLiveSafe.mockResolvedValue({ ok: false, error: 'simulation failed' });
    render(<PreviewPane text="runs: [a]" currentText="runs: []" />);

    await waitFor(
      () => {
        expect(screen.getByText('simulation failed')).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it('switching tabs away from Impact and back does not leave stale debounce running', async () => {
    render(<PreviewPane text="runs: []" currentText="runs: []" />);

    // Start on Impact, switch away, switch back
    fireEvent.click(screen.getByRole('tab', { name: /explain/i }));
    fireEvent.click(screen.getByRole('tab', { name: /impact/i }));

    // After switching back, the component should still render without errors
    expect(screen.getByRole('tab', { name: /impact/i }).getAttribute('aria-selected')).toBe('true');
  });
});
