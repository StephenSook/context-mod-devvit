// @vitest-environment jsdom
/**
 * Y2-X23 — vitest snapshot test for FilterChips. Locks the rendered DOM
 * shape so a CSS class or aria-label refactor doesn't slip through
 * unannounced. Update snapshots via `npx vitest --update`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FilterChips } from '../../../src/client/components/FilterChips';

describe('FilterChips snapshot (Y2-X23)', () => {
  it('renders all=active default state', () => {
    const { container } = render(
      <FilterChips filter={{ kind: 'all' }} onChange={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders kind=remove active', () => {
    const { container } = render(
      <FilterChips filter={{ kind: 'remove' }} onChange={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders status=failed active', () => {
    const { container } = render(
      <FilterChips filter={{ kind: 'failed' }} onChange={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
