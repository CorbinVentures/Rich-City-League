/** Classification is conservative: an event is never presented as AAU/pro without explicit title evidence. */
export type SceneCategory = 'runs' | 'tournaments' | 'training' | 'leagues' | 'aau' | 'pro' | 'tryouts' | 'events';
export type SceneGoal = 'hoop' | 'compete' | 'improve' | 'noticed';
export type SceneWhen = 'any' | 'today' | 'weekend' | 'week';

export function classifySceneOpportunity(source: 'run' | 'event', kind: string, title: string): SceneCategory {
  if (source === 'run') return kind === 'training' ? 'training' : 'runs';
  const value = kind.toLowerCase();
  if (value === 'tryout') {
    if (/\bAAU\b|amateur athletic union/i.test(title)) return 'aau';
    if (/\bpro(?:fessional)?\b|\bABA\b|\bTBL\b|\bNBA G[ -]?LEAGUE\b/i.test(title)) return 'pro';
    return 'tryouts';
  }
  if (value === 'tournament') return 'tournaments';
  if (value === 'league') return 'leagues';
  if (value === 'camp' || value === 'clinic') return 'training';
  if (value === 'run') return 'runs';
  return 'events';
}

export function sceneMatchesWhen(iso: string, when: SceneWhen, now = new Date()): boolean {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.getTime() < now.getTime()) return false;
  if (when === 'any') return true;
  if (when === 'today') return date.toDateString() === now.toDateString();
  if (when === 'week') return date.getTime() < now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const start = new Date(now);
  const day = now.getDay();
  start.setDate(now.getDate() + (day === 0 ? -1 : 6 - day));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 2);
  return date >= start && date < end;
}

export function sceneGoalScore(category: SceneCategory, goal: SceneGoal): number {
  const matches: Record<SceneGoal, SceneCategory[]> = {
    hoop: ['runs', 'tournaments', 'leagues'],
    compete: ['tournaments', 'leagues', 'runs', 'tryouts'],
    improve: ['training', 'runs', 'events'],
    noticed: ['pro', 'aau', 'tryouts', 'events', 'tournaments']
  };
  const idx = matches[goal].indexOf(category);
  return idx === -1 ? 0 : (matches[goal].length - idx) * 10;
}
