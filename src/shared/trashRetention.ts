const DEFAULT_RETENTION_DAYS = 7;

export function parseRetentionDays(setting: string | undefined): number | null {
  if (setting === 'never') return null;
  return parseInt(setting ?? String(DEFAULT_RETENTION_DAYS), 10);
}
