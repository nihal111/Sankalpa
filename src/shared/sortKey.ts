export function calcSortKeyBetween(before: number | null, after: number | null): number | null {
  if (before === null && after === null) return 1;
  if (before === null) return after! / 2;
  if (after === null) return before + 1;
  const mid = (before + after) / 2;
  // Precision exhausted - midpoint equals one of the bounds
  if (mid === before || mid === after) return null;
  return mid;
}
