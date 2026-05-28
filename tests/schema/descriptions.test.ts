import { describe, it, expect } from 'vitest';
import schema from '../../src/schema/app.schema.json';

describe('schema descriptions', () => {
  it('documents the top-level runs property', () => {
    const runs = (schema as { properties?: { runs?: { description?: string } } }).properties?.runs;
    expect(typeof runs?.description).toBe('string');
    expect((runs?.description ?? '').length).toBeGreaterThan(0);
  });
});
