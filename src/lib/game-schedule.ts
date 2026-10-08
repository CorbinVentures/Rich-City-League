/** Nearest scheduled games first, independent of server/browser timezone. */
export function getUpcomingGames<T extends { status: string; scheduled_at: string }>(games: readonly T[], now = Date.now()): T[] {
  return games.filter(game => game.status === 'scheduled' && new Date(game.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
}
