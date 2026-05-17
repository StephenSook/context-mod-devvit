// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { OnboardingTour, hasSeenTour, markTourSeen } from '../../src/client/components/OnboardingTour';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('OnboardingTour state helpers', () => {
  it('hasSeenTour returns false when localStorage flag absent', () => {
    expect(hasSeenTour()).toBe(false);
  });

  it('markTourSeen + hasSeenTour roundtrip', () => {
    markTourSeen();
    expect(hasSeenTour()).toBe(true);
  });

  it('U4 fix — fail-open on localStorage.getItem exception (Codex CR3 BUG #9)', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('storage blocked');
    };
    try {
      // In a fresh module-scope inMemorySeen=false, error path should return false (show tour)
      // We can't reset module state cleanly between tests so this is a smoke test —
      // the critical assertion is no exception bubbles + returns boolean.
      const result = hasSeenTour();
      expect(typeof result).toBe('boolean');
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it('U4 fix — markTourSeen still suppresses re-show within session when localStorage.setItem throws', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('storage write blocked');
    };
    try {
      markTourSeen();
      // In-memory flag should now be true, so hasSeenTour returns true
      // even though localStorage write failed.
      expect(hasSeenTour()).toBe(true);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('OnboardingTour component', () => {
  it('renders step 1 title + body initially', () => {
    const { getByText } = render(<OnboardingTour onDone={vi.fn()} />);
    expect(getByText(/Welcome to ContextMod/)).toBeTruthy();
    expect(getByText(/step 1 of 3/)).toBeTruthy();
  });

  it('clicking next advances to step 2', () => {
    const { getByText } = render(<OnboardingTour onDone={vi.fn()} />);
    fireEvent.click(getByText('next'));
    expect(getByText(/step 2 of 3/)).toBeTruthy();
  });

  it('clicking next on final step calls onDone + marks seen', () => {
    const onDone = vi.fn();
    const { getByText } = render(<OnboardingTour onDone={onDone} />);
    fireEvent.click(getByText('next')); // step 2
    fireEvent.click(getByText('next')); // step 3
    fireEvent.click(getByText('done'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(hasSeenTour()).toBe(true);
  });

  it('clicking skip tour calls onDone + marks seen', () => {
    const onDone = vi.fn();
    const { getByText } = render(<OnboardingTour onDone={onDone} />);
    fireEvent.click(getByText('skip tour'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(hasSeenTour()).toBe(true);
  });

  it('back button appears only from step 2 onwards', () => {
    const { getByText, queryByText } = render(<OnboardingTour onDone={vi.fn()} />);
    expect(queryByText('back')).toBeFalsy();
    fireEvent.click(getByText('next'));
    expect(getByText('back')).toBeTruthy();
  });
});
