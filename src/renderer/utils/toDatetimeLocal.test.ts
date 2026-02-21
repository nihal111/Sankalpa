import { describe, it, expect } from 'vitest';
import { toDatetimeLocal } from './toDatetimeLocal';

describe('toDatetimeLocal', () => {
  it('formats timestamp as datetime-local string', () => {
    const ms = new Date(2026, 5, 15, 9, 30).getTime();
    expect(toDatetimeLocal(ms)).toBe('2026-06-15T09:30');
  });

  it('pads single-digit values', () => {
    const ms = new Date(2026, 0, 5, 8, 5).getTime();
    expect(toDatetimeLocal(ms)).toBe('2026-01-05T08:05');
  });
});
