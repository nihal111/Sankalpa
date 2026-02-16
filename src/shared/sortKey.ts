export function calcSortKeyBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return after! / 2;
  if (after === null) return before + 1;
  return (before + after) / 2;
}
