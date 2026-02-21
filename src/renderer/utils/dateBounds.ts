export function todayBounds(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  return [start, end];
}
