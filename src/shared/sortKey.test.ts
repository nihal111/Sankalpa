import { describe, it, expect } from 'vitest';
import { calcSortKeyBetween } from './sortKey';

describe('calcSortKeyBetween', () => {
  it('returns 1 when both null (first item)', () => {
    expect(calcSortKeyBetween(null, null)).toBe(1);
  });

  it('returns half of after when before is null (insert at start)', () => {
    expect(calcSortKeyBetween(null, 2)).toBe(1);
    expect(calcSortKeyBetween(null, 1)).toBe(0.5);
  });

  it('returns before + 1 when after is null (insert at end)', () => {
    expect(calcSortKeyBetween(3, null)).toBe(4);
    expect(calcSortKeyBetween(1.5, null)).toBe(2.5);
  });

  it('returns midpoint when both provided (insert between)', () => {
    expect(calcSortKeyBetween(1, 2)).toBe(1.5);
    expect(calcSortKeyBetween(1, 3)).toBe(2);
    expect(calcSortKeyBetween(1.5, 1.75)).toBe(1.625);
  });

  it('returns null when precision exhausted (duplicate sort keys)', () => {
    expect(calcSortKeyBetween(1, 1)).toBe(null);
    // Simulate extreme precision exhaustion
    const tiny = Number.EPSILON;
    expect(calcSortKeyBetween(1, 1 + tiny)).toBe(null);
  });
});
