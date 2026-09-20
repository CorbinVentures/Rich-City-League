'use client';
// CI diagnostic: verify the fantasy dashboard build before merging further changes.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaChartLine,
  FaChevronRight,
  FaClock,
  FaListOl,
  FaMagnifyingGlass,
  FaNewspaper,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { FantasyRoster, FantasySeason, FantasyTeam, PublicPlayer } from '@/types/database';
import { calculateFantasyPoints } from '@/lib/rcl-algorithms';

type RosterRow = FantasyRoster & { player?: PublicPlayer; fantasy_points?: number };
type FantasyMatchupRow = {
  id: string;
  fantasy_season_id: string;
  week_number: number;
  starts_at: string;
  ends_at: string;
  home_team_id: string;
  away_team_id: string;
  home_points: number;
  away_points: number;
  status: 'scheduled' | 'live' | 'final';
  winner_team_id: string | null;
};
type PlayerStatRow = {
  player_id: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
};
type FantasyTeamActivity = Pick<FantasyTeam, 'id' | 'name' | 'created_at'>;
type ScoringRules = Record<string, number>;

const starterPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
const rosterLimit = 8;

export default function FantasyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [season, setSeason] = useState<FantasySeason | null>(null);
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [fantasyTeams, setFantasyTeams] = useState<FantasyTeam[]>([]);
  const [matchups, setMatchups] = useState<FantasyMatchupRow[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStatRow[]>([]);
  const [teamActivity, setTeamActivity] = useState<FantasyTeamActivity[]>([]);
  const [teamName, setTeamName] = useState('');
  const [search, setSearch] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);

    const [seasonResult, playersResult] = await Promise.all([
      supabase.from('fantasy_seasons').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('public_players').select('*').eq('is_active', true).order('last_name').order('first_name').limit(250),
    ]);

    if (seasonResult.error || playersResult.error) {
      setMessage('Official fantasy data is not available yet.');
      setLoading(false);
      return;
    }

    const activeSeason = seasonResult.data as FantasySeason | null;
    const playerPool = (playersResult.data ?? []) as PublicPlayer[];
    setSeason(activeSeason);
    setPlayers(playerPool);

    if (!activeSeason) {
      setFantasyTeams([]);
      setMatchups([]);
      setLoading(false);
      return;
    }

    const [teamsResult, statsResult, activityResult, matchupResult] = await Promise.all([
      supabase.from('fantasy_teams').select('*').eq('fantasy_season_id', activeSeason.id).order('total_points', { ascending: false }).order('wins', { ascending: false }),
      supabase.from('player_game_stats').select('player_id,points,rebounds,assists,steals,blocks,turnovers'),
      supabase.from('fantasy_teams').select('id,name,created_at').eq('fantasy_season_id', activeSeason.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('fantasy_matchups').select('*').eq('fantasy_season_id', activeSeason.id).order('week_number').order('starts_at'),
    ]);

    setFantasyTeams((teamsResult.data ?? []) as FantasyTeam[]);
    setPlayerStats((statsResult.data ?? []) as PlayerStatRow[]);
    setTeamActivity((activityResult.data ?? []) as FantasyTeamActivity[]);
    setMatchups((matchupResult.data ?? []) as FantasyMatchupRow[]);

    if (user) {
      const teamResult = await supabase.from('fantasy_teams').select('*').eq('fantasy_season_id', activeSeason.id).eq('manager_id', user.id).maybeSingle();
      const fantasyTeam = teamResult.data as FantasyTeam | null;
      if (fantasyTeam) {
        setTeam(fantasyTeam);
        const [rosterResult, scoreResult] = await Promise.all([
          supabase.from('fantasy_rosters').select('*').eq('fantasy_team_id', fantasyTeam.id),
          supabase.from('fantasy_scores').select('player_id,fantasy_points').eq('fantasy_team_id', fantasyTeam.id),
        ]);
        const scoreMap = new Map<string, number>();
        for (const score of (scoreResult.data ?? []) as { player_id: string; fantasy_points: number }[]) {
          scoreMap.set(score.player_id, (scoreMap.get(score.player_id) ?? 0) + Number(score.fantasy_points ?? 0));
        }
        const rosterRows = (rosterResult.data ?? []) as FantasyRoster[];
        setRoster(rosterRows.map(item => ({
          ...item,
          player: playerPool.find(player => player.id === item.player_id),
          fantasy_points: scoreMap.get(item.player_id) ?? 0,
        })));
      } else {
        setTeam(null);
        setRoster([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, user, supabase]);

  useEffect(() => {
    if (authLoading || !season) return;
    const interval = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(interval);
  }, [authLoading, season, user, supabase]);

  const scoringRules = useMemo<ScoringRules>(() => {
    const raw = season?.scoring_rules;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { points: 1, rebounds: 1.2, assists: 1.5, steals: 3, blocks: 3, turnovers: -1 };
    return raw as ScoringRules;
  }, [season]);

  const playerRankings = useMemo(() => {
    const totals = new Map<string, PlayerStatRow>();
    for (const stat of playerStats) {
      const current = totals.get(stat.player_id) ?? { player_id: stat.player_id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0 };
      current.points += Number(stat.points ?? 0);
      current.rebounds += Number(stat.rebounds ?? 0);
      current.assists += Number(stat.assists ?? 0);
      current.steals += Number(stat.steals ?? 0);
      current.blocks += Number(stat.blocks ?? 0);
      current.turnovers += Number(stat.turnovers ?? 0);
      totals.set(stat.player_id, current);
    }
    return [...totals.values()]
      .map(stat => ({
        player: players.find(player => player.id === stat.player_id),
        points: calculateFantasyPoints(stat, scoringRules),
      }))
      .filter(item => item.player)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }, [playerStats, players, scoringRules]);

  const currentWeek = useMemo(() => {
    if (!matchups.length) return 1;
    const live = matchups.find(item => item.status === 'live');
    if (live) return live.week_number;
    const upcoming = matchups.find(item => item.status === 'scheduled');
    return upcoming?.week_number ?? matchups[matchups.length - 1]?.week_number ?? 1;
  }, [matchups]);

  const nextMatchup = useMemo(() => {
    if (!team) return matchups.find(item => item.status !== 'final') ?? null;
    return matchups.find(item => item.status !== 'final' && (item.home_team_id === team.id || item.away_team_id === team.id)) ?? null;
  }, [matchups, team]);

  const nextOpponent = nextMatchup && team
    ? fantasyTeams.find(item => item.id === (nextMatchup.home_team_id === team.id ? nextMatchup.away_team_id : nextMatchup.home_team_id))
    : null;

  const available = players
    .filter(player => !roster.some(item => item.player_id === player.id))
    .filter(player => `${player.first_name} ${player.last_name}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12);

  const starters = roster.filter(item => item.roster_slot === 'starter');
  const bench = roster.filter(item => item.roster_slot === 'bench');

  const createTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !user || !season || profile?.role !== 'fan' || teamName.trim().length < 2) return;
    setSaving(true);
    setMessage(null);
    const result = await supabase.from('fantasy_teams').insert({
      fantasy_season_id: season.id,
      manager_id: user.id,
      name: teamName.trim(),
    } as never).select().single();

    if (result.error) setMessage('Only fan accounts can create fantasy teams.');
    else {
      setTeam(result.data as FantasyTeam);
      setTeamName('');
      setMessage('Fantasy team created. Build your roster below.');
      void load();
    }
    setSaving(false);
  };

  const addPlayer = async (player: PublicPlayer) => {
    if (!supabase || !team || profile?.role !== 'fan' || roster.some(item => item.player_id === player.id) || roster.length >= rosterLimit) return;
    const preferredPosition = (player.position ?? '').toUpperCase();
    const hasOpenPosition = starterPositions.some(position => position === preferredPosition && !starters.some(item => item.player?.position?.toUpperCase() === position));
    const slot = hasOpenPosition && starters.length < 5 ? 'starter' : 'bench';
    const result = await supabase.from('fantasy_rosters').insert({
      fantasy_team_id: team.id,
      player_id: player.id,
      roster_slot: slot,
    } as never);

    if (!result.error) {
      setRoster(current => [...current, {
        fantasy_team_id: team.id,
        player_id: player.id,
        roster_slot: slot,
        acquired_at: new Date().toISOString(),
        player,
        fantasy_points: 0,
      }]);
      setSearch('');
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!supabase || !team) return;
    const result = await supabase.from('fantasy_rosters').delete().eq('fantasy_team_id', team.id).eq('player_id', playerId);
    if (!result.error) setRoster(current => current.filter(item => item.player_id !== playerId));
  };

  const setRosterSlot = async (playerId: string, rosterSlot: 'starter' | 'bench') => {
    if (!supabase || !team) return;
    if (rosterSlot === 'starter' && starters.length >= 5 && !starters.some(item => item.player_id === playerId)) {
      setMessage('Your starting lineup is full. Move a starter to the bench first.');
      return;
    }
    const result = await supabase.from('fantasy_rosters').update({ roster_slot: rosterSlot }).eq('fantasy_team_id', team.id).eq('player_id', playerId);
    if (!result.error) {
      setRoster(current => current.map(item => item.player_id === playerId ? { ...item, roster_slot: rosterSlot } : item));
      setMessage(null);
    }
  };

  if (authLoading || loading) {
    return <main className="min-h-screen bg-[#05080d] text-white"><Container maxWidth="xl" className="py-16"><div className="h-10 w-64 animate-pulse rounded bg-white/10" /><div className="mt-6 h-72 animate-pulse rounded-3xl bg-white/5" /></Container></main>;
  }

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#07111e]">
        <ContentAssetBackground assetKey="draft.cover" opacity={0.34} className="object-[center_30%]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,12,.98)_0%,rgba(3,7,12,.83)_45%,rgba(3,7,12,.3)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(34,133,220,.25),transparent_30rem)]" />
        <Container maxWidth="xl" className="relative py-10 sm:py-14">
          <div className="max-w-4xl">
            <p className="flex items-center gap-2 text-[10px] font-black tracking-[.28em] text-rcl-gold"><FaBasketball /> RICH CITY LEAGUE · THE 804 DRAFT ROOM</p>
            <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.85] sm:text-7xl lg:text-8xl">RCL <span className="text-rcl-orange">Fantasy</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65">Real players. Real games. Real bragging rights. Build your squad, watch official RCL stats update, and compete with the basketball community.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {!team && <Link href={user ? '#draft' : '/auth/sign-in?redirect=/fantasy'} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-[10px] font-black uppercase tracking-widest text-black hover:bg-orange-400"><FaTrophy /> {user ? 'Join League' : 'Sign in to play'}</Link>}
              <a href="#rules" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-5 text-[10px] font-black uppercase tracking-widest text-white hover:border-white/30"><FaBolt /> How it works</a>
            </div>
            <div className="mt-7 grid max-w-3xl grid-cols-3 gap-3">
              <Metric label="ROSTER" value={`${rosterLimit} spots`} />
              <Metric label="STARTERS" value="5" />
              <Metric label="SCORING" value="Official stats" />
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="py-7">
        {!user && <Notice icon={<FaUsers />} tone="blue">Sign in as a fan to create and manage your fantasy team. The player pool, rules and official scoring remain public.</Notice>}
        {user && profile?.role !== 'fan' && <Notice icon={<FaBolt />} tone="orange">RCL Fantasy is fan-first. Official and player accounts can view the player pool and league results, but fantasy team management is reserved for fan accounts.</Notice>}
        {message && <Notice icon={<FaBolt />} tone="orange">{message}</Notice>}
        {!season && <Notice icon={<FaClock />} tone="blue">No active fantasy season is published yet. This page is ready; once the league opens a fantasy season, the draft room will activate automatically.</Notice>}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <section className="space-y-5">
            {team ? (
              <Panel>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">MY FANTASY FRANCHISE</p>
                    <h2 className="mt-2 font-display text-3xl font-black uppercase">{team.name}</h2>
                    <p className="mt-1 text-xs text-white/35">{team.wins}-{team.losses} · Week {currentWeek}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-widest text-white/30">SEASON POINTS</p>
                    <p className="font-display text-4xl font-black text-rcl-gold">{Number(team.total_points ?? 0).toFixed(1)}</p>
                  </div>
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-5">
                  {starterPositions.map(position => {
                    const player = starters.find(item => item.player?.position?.toUpperCase() === position)?.player;
                    const row = player ? roster.find(item => item.player_id === player.id) : null;
                    return (
                      <div key={position} className="min-h-32 rounded-2xl border border-white/10 bg-black/30 p-3 transition hover:border-rcl-orange/40">
                        <p className="text-[9px] font-black tracking-wider text-white/30">{position} · STARTER</p>
                        {player ? (
                          <>
                            <Link href={`/players/${player.id}`} className="mt-4 block text-xs font-black hover:text-rcl-orange">{player.first_name} {player.last_name}</Link>
                            <p className="mt-1 text-[9px] text-white/35">{Number(row?.fantasy_points ?? 0).toFixed(1)} fantasy pts</p>
                            <button onClick={() => setRosterSlot(player.id, 'bench')} className="mt-3 text-[9px] font-black uppercase tracking-widest text-white/45 hover:text-white">Bench</button>
                          </>
                        ) : <p className="mt-5 text-xs font-black uppercase text-white/25">Open slot</p>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-7 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black tracking-[.2em] text-white/30">BENCH</p>
                    <h3 className="mt-1 font-display text-xl font-black uppercase">Depth</h3>
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-white/30">{roster.length}/{rosterLimit}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {bench.map(item => (
                    <div key={item.player_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                      <div>
                        <Link href={`/players/${item.player_id}`} className="block text-xs font-bold hover:text-rcl-orange">{item.player ? `${item.player.first_name} ${item.player.last_name}` : 'RCL player'}</Link>
                        <span className="text-[9px] text-white/30">{item.player?.position ?? 'RCL'} · {Number(item.fantasy_points ?? 0).toFixed(1)} pts</span>
                      </div>
                      <button onClick={() => setRosterSlot(item.player_id, 'starter')} className="rounded-lg border border-white/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider hover:border-rcl-orange/50">Start</button>
                    </div>
                  ))}
                  {!bench.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/30 sm:col-span-3">Bench is empty.</p>}
                </div>
              </Panel>
            ) : (
              <Panel id="draft">
                <p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">DRAFT ROOM ENTRY</p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase">Name your franchise</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">Create your fantasy team, then add up to 8 RCL players. Starting slots are organized by position whenever official player data provides a position.</p>
                <form onSubmit={createTeam} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} minLength={2} maxLength={60} disabled={!user || profile?.role !== 'fan' || !season} placeholder="Example: 804 Ballers" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-rcl-orange disabled:opacity-40" />
                  <button disabled={saving || !user || profile?.role !== 'fan' || !season} className="rounded-xl bg-rcl-orange px-6 py-3 text-xs font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Creating…' : 'Create team'}</button>
                </form>
              </Panel>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <Panel>
                <SectionHeader icon={<FaBolt />} title="Next Matchup" link={nextMatchup ? '#matchups' : undefined} />
                {nextMatchup ? (
                  <div className="mt-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Week {nextMatchup.week_number} · {formatDate(nextMatchup.starts_at)}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <TeamMark name={team?.name ?? getTeamName(fantasyTeams, nextMatchup.home_team_id)} />
                      <span className="font-display text-xl font-black text-white/30">VS</span>
                      <TeamMark name={nextOpponent?.name ?? getTeamName(fantasyTeams, nextMatchup.away_team_id)} />
                    </div>
                    <p className="mt-5 rounded-xl border border-rcl-blue/15 bg-rcl-blue/5 p-3 text-[10px] leading-5 text-white/45">Scores update from official RCL game statistics automatically. No manual fantasy stat entry.</p>
                  </div>
                ) : <Empty text={season ? 'Matchups will populate automatically once two or more fantasy teams join.' : 'No active fantasy season.'} />}
              </Panel>

              <Panel>
                <SectionHeader icon={<FaUsers />} title="League Chat" link="/social" linkLabel="See all" />
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-display text-lg font-black uppercase">Keep the trash talk in one place.</p>
                  <p className="mt-2 text-xs leading-5 text-white/40">Use RCL Social for league conversations, reactions, player debates and game-day energy.</p>
                  <Link href="/social" className="mt-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rcl-blue">Open RCL Social <FaArrowRight /></Link>
                </div>
              </Panel>
            </div>

            <section id="matchups">
              <Panel>
                <SectionHeader icon={<FaUsers />} title="Matchups" link="#rules" linkLabel="Rules" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">
                    <thead><tr className="border-b border-white/10 text-[8px] font-black uppercase tracking-widest text-white/25"><th className="px-2 py-3">Week</th><th className="px-2 py-3">Matchup</th><th className="px-2 py-3">Score</th><th className="px-2 py-3">Status</th></tr></thead>
                    <tbody>
                      {matchups.slice(0, 10).map(matchup => (
                        <tr key={matchup.id} className="border-b border-white/5 last:border-0">
                          <td className="px-2 py-3 text-xs font-black text-rcl-orange">{matchup.week_number}</td>
                          <td className="px-2 py-3 text-xs font-bold">{getTeamName(fantasyTeams, matchup.home_team_id)} <span className="mx-1 text-white/20">vs</span> {getTeamName(fantasyTeams, matchup.away_team_id)}</td>
                          <td className="px-2 py-3 text-xs font-black">{Number(matchup.home_points).toFixed(1)} - {Number(matchup.away_points).toFixed(1)}</td>
                          <td className="px-2 py-3 text-[9px] font-black uppercase tracking-widest text-white/35">{matchup.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!matchups.length && <Empty text="The schedule is generated automatically when the fantasy league has teams." />}
                </div>
              </Panel>
            </section>
          </section>

          <aside className="space-y-5">
            <Panel>
              <SectionHeader icon={<FaMagnifyingGlass />} title="Player Pool" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players…" className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs outline-none focus:border-rcl-orange" />
              <div className="mt-3 space-y-2">
                {available.map(player => (
                  <button type="button" key={player.id} onClick={() => addPlayer(player)} disabled={!team || roster.length >= rosterLimit} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-rcl-orange/50 disabled:cursor-not-allowed disabled:opacity-40">
                    <span><strong className="block text-xs">{player.first_name} {player.last_name}</strong><small className="text-[9px] text-white/30">{player.position ?? 'Position'} · {player.jersey_number ? `#${player.jersey_number}` : 'RCL'}</small></span>
                    <span className="text-rcl-orange">+</span>
                  </button>
                ))}
                {!available.length && <p className="py-6 text-center text-xs text-white/25">{players.length ? 'No available players match that search.' : 'No active RCL players are published yet.'}</p>}
              </div>
            </Panel>

            <Panel>
              <SectionHeader icon={<FaListOl />} title="Standings" link="#standings" />
              <div id="standings" className="mt-3 space-y-1">
                {fantasyTeams.slice(0, 8).map((item, index) => (
                  <div key={item.id} className={`grid grid-cols-[1.4rem_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 ${item.id === team?.id ? 'bg-rcl-orange/10 ring-1 ring-rcl-orange/20' : 'bg-black/15'}`}>
                    <span className="text-[9px] font-black text-rcl-orange">{index + 1}</span>
                    <span className="truncate text-xs font-bold">{item.name}</span>
                    <span className="text-[9px] font-black text-white/40">{item.wins}-{item.losses} · {Number(item.total_points).toFixed(1)}</span>
                  </div>
                ))}
                {!fantasyTeams.length && <Empty text="No fantasy teams yet." />}
              </div>
            </Panel>

            <Panel>
              <SectionHeader icon={<FaChartLine />} title="Player Rankings" link="/leaderboards" linkLabel="Full rankings" />
              <div className="mt-3 space-y-1">
                {playerRankings.map((item, index) => (
                  <Link key={item.player!.id} href={`/players/${item.player!.id}`} className="grid grid-cols-[1.4rem_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/[.04]">
                    <span className="text-[9px] font-black text-white/25">{index + 1}</span>
                    <span className="truncate text-xs font-bold">{item.player!.first_name} {item.player!.last_name}</span>
                    <span className="text-[10px] font-black text-rcl-gold">{item.points.toFixed(1)}</span>
                  </Link>
                ))}
                {!playerRankings.length && <Empty text="Official player statistics will populate rankings automatically." />}
              </div>
            </Panel>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel>
            <SectionHeader icon={<FaNewspaper />} title="Fantasy News" link="/news" />
            <div className="mt-4 space-y-3">
              <NewsRow title="Official-stat scoring is live" body="Fantasy totals are calculated from verified RCL game statistics." />
              <NewsRow title="Automatic matchup scheduling" body="Head-to-head weeks are generated from the active fantasy season." />
              <NewsRow title="Roster rules" body="Five starters plus a three-player bench make up each fantasy team." />
            </div>
          </Panel>

          <Panel>
            <SectionHeader icon={<FaClock />} title="Recent Activity" />
            <div className="mt-4 space-y-3">
              {teamActivity.map(item => <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0"><span className="text-xs font-bold">{item.name}</span><span className="text-[9px] text-white/30">joined {formatDate(item.created_at)}</span></div>)}
              {!teamActivity.length && <Empty text="No fantasy transactions or team activity yet." />}
            </div>
          </Panel>

          <Panel id="rules">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader icon={<FaBolt />} title="Rules & Scoring" />
              <button onClick={() => setRulesOpen(open => !open)} className="rounded-lg bg-rcl-orange px-3 py-2 text-[8px] font-black uppercase tracking-widest text-black">{rulesOpen ? 'Hide Rules' : 'View Rules'}</button>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(scoringRules).map(([key, value]) => <RuleRow key={key} label={labelRule(key)} value={value} />)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-widest text-white/35">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">8 roster spots</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">5 starters</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">Official stats</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">Auto scoring</div>
            </div>
            {rulesOpen && (
              <div className="mt-4 rounded-2xl border border-rcl-orange/20 bg-rcl-orange/5 p-4 text-xs leading-6 text-white/55">
                <p className="font-black uppercase tracking-widest text-rcl-orange">How RCL Fantasy works</p>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>Fantasy uses the active RCL player pool and official game statistics.</li>
                  <li>Five starters score as the starting lineup; three additional roster spots are the bench.</li>
                  <li>Fantasy points are recalculated automatically after official player-game statistics change and on the league refresh cycle.</li>
                  <li>Head-to-head matchups are generated automatically for the active fantasy season.</li>
                  <li>The published scoring rules on this page are the source of truth for fantasy scoring.</li>
                </ul>
              </div>
            )}
          </Panel>
        </div>

        {season && <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0c1c2c] to-black p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[.22em] text-rcl-gold">RCL FANTASY · AUTOMATION STATUS</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase">Official stats → fantasy points → matchup standings.</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">The database recalculates fantasy scoring automatically from verified RCL player-game statistics. The dashboard refreshes itself so managers do not have to enter stats manually.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-rcl-blue/20 bg-rcl-blue/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rcl-blue"><span className="h-2 w-2 animate-pulse rounded-full bg-rcl-blue" /> System synced</div>
          </div>
        </div>}
      </Container>
    </main>
  );
}

