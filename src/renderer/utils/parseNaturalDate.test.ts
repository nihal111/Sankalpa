import { describe, it, expect } from 'vitest';
import { parseNaturalDate, getSuggestions } from './parseNaturalDate';

describe('parseNaturalDate', () => {
  it('returns null for empty input', () => {
    expect(parseNaturalDate('')).toBeNull();
    expect(parseNaturalDate('   ')).toBeNull();
  });

  it('parses shorthand durations', () => {
    const before = Date.now();
    const result = parseNaturalDate('3h');
    expect(result).toBeGreaterThanOrEqual(before + 3 * 3_600_000);
  });

  it('parses min/hr shorthand variants', () => {
    const before = Date.now();
    expect(parseNaturalDate('5min')! - before).toBeGreaterThanOrEqual(5 * 60_000 - 100);
    expect(parseNaturalDate('2hr')! - before).toBeGreaterThanOrEqual(2 * 3_600_000 - 100);
  });

  it('parses natural language dates', () => {
    const result = parseNaturalDate('tomorrow');
    expect(result).toBeGreaterThan(Date.now());
  });

  it('returns null for unparseable input', () => {
    expect(parseNaturalDate('xyznotadate')).toBeNull();
  });
});

describe('getSuggestions', () => {
  it('returns empty for blank input', () => {
    expect(getSuggestions('')).toEqual([]);
    expect(getSuggestions('   ')).toEqual([]);
  });

  it('returns single suggestion for shorthand like 3h', () => {
    const results = getSuggestions('3h');
    expect(results).toHaveLength(1);
    expect(results[0].label).toContain('in 3 hours');
  });

  it('normalizes min to minute label', () => {
    const results = getSuggestions('5min');
    expect(results).toHaveLength(1);
    expect(results[0].label).toContain('in 5 minutes');
  });

  it('normalizes hr to hour label', () => {
    const results = getSuggestions('2hr');
    expect(results).toHaveLength(1);
    expect(results[0].label).toContain('in 2 hours');
  });

  it('uses singular for 1 unit', () => {
    const results = getSuggestions('1d');
    expect(results).toHaveLength(1);
    expect(results[0].label).toContain('in 1 day');
    expect(results[0].label).not.toContain('days');
  });

  it('returns 4 suggestions for numeric-only input', () => {
    const results = getSuggestions('5');
    expect(results).toHaveLength(4);
    expect(results[0].label).toContain('minute');
    expect(results[1].label).toContain('hour');
    expect(results[2].label).toContain('day');
    expect(results[3].label).toContain('week');
  });

  it('returns suggestion for natural language', () => {
    const results = getSuggestions('tomorrow');
    expect(results).toHaveLength(1);
    expect(results[0].timestamp).toBeGreaterThan(Date.now());
  });

  it('returns empty for unparseable natural language', () => {
    expect(getSuggestions('xyznotadate')).toEqual([]);
  });
});
