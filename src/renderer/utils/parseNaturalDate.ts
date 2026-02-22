import * as chrono from 'chrono-node';

const SHORTHAND_RE = /^(\d+)\s*(m|min|h|hr|d|w)$/i;

const SHORTHAND_MS: Record<string, number> = {
  m: 60_000, min: 60_000,
  h: 3_600_000, hr: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export interface DueDateSuggestion {
  label: string;
  timestamp: number;
}

function formatSuggestionDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function parseNaturalDate(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  const match = s.match(SHORTHAND_RE);
  if (match) return Date.now() + parseInt(match[1], 10) * SHORTHAND_MS[match[2].toLowerCase()];

  const parsed = chrono.parseDate(s, new Date(), { forwardDate: true });
  return parsed ? parsed.getTime() : null;
}

const UNIT_LABELS: Record<string, string> = {
  m: 'minute', h: 'hour', d: 'day', w: 'week',
};

function pluralize(n: number, unit: string): string {
  return `in ${n} ${unit}${n === 1 ? '' : 's'}`;
}

export function getSuggestions(input: string): DueDateSuggestion[] {
  const s = input.trim().toLowerCase();
  if (!s) return [];

  const results: DueDateSuggestion[] = [];

  // Exact shorthand match (e.g. "3h")
  const shortMatch = s.match(SHORTHAND_RE);
  if (shortMatch) {
    const n = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2].toLowerCase();
    const baseUnit = unit === 'min' ? 'm' : unit === 'hr' ? 'h' : unit;
    const ts = Date.now() + n * SHORTHAND_MS[unit];
    results.push({ label: `${pluralize(n, UNIT_LABELS[baseUnit])} — ${formatSuggestionDate(ts)}`, timestamp: ts });
    return results;
  }

  // Numeric-only input: suggest multiple units (e.g. "30" → 30m, 30h, 30d)
  const numMatch = s.match(/^(\d+)$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    for (const [unit, label] of [['m', 'minute'], ['h', 'hour'], ['d', 'day'], ['w', 'week']] as const) {
      const ts = Date.now() + n * SHORTHAND_MS[unit];
      results.push({ label: `${pluralize(n, label)} — ${formatSuggestionDate(ts)}`, timestamp: ts });
    }
    return results;
  }

  // Natural language via chrono
  const parsed = chrono.parseDate(s, new Date(), { forwardDate: true });
  if (parsed) {
    results.push({ label: `${formatSuggestionDate(parsed.getTime())}`, timestamp: parsed.getTime() });
  }

  return results;
}
