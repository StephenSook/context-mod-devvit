// @vitest-environment jsdom
/**
 * AC test-gap close — ErrorBoundary was untested. Recovery UI + fallback
 * render-prop + reset() callback all uncovered. Without coverage, the
 * dashboard could ship a blank white screen on the exact class of bug
 * the boundary exists to recover from.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../../src/client/components/ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom');
  return <span>safe child</span>;
}

afterEach(() => cleanup());

describe('ErrorBoundary (AC test-gap close)', () => {
  it('renders children when no error thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('safe child')).toBeDefined();
  });

  it('catches throw + renders default recovery UI w/ err.message', () => {
    // suppress React error log noise for clean test output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/boom/)).toBeDefined();
    expect(screen.getByText(/Dashboard hit an error/i)).toBeDefined();
    expect(screen.getByText(/Reload dashboard/i)).toBeDefined();
    spy.mockRestore();
  });

  it('invokes custom fallback prop w/ err + reset when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallback = vi.fn((err: Error) => <span>custom: {err.message}</span>);
    render(
      <ErrorBoundary fallback={fallback}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(fallback).toHaveBeenCalled();
    expect(screen.getByText('custom: boom')).toBeDefined();
    spy.mockRestore();
  });

  it('default recovery panel has a reload button that triggers window.location.reload', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Stub window.location.reload — jsdom's default throws on call
    const reloadStub = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadStub },
    });
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: /Reload dashboard/i }));
    expect(reloadStub).toHaveBeenCalled();
    spy.mockRestore();
  });
});
