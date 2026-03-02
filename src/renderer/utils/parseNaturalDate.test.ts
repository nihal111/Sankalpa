import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSuggestions } from './parseNaturalDate';

describe('getSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  it('returns empty for empty query', () => {
    expect(getSuggestions('')).toEqual([]);
    expect(getSuggestions('   ')).toEqual([]);
  });

  it('suggests "tomorrow" for "tom"', () => {
    const suggestions = getSuggestions('tom');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('tomorrow');
  });

  it('suggests "today" for "tod"', () => {
    const suggestions = getSuggestions('tod');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('today');
  });

  it('suggests "next week" for "nex"', () => {
    const suggestions = getSuggestions('nex');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('next week');
  });

  it('handles exact shorthand like "3h"', () => {
    const suggestions = getSuggestions('3h');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('hour');
  });

  it('handles numeric input like "30"', () => {
    const suggestions = getSuggestions('30');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.label.includes('minute'))).toBe(true);
  });

  it('handles "min" shorthand', () => {
    const suggestions = getSuggestions('5min');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('minute');
  });

  it('handles "hr" shorthand', () => {
    const suggestions = getSuggestions('2hr');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('hour');
  });

  it('handles "d" shorthand', () => {
    const suggestions = getSuggestions('7d');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('day');
  });

  it('handles "w" shorthand', () => {
    const suggestions = getSuggestions('2w');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('week');
  });

  it('handles case insensitive shorthand', () => {
    const suggestions = getSuggestions('3H');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].label).toContain('hour');
  });

  it('returns natural language parse results', () => {
    const suggestions = getSuggestions('next monday');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('returns empty for unparseable input', () => {
    const suggestions = getSuggestions('xyzabc');
    expect(suggestions.length).toBe(0);
  });
});
