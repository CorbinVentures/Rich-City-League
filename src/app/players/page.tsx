import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import type { PublicPlayer } from '@/types/database';
import { FaBasketball, FaUsers } from 'react-icons/fa6';

export const revalidate = 60;

type TeamGroup = { id: string; name: string; players: PublicPlayer[] };
type TeamSeasonRow = { id: string; team_id: string };
type TeamRow = { id: string; name: string };
type RosterRow = { player_id: string; team_season_id: string; status: string };

export default async function PlayersPage() {
  const client = getPublicClient();
  if (!client) return <main><Container maxWidth="xl" className="py-16"><p className="text-red-300">Player directory is temporarily unavailable.</p></Container></main>;
  const [{ data: playersRaw, error }, { data: seasonsRaw }, { data: teamsRaw }, { data: rostersRaw }] = await Promise.all([
    client.from('public_players').select('*').order('last_name').order('first_name'),
    client.from('seasons').select('id').eq('status', 'active').order('start_date', { ascending: false }).limit(1),
    client.from('teams').select('id,name').eq('is_active', true).order('name'),
    client.from('rosters').select('player_id,team_season_id,status').eq('status', 'ACTIVE'),
  ]);
  if (error) return <main><Container maxWidth="xl" className="py-16"><p className="text-red-300">Player directory is temporarily unavailable.</p></Container></main>;
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
  for (const roster of rosters) { const teamId = teamBySeason.get(roster.team_season_id); const player = playerMap.get(roster.player_id); if (!teamId || !player) continue; if (!groups.has(teamId)) groups.set(teamId, { id: teamId, name: teamMap.get(teamId) ?? 'RCL Team', players: [] }); groups.get(teamId)!.players.push(player); }
  for (const group of groups.values()) group.players.sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
  const groupedPlayers = [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const groupedIds = new Set(groupedPlayers.flatMap(group => group.players.map(player => player.id)));
  const freeAgents = players.filter(player => !groupedIds.has(player.id)).sort((a,b)=>`${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));

  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14"><div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">RCL league directory</p><h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-6xl">Players</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Every active player, organized by team and alphabetized by last name so the city can find its next bucket getter.</p></div><div className="rounded-2xl border border-white/10 bg-white/[.03] px-5 py-4"><p className="text-[9px] font-black tracking-widest text-white/35">DIRECTORY</p><p className="mt-1 font-display text-2xl font-black">{players.length}<span className="ml-2 text-xs text-white/35">PLAYERS</span></p></div></div>
  <div className="mt-8 space-y-8">{groupedPlayers.map(group=><section key={group.id}><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rcl-orange text-black"><FaBasketball/></span><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">TEAM ROSTER</p><h2 className="font-display text-2xl font-black uppercase">{group.name}</h2></div><span className="ml-auto text-xs text-white/30">{group.players.length} players</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.players.map(player=><PlayerCard key={player.id} player={player}/>)}</div></section>)}
    {freeAgents.length>0&&<section><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.03]"><FaUsers/></span><div><p className="text-[9px] font-black tracking-[.2em] text-white/35">DIRECTORY</p><h2 className="font-display text-2xl font-black uppercase">Unassigned / Free Agents</h2></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{freeAgents.map(player=><PlayerCard key={player.id} player={player}/>)}</div></section>}
    {!groupedPlayers.length&&!freeAgents.length&&<p className="rounded-2xl border border-white/10 p-8 text-white/40">No active players are currently listed.</p>}</div>
  </Container></main>;
}
function PlayerCard({player}:{player:PublicPlayer}){return <Link href={`/players/${player.id}`} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-rcl-orange/40 hover:bg-white/[.045]"><div className="flex items-start justify-between gap-4"><div><p className="font-display text-xl font-black uppercase group-hover:text-rcl-orange">{player.last_name}, {player.first_name}</p><p className="mt-2 text-xs text-white/45">{player.position ?? 'Position unlisted'}{player.jersey_number?` · #${player.jersey_number}`:''}</p></div><span className="text-[9px] font-black tracking-widest text-rcl-gold">VIEW</span></div>{player.hometown&&<p className="mt-4 text-[10px] uppercase tracking-widest text-white/25">{player.hometown}</p>}</Link>}
