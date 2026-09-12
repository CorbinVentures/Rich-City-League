import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { TeamsDirectory } from '@/components/PublicDirectory';

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
  return <main className="min-h-screen bg-rcl-black pb-24"><section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(255,107,26,0.18),transparent_60%)] py-16"><Container maxWidth="xl"><p className="text-xs font-bold uppercase tracking-[0.25em] text-rcl-gold">League directory</p><h1 className="mt-3 font-display text-5xl font-bold sm:text-7xl">RCL <span className="text-rcl-gold">TEAMS</span></h1><p className="mt-4 max-w-xl text-gray-400">Discover the teams representing Richmond. Different hoods. One league. A stronger Richmond.</p></Container></section><Container maxWidth="xl" className="py-10"><TeamsDirectory items={items} /></Container></main>;
}
