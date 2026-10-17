export type WorldCategory = 'territory' | 'highlights' | 'runs';

export type WorldEvent = {
  id: string;
  category: WorldCategory;
  occurredAt: string;
  title: string;
  description: string;
  place: string;
  href: string;
  label: string;
};

export type TerritoryRow = { court_slug: string; crew_id: string; since_at: string; successful_defenses: number };
export type ChallengeRow = { id: string; court_slug: string; challenger_crew_id: string; defender_crew_id: string; winning_crew_id: string | null; status: string; created_at: string; resolved_at: string | null; run_id: string };
export type HighlightRow = { id: string; author_id: string; body: string | null; media_urls: string[] | null; created_at: string };
export type RunRow = { id: string; title: string; location: string; location_slug: string | null; game_format: string; starts_at: string; status: string };

export function buildWorldEvents(input: {
  territories: TerritoryRow[];
  challenges: ChallengeRow[];
  highlights: HighlightRow[];
  runs: RunRow[];
  courtNames: Record<string, string>;
  crewNames: Record<string, string>;
  authorNames: Record<string, string>;
  now?: number;
}): WorldEvent[] {
  const now = input.now ?? Date.now();
  const courtName = (slug: string) => input.courtNames[slug] || slug.replace(/-/g, ' ');
  const crewName = (id: string) => input.crewNames[id] || 'An RCH crew';
  const territory: WorldEvent[] = input.territories
    .filter(t => !!t.court_slug && !!t.crew_id)
    .map(t => ({
      id: 'court-' + t.court_slug,
      category: 'territory',
      occurredAt: t.since_at,
      title: crewName(t.crew_id) + ' controls ' + courtName(t.court_slug),
      description: t.successful_defenses > 0
        ? t.successful_defenses + ' verified title defense' + (t.successful_defenses === 1 ? '' : 's') + '.'
        : 'Current recorded territory holder. Explore the court for rankings and contenders.',
      place: courtName(t.court_slug),
      href: '/runs/courts/' + encodeURIComponent(t.court_slug),
      label: 'Court control',
    }));
  const challenges: WorldEvent[] = input.challenges
    .filter(t => !!t.court_slug && ['requested', 'accepted', 'resolved'].includes(t.status))
    .map(t => ({
      id: 'challenge-' + t.id,
      category: 'territory',
      occurredAt: t.status === 'resolved' ? t.resolved_at || t.created_at : t.created_at,
      title: t.status === 'resolved'
        ? crewName(t.winning_crew_id || '') + ' won a takeover at ' + courtName(t.court_slug)
        : crewName(t.challenger_crew_id) + ' challenged ' + crewName(t.defender_crew_id),
      description: t.status === 'resolved'
        ? 'Takeover result recorded from a verified competitive match.'
        : t.status === 'accepted'
          ? 'Challenge accepted. A verified result is still required to determine control.'
          : 'Takeover requested. The defending captain has not yet accepted.',
      place: courtName(t.court_slug),
      href: '/runs/courts/' + encodeURIComponent(t.court_slug),
      label: t.status === 'resolved' ? 'Verified takeover' : 'Crew challenge',
    }));
  const highlights: WorldEvent[] = input.highlights
    .filter(h => h.id && Array.isArray(h.media_urls) && h.media_urls.length > 0)
    .map(h => ({
      id: 'post-' + h.id,
      category: 'highlights',
      occurredAt: h.created_at,
      title: input.authorNames[h.author_id] || 'RCH community highlight',
      description: h.body?.trim().slice(0, 185) || 'Watch a new basketball community post.',
      place: 'Community',
      href: '/social?post=' + encodeURIComponent(h.id),
      label: 'Member post · not game-verified',
    }));
  const upcoming: WorldEvent[] = input.runs
    .filter(r => r.status === 'open' && Date.parse(r.starts_at) > now)
    .map(r => ({
      id: 'run-' + r.id,
      category: 'runs',
      occurredAt: r.starts_at,
      title: r.title,
      description: r.game_format + ' · ' + r.location + ' · Tap to see event details and registration.',
      place: r.location,
      href: '/runs/' + encodeURIComponent(r.id),
      label: 'Upcoming run · scheduled',
    }));
  // Past recorded events first. Upcoming sessions are separately marked as scheduled,
  // never misrepresented as live or verified basketball results.
  return [...territory, ...challenges, ...highlights, ...upcoming].sort((a, b) => {
    const aFuture = a.category === 'runs';
    const bFuture = b.category === 'runs';
    if (aFuture !== bFuture) return aFuture ? 1 : -1;
    return aFuture
      ? Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
      : Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
  });
}

export function filterWorldEvents(events: WorldEvent[], category: 'all' | WorldCategory, city: string | null, nearby: boolean): WorldEvent[] {
  const needle = (city || '').trim().toLowerCase().replace(/-/g, ' ');
  return events.filter(e => (category === 'all' || e.category === category) &&
    (!nearby || !needle || (e.title + ' ' + e.place + ' ' + e.description).toLowerCase().includes(needle)));
}
