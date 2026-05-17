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
