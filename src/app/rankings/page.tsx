import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { FaChartLine, FaCrown, FaRankingStar, FaStar } from 'react-icons/fa6';

export const revalidate = 60;

type StatRow = { game_id: string; player_id: string; points: number; rebounds: number; assists: number; steals: number; blocks: number };

export default async function RankingsPage() {
  const client = getPublicClient();
  const snapshot = await getLeagueSnapshot();
  const currentSeason = snapshot.seasons.find((season) => season.status === 'active')
    ?? snapshot.seasons.find((season) => season.status === 'registration')
    ?? snapshot.seasons[0]
    ?? null;
  const completedGameIds = new Set(snapshot.games.filter((game) => game.status === 'completed' && (!currentSeason || game.season_id === currentSeason.id)).map((game) => game.id));

  const [{ data: rawPlayers }, { data: playerStatsRaw }, { data: standingsData }, { data: coachesData }] = client
    ? await Promise.all([
        client.from('public_players').select('*, iq:public_player_iq(*)').eq('is_active', true),
        client.from('player_game_stats').select('game_id,player_id,points,rebounds,assists,steals,blocks'),
        currentSeason ? client.from('standings').select('*, team:teams(*)').eq('season_id', currentSeason.id).order('rank', { ascending: true, nullsFirst: false }) : Promise.resolve({ data: [] }),
        client.from('team_coaches').select('*, profile:profiles(*)'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const playerStats = ((playerStatsRaw ?? []) as StatRow[]).filter((stat) => completedGameIds.has(stat.game_id));
  const statsByPlayer = new Map<string, StatRow[]>();
  for (const stat of playerStats) {
    const current = statsByPlayer.get(stat.player_id) ?? [];
    current.push(stat);
    statsByPlayer.set(stat.player_id, current);
  }

  const players = (rawPlayers ?? []).map((player: any) => {
    const stats = statsByPlayer.get(player.id) ?? [];
    const average = (key: keyof Omit<StatRow, 'game_id' | 'player_id'>) => stats.length ? stats.reduce((total, stat) => total + Number(stat[key] ?? 0), 0) / stats.length : 0;
    return {
      ...player,
      games: stats.length,
      ppg: average('points'),
      rpg: average('rebounds'),
      apg: average('assists'),
      spg: average('steals'),
      bpg: average('blocks'),
      ovr: player.iq?.rcl_rating ?? null,
    };
  });

  const eligiblePlayers = players.filter((player: any) => player.games > 0);
  const ppgLeaders = [...eligiblePlayers].sort((a: any, b: any) => b.ppg - a.ppg).slice(0, 5);
  const rpgLeaders = [...eligiblePlayers].sort((a: any, b: any) => b.rpg - a.rpg).slice(0, 5);
  const apgLeaders = [...eligiblePlayers].sort((a: any, b: any) => b.apg - a.apg).slice(0, 5);
  const ovrLeaders = [...eligiblePlayers].filter((player: any) => player.ovr !== null).sort((a: any, b: any) => b.ovr - a.ovr).slice(0, 5);

  const standings = standingsData ?? [];
  const teams = standings.map((standing: any) => {
    const wins = Number(standing.wins ?? 0);
    const losses = Number(standing.losses ?? 0);
    const gp = wins + losses;
    return {
      ...standing.team,
      rank: standing.rank,
      wins,
      losses,
      gp,
      pct: gp ? Math.round((wins / gp) * 100) : 0,
      diff: Number(standing.points_for ?? 0) - Number(standing.points_against ?? 0),
    };
  }).filter((team: any) => team.id);

  const currentTeamIds = new Set(teams.map((team: any) => team.id));
  const coaches = (coachesData ?? []).filter((coach: any) => currentTeamIds.has(coach.team_id)).map((coach: any) => {
    const row = standings.find((standing: any) => standing.team_id === coach.team_id);
    const wins = Number(row?.wins ?? 0);
    const losses = Number(row?.losses ?? 0);
    const gp = wins + losses;
    return { ...coach, wins, losses, pct: gp ? Math.round((wins / gp) * 100) : 0 };
  }).sort((a: any, b: any) => b.wins - a.wins || b.pct - a.pct);

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Official RCL Rankings"
      title="Rankings"
      accent="Earned on the court"
      description={`${currentSeason?.name ?? 'Current season'} rankings use only finalized RCL game data for player production, team records, and coaching results.`}
      assetKey="league.cover"
      meta={<div className="min-w-48 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Official sample</p><p className="mt-1 font-display text-3xl font-black">{completedGameIds.size}<span className="ml-2 text-xs text-white/35">finals</span></p><p className="mt-2 text-xs text-rcl-blue">{eligiblePlayers.length} players qualified</p></div>}
    />

    <Container maxWidth="xl" className="space-y-12 py-10 sm:py-12">
      <section>
        <SectionHeading icon={<FaCrown />} eyebrow="Player production" title="Stat leaders" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LeaderCard title="Overall OVR" leaders={ovrLeaders} value={(player) => `${player.ovr} OVR`} accent />
          <LeaderCard title="Points per game" leaders={ppgLeaders} value={(player) => `${player.ppg.toFixed(1)} PPG`} />
          <LeaderCard title="Rebounds per game" leaders={rpgLeaders} value={(player) => `${player.rpg.toFixed(1)} RPG`} />
          <LeaderCard title="Assists per game" leaders={apgLeaders} value={(player) => `${player.apg.toFixed(1)} APG`} />
        </div>
      </section>

      <section>
        <SectionHeading icon={<FaRankingStar />} eyebrow="Current season" title="Team rankings" />
        <div className="mt-5 overflow-x-auto rounded-2xl border border-rcl-blue/15 bg-[#071522]/55">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-rcl-blue/[.055] text-xs font-black uppercase tracking-wider text-white/35"><tr><th className="px-4 py-4">Rank</th><th className="px-4 py-4">Team</th><th className="px-4 py-4 text-center">GP</th><th className="px-4 py-4 text-center">W</th><th className="px-4 py-4 text-center">L</th><th className="px-4 py-4 text-center">Win %</th><th className="px-4 py-4 text-center">Diff</th></tr></thead>
            <tbody>{teams.length ? teams.map((team: any, index: number) => <tr key={team.id} className="border-t border-white/10 transition hover:bg-rcl-blue/[.035]"><td className="px-4 py-4 font-display text-lg font-black text-rcl-orange">{team.rank ?? index + 1}</td><td className="px-4 py-4"><Link href={`/teams/${team.slug}`} className="font-black uppercase transition hover:text-rcl-blue">{team.name}</Link></td><td className="px-4 py-4 text-center">{team.gp}</td><td className="px-4 py-4 text-center font-black">{team.wins}</td><td className="px-4 py-4 text-center">{team.losses}</td><td className="px-4 py-4 text-center">{team.pct}%</td><td className={`px-4 py-4 text-center font-black ${team.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{team.diff >= 0 ? '+' : ''}{team.diff}</td></tr>) : <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-white/35">No current-season team results are available yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeading icon={<FaChartLine />} eyebrow="Leadership results" title="Coach standings" />
        {coaches.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coaches.map((coach: any, index: number) => {
          const profile = coach.profile;
          const name = profile?.display_name ?? ([profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'RCL Coach');
          return <Link href={`/coaches/${coach.profile_id}`} key={coach.id} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5 transition hover:-translate-y-1 hover:border-rcl-blue/45"><div className="flex items-start justify-between gap-4"><span className="font-display text-xl font-black text-rcl-orange">{String(index + 1).padStart(2,'0')}</span><FaStar className="text-rcl-blue/35"/></div><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-rcl-blue">{coach.title || 'Coach'}</p><h3 className="mt-1 font-display text-xl font-black uppercase group-hover:text-rcl-blue">{name}</h3><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-xs uppercase text-white/30">Wins</p><p className="mt-1 font-display text-2xl font-black">{coach.wins}</p></div><div className="text-right"><p className="text-xs uppercase text-white/30">Win rate</p><p className="mt-1 font-display text-2xl font-black">{coach.pct}%</p></div></div></Link>;
        })}</div> : <EmptyState text="Coach standings will appear once current-season team results are available." />}
      </section>
    </Container>
  </main>;
}

function SectionHeading({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return <div className="flex items-end justify-between gap-4 border-b border-rcl-blue/15 pb-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{eyebrow}</p><h2 className="mt-1 font-display text-3xl font-black uppercase">{title}</h2></div><span className="text-xl text-rcl-blue/55">{icon}</span></div>;
}

function LeaderCard({ title, leaders, value, accent = false }: { title: string; leaders: any[]; value: (player: any) => string; accent?: boolean }) {
  return <div className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55"><div className="border-b border-white/10 px-5 py-4"><p className={`text-xs font-black uppercase tracking-[.16em] ${accent ? 'text-rcl-orange' : 'text-rcl-blue'}`}>{title}</p></div><div>{leaders.length ? leaders.map((player, index) => <div key={player.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-white/10 px-5 py-3 first:border-t-0"><span className="font-display font-black text-white/25">{index + 1}</span><Link href={`/players/${player.id}`} className="truncate text-sm font-bold transition hover:text-rcl-blue">{player.first_name} {player.last_name}</Link><span className="font-display text-sm font-black">{value(player)}</span></div>) : <p className="px-5 py-8 text-center text-sm text-white/30">No finalized stats yet.</p>}</div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="mt-5 rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-10 text-center text-sm text-white/40">{text}</div>; }
