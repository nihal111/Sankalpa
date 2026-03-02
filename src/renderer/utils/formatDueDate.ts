export function formatDueDate(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  if (diffDays === -1) return `Yesterday, ${time}`;
  if (diffDays > 1 && diffDays <= 7) return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + time;
}
