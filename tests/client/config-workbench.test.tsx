// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const fetchConfigRawSafe = vi.fn();
const saveConfigSafe = vi.fn();
const validateConfigSafe = vi.fn();
vi.mock('../../src/client/lib/api', () => ({
  fetchConfigRawSafe: () => fetchConfigRawSafe(),
  saveConfigSafe: (...a: unknown[]) => saveConfigSafe(...a),
  validateConfigSafe: (...a: unknown[]) => validateConfigSafe(...a),
}));

import { ConfigWorkbench } from '../../src/client/components/ConfigWorkbench';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  fetchConfigRawSafe.mockResolvedValue({ ok: true, empty: false, data: { content: 'runs: []', revisionId: 'rev-1', isDefaultTemplate: false } });
  validateConfigSafe.mockResolvedValue({ ok: true });
  saveConfigSafe.mockResolvedValue({ ok: true, empty: false, data: { rev: 1, ruleCount: 0 } });
});

describe('ConfigWorkbench', () => {
  it('loads config then saves', async () => {
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    const save = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(save);
    await waitFor(() => expect(saveConfigSafe).toHaveBeenCalled());
  });

  it('shows subreddit in header', async () => {
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    expect(screen.getByText(/r\/testsub/i)).toBeTruthy();
  });

  it('calls onClose when Close button clicked', async () => {
    const onClose = vi.fn();
    render(<ConfigWorkbench subreddit="testsub" onClose={onClose} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    const closeBtn = await screen.findByRole('button', { name: /close editor/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('refreshes baseRev after save (calls fetchConfigRawSafe twice)', async () => {
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalledTimes(1));
    const save = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(save);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalledTimes(2));
  });

  it('shows load error if fetchConfigRawSafe fails', async () => {
    fetchConfigRawSafe.mockResolvedValue({ ok: false, error: 'Network error' });
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    expect(await screen.findByText(/load failed/i)).toBeTruthy();
  });

  it('shows conflict reload button on wiki-changed error', async () => {
    saveConfigSafe.mockResolvedValue({ ok: false, error: 'wiki changed beneath you' });
    render(<ConfigWorkbench subreddit="testsub" onClose={() => {}} />);
    await waitFor(() => expect(fetchConfigRawSafe).toHaveBeenCalled());
    const save = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy());
  });
});
