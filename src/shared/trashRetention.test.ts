import { describe, it, expect } from 'vitest';
import { parseRetentionDays } from './trashRetention';

describe('parseRetentionDays', () => {
  it('returns null for "never"', () => {
    expect(parseRetentionDays('never')).toBe(null);
  });

  it('parses numeric string', () => {
    expect(parseRetentionDays('14')).toBe(14);
  });

  it('returns default 7 for undefined', () => {
    expect(parseRetentionDays(undefined)).toBe(7);
  });
});
