import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getPublicClient } from '@/lib/public-data';
import type { PublicPlayer } from '@/types/database';
import { FaArrowRight, FaBasketball, FaUsers } from 'react-icons/fa6';

export const metadata: Metadata = { title:{ absolute:'Richmond Basketball Players | RCL Player Directory' }, description:'Explore active Rich City League basketball players, team rosters, positions and player profiles from Richmond, Virginia.', alternates:{canonical:'/players'} };

export const revalidate = 60;

type TeamGroup = { id: string; name: string; players: PublicPlayer[] };
type TeamSeasonRow = { id: string; team_id: string };
type TeamRow = { id: string; name: string };
type RosterRow = { player_id: string; team_season_id: string };

export default async function PlayersPage() {
  const client = getPublicClient();
  if (!client) return <DirectoryFailure />;
  const [{ data: playersRaw, error }, { data: seasonsRaw }, { data: teamsRaw }, { data: rostersRaw }] = await Promise.all([
    client.from('public_players').select('*').order('last_name').order('first_name'),
    client.from('seasons').select('id').eq('status', 'active').order('start_date', { ascending: false }).limit(1),
    client.from('teams').select('id,name').eq('is_active', true).order('name'),
    client.from('rosters').select('player_id,team_season_id').is('left_at', null),
  ]);
  if (error) return <DirectoryFailure />;
  const players = (playersRaw ?? []) as PublicPlayer[];
  const seasons = (seasonsRaw ?? []) as { id: string }[];
  const teams = (teamsRaw ?? []) as TeamRow[];
  const rosters = (rostersRaw ?? []) as RosterRow[];
  const activeSeasonId = seasons[0]?.id;
  const teamSeasonResult = activeSeasonId ? await client.from('team_seasons').select('id,team_id').eq('season_id', activeSeasonId) : { data: [] as TeamSeasonRow[] };
  const teamBySeason = new Map(((teamSeasonResult.data ?? []) as TeamSeasonRow[]).map(row => [row.id, row.team_id]));
  const playerMap = new Map(players.map(player => [player.id, player]));
  const teamMap = new Map(teams.map(team => [team.id, team.name]));
  const groups = new Map<string, TeamGroup>();
  for (const roster of rosters) {
    const teamId = teamBySeason.get(roster.team_season_id);
    const player = playerMap.get(roster.player_id);
    if (!teamId || !player) continue;
    if (!groups.has(teamId)) groups.set(teamId, { id: teamId, name: teamMap.get(teamId) ?? 'RCL Team', players: [] });
    groups.get(teamId)!.players.push(player);
  }
  for (const group of groups.values()) group.players.sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
  const groupedPlayers = [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const groupedIds = new Set(groupedPlayers.flatMap(group => group.players.map(player => player.id)));
  const freeAgents = players.filter(player => !groupedIds.has(player.id)).sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="RCL League Directory"
      title="Players"
      accent="The league"
      description="Every active player in one official directory, organized by current team so fans, coaches, and hoopers can move from roster to profile without digging through the platform."
      assetKey="players.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.2em] text-white/35">Directory</p><p className="mt-1 font-display text-3xl font-black">{players.length}<span className="ml-2 text-xs text-white/35">players</span></p><p className="mt-2 text-xs text-rcl-blue">{groupedPlayers.length} active team rosters</p></div>}
    />

    <Container maxWidth="xl" className="py-10 sm:py-12">
      <div className="space-y-10">
        {groupedPlayers.map(group=><section key={group.id} className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-orange text-black"><FaBasketball/></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Team roster</p><h2 className="truncate font-display text-2xl font-black uppercase">{group.name}</h2></div>
            <span className="rounded-full border border-rcl-blue/15 bg-rcl-blue/5 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white/45">{group.players.length} players</span>
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">{group.players.map(player=><PlayerCard key={player.id} player={player}/>)}</div>
        </section>)}

        {freeAgents.length>0&&<section className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/45">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6"><span className="grid h-10 w-10 place-items-center rounded-xl border border-rcl-blue/20 bg-rcl-blue/10 text-rcl-blue"><FaUsers/></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">Directory</p><h2 className="font-display text-2xl font-black uppercase">Unassigned / Free Agents</h2></div></div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">{freeAgents.map(player=><PlayerCard key={player.id} player={player}/>)}</div>
        </section>}

        {!groupedPlayers.length&&!freeAgents.length&&<div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] px-6 py-14 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Player directory</p><h2 className="mt-3 font-display text-3xl font-black uppercase">The roster is being built.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Active players will appear here once official roster assignments are available.</p></div>}
      </div>
    </Container>
  </main>;
}

function PlayerCard({player}:{player:PublicPlayer}){
  return <Link href={`/players/${player.id}`} className="group relative min-h-40 bg-[#050b12] p-5 transition hover:bg-rcl-blue/[.055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-blue">
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="font-display text-xl font-black uppercase leading-tight group-hover:text-rcl-blue">{player.last_name}, {player.first_name}</p><p className="mt-2 text-xs uppercase tracking-wider text-white/40">{player.position ?? 'Position unlisted'}{player.jersey_number?` · #${player.jersey_number}`:''}</p></div>
        <FaArrowRight className="mt-1 shrink-0 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange" />
      </div>
      <p className="text-xs font-black uppercase tracking-[.14em] text-white/25">{player.hometown ?? 'Rich City League'}</p>
    </div>
  </Link>;
}

function DirectoryFailure(){
  return <main className="min-h-[65svh] bg-rcl-black text-white"><Container maxWidth="xl" className="py-16"><div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8"><p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Player directory</p><h1 className="mt-3 font-display text-3xl font-black uppercase">Directory temporarily unavailable</h1><p className="mt-3 text-sm text-white/50">The public player directory could not be loaded. Please try again shortly.</p></div></Container></main>;
}