function Panel({ children, id }: { children: React.ReactNode; id?: string }) {
  return <section id={id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-[0_1rem_3rem_rgba(0,0,0,.16)] sm:p-6">{children}</section>;
}

function SectionHeader({ icon, title, link, linkLabel = 'See all' }: { icon: React.ReactNode; title: string; link?: string; linkLabel?: string }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display text-xl font-black uppercase"><span className="text-rcl-orange">{icon}</span>{title}</h2>{link && <Link href={link} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-rcl-blue">{linkLabel}<FaChevronRight /></Link>}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur"><p className="text-[8px] font-black tracking-widest text-white/30">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>;
}

function Notice({ children, icon, tone }: { children: React.ReactNode; icon: React.ReactNode; tone: 'blue' | 'orange' }) {
  return <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${tone === 'orange' ? 'border-rcl-orange/20 bg-rcl-orange/5 text-white/55' : 'border-rcl-blue/20 bg-rcl-blue/5 text-white/55'}`}><span className={tone === 'orange' ? 'mt-0.5 text-rcl-orange' : 'mt-0.5 text-rcl-blue'}>{icon}</span><span>{children}</span></div>;
}

function TeamMark({ name }: { name: string }) {
  return <div className="min-w-0 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rcl-orange/20 bg-black/40 text-rcl-orange"><FaBasketball /></div><p className="mt-2 max-w-28 truncate text-[10px] font-black uppercase">{name}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs leading-5 text-white/30">{text}</div>;
}

function NewsRow({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-black">{title}</p><p className="mt-1 text-[10px] leading-5 text-white/35">{body}</p></div>;
}

function RuleRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"><span className="text-[9px] font-black uppercase tracking-widest text-white/45">{label}</span><span className={`text-xs font-black ${value < 0 ? 'text-red-300' : 'text-rcl-gold'}`}>{value > 0 ? '+' : ''}{value}</span></div>;
}

function labelRule(key: string) {
  return key === 'points' ? 'Points' : key === 'rebounds' ? 'Rebounds' : key === 'assists' ? 'Assists' : key === 'steals' ? 'Steals' : key === 'blocks' ? 'Blocks' : key === 'turnovers' ? 'Turnovers' : key.replaceAll('_', ' ');
}

function getTeamName(teams: FantasyTeam[], id: string) {
  return teams.find(team => team.id === id)?.name ?? 'RCL Fantasy Team';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}
