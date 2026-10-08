/** Utilities for reliable, shareable Richmond basketball run scheduling. */
export function validateRunStart(date: string, time: string, now = Date.now()): string | null {
  if (!date || !time) return 'Choose a date and start time.';
  const start = new Date(`${date}T${time}`);
  if (!Number.isFinite(start.getTime())) return 'Choose a valid date and time.';
  if (start.getTime() <= now) return 'Choose a future start time so players can plan ahead.';
  return null;
}

/** Local calendar arithmetic preserves the host's clock time over daylight saving transitions. */
export function buildWeeklyRunStarts(date: string, time: string, weeks: 1 | 4, now = Date.now()): string[] {
  const problem = validateRunStart(date, time, now);
  if (problem) throw new Error(problem);
  if (weeks !== 1 && weeks !== 4) throw new Error('Only a single run or four weekly runs can be scheduled.');
  const initial = new Date(`${date}T${time}`);
  return Array.from({ length: weeks }, (_, index) => {
    const scheduled = new Date(initial.getTime());
    scheduled.setDate(scheduled.getDate() + 7 * index);
    return scheduled.toISOString();
  });
}

export function runInviteUrl(origin: string, runId: string): string {
  return new URL(`/runs/${encodeURIComponent(runId)}`, origin).toString();
}
