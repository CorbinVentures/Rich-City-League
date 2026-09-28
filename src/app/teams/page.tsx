import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot } from '@/lib/public-data';
import { TeamsDirectory } from '@/components/PublicDirectory';

export const metadata: Metadata = { title:{ absolute:'Richmond Basketball Teams | Rich City League' }, description:'Explore Rich City League teams, rosters, records and divisions competing in Richmond, Virginia basketball.', alternates:{canonical:'/teams'} };

export const revalidate = 60;

export default async function TeamsPage() {
  const { teams, teamSeasons, seasons, divisions, standings } = await getLeagueSnapshot();
  const divisionById = new Map(divisions.map((division) => [division.id, division.name]));
  const seasonById = new Map(seasons.map((season) => [season.id, season.name]));
  const items = teams.map((team) => {
    const assignment = teamSeasons.find((item) => item.team_id === team.id && seasons.some((season) => season.id === item.season_id && season.status !== 'archived'));
    const record = standings.find((standing) => standing.team_id === team.id && standing.season_id === assignment?.season_id);
    return { id: team.id, name: team.name, slug: team.slug, logo_url: team.logo_url, primary_color: team.primary_color, division: assignment ? divisionById.get(assignment.division_id ?? '') ?? null : null, season: assignment ? seasonById.get(assignment.season_id) ?? null : null, wins: record?.wins ?? null, losses: record?.losses ?? null };
  });
  const assigned = items.filter((item) => item.division).length;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCL League Directory"
      title="Teams"
      accent="Richmond represented"
      description="Explore every active RCL team, current division placement, official season record, and the identities competing across the city."
      assetKey="teams.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.2em] text-white/35">League field</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">teams</span></p><p className="mt-2 text-xs text-rcl-blue">{assigned} division assignments</p></div>}
    />
    <Container maxWidth="xl" className="py-10 sm:py-12">
      <TeamsDirectory items={items} />
    </Container>
  </main>;
}
