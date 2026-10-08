/** Shared guard for the open-runs creation form. */
export function validateRunStart(date: string, time: string, now = Date.now()): string | null {
  if (!date || !time) return 'Choose a date and start time.';
  const start = new Date(`${date}T${time}`);
  if (!Number.isFinite(start.getTime())) return 'Choose a valid date and time.';
  if (start.getTime() <= now) return 'Choose a future start time so players can plan ahead.';
  return null;
}

export function runInviteUrl(origin: string, runId: string): string {
  return new URL(`/runs/${encodeURIComponent(runId)}`, origin).toString();
}
