'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, Player, PlayerGameStats, Season, Team, TeamCoach, TeamSeason, UserLevel } from '@/types/database';

type CareerData = { player: Player | null; stats: PlayerGameStats[]; games: Game[]; seasons: Season[]; teams: Team[]; iq: { rcl_rating: number; exposure_index: number; previous_rating: number | null } | null; badges: { id: string; name: string; icon: string }[]; level: UserLevel | null; coach: TeamCoach | null };
const empty: CareerData = { player: null, stats: [], games: [], seasons: [], teams: [], iq: null, badges: [], level: null, coach: null };

export default function DashboardWorkspace() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [data, setData] = useState<CareerData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !supabase) { setLoading(false); return; }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const levelResult = await supabase.from('user_levels').select('*').eq('profile_id', user.id).maybeSingle();
        if (profile?.role === 'player') {
          const playerResult = await supabase.from('players').select('*').eq('profile_id', user.id).maybeSingle();
          if (playerResult.error) throw playerResult.error;
          if (!playerResult.data) { if (active) setData({ ...empty, level: levelResult.data }); return; }
          const player = playerResult.data;
          const [statsResult, iqResult, badgeResult] = await Promise.all([
            supabase.from('player_game_stats').select('*').eq('player_id', player.id),
            supabase.from('public_player_iq').select('rcl_rating, exposure_index, previous_rating').eq('player_id', player.id).maybeSingle(),
            supabase.from('player_badges').select('id, badge:badges(name, icon)').eq('player_id', player.id),
          ]);
          const stats = statsResult.data ?? [];
          const gameIds = [...new Set(stats.map((item) => item.game_id))];
          const gamesResult = gameIds.length ? await supabase.from('games').select('*').in('id', gameIds) : { data: [], error: null };
          const seasonIds = [...new Set((gamesResult.data ?? []).map((item) => item.season_id))];
          const seasonsResult = seasonIds.length ? await supabase.from('seasons').select('*').in('id', seasonIds) : { data: [], error: null };
          if (statsResult.error || iqResult.error || badgeResult.error || gamesResult.error || seasonsResult.error) throw new Error('Unable to load official career data.');
          if (active) setData({ ...empty, player, stats, games: gamesResult.data ?? [], seasons: seasonsResult.data ?? [], iq: iqResult.data, badges: (badgeResult.data ?? []).map((item: any) => ({ id: item.id, name: item.badge?.name ?? 'RCL badge', icon: item.badge?.icon ?? '🏀' })), level: levelResult.data });
        } else if (profile?.role === 'coach') {
          const coachResult = await supabase.from('team_coaches').select('*').eq('profile_id', user.id).maybeSingle();
          const teamsResult = coachResult.data ? await supabase.from('teams').select('*').eq('id', coachResult.data.team_id) : { data: [], error: null };
          if (coachResult.error || teamsResult.error) throw new Error('Unable to load official coaching data.');
          if (active) setData({ ...empty, coach: coachResult.data, teams: teamsResult.data ?? [], level: levelResult.data });
        } else {
          if (active) setData({ ...empty, level: levelResult.data });
        }
      } catch (err) {
        console.error('Unable to load career data', err);
        if (active) setError('Official career data is temporarily unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [authLoading, profile?.role, supabase, user]);

  if (authLoading || loading) return <main><Container maxWidth="xl" className="py-16"><div className="h-10 w-72 animate-pulse rounded bg-white/10" /><div className="mt-8 grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/5" />)}</div></Container></main>;
  if (!user) return <main><Container maxWidth="xl" className="py-16"><p>Sign in to enter My Career.</p><Link className="mt-4 inline-block text-rcl-gold" href="/auth/sign-in">Sign in</Link></Container></main>;
  if (error) return <main><Container maxWidth="xl" className="py-16"><h1 className="font-display text-3xl font-bold">Career unavailable</h1><p className="mt-3 text-red-300">{error}</p></Container></main>;
  const role = profile?.role ?? 'fan';
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">{role === 'fan' ? 'MY RCL JOURNEY' : role === 'coach' ? 'MY COACH CAREER' : 'MY CAREER'}</p><h1 className="mt-2 font-display text-4xl font-black sm:text-6xl">{profile?.display_name ?? 'RCL member'}</h1><p className="mt-3 text-gray-400">Your official Rich City League progression hub.</p></div><button onClick={() => void signOut()} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest">Sign out</button></div>{role === 'player' ? <PlayerCareer data={data} /> : role === 'coach' ? <CoachCareer data={data} /> : <FanJourney data={data} />}</Container></main>;
}

function PlayerCareer({ data }: { data: CareerData }) {
  const totals = data.stats.reduce((sum, stat) => ({ points: sum.points + stat.points, rebounds: sum.rebounds + stat.rebounds, assists: sum.assists + stat.assists, steals: sum.steals + stat.steals, blocks: sum.blocks + stat.blocks }), { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 });
  const hasStats = data.stats.length > 0;
  const average = (value: number) => hasStats ? (value / data.stats.length).toFixed(1) : '—';
  return <><div className="mt-8 grid gap-4 sm:grid-cols-4"><Card label="TEAM" value="Official RCL roster" /><Card label="OVR" value={data.iq?.rcl_rating ?? '—'} /><Card label="PLAYER IQ" value={data.iq?.rcl_rating ?? '—'} /><Card label="LEVEL / XP" value={data.level ? `${data.level.level} / ${data.level.xp}` : '—'} /></div><section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-display text-2xl font-bold">Career overview</h2>{!hasStats && <p className="mt-5 text-sm text-gray-400">Not enough official data yet.</p>}<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['GP', data.stats.length], ['PPG', average(totals.points)], ['RPG', average(totals.rebounds)], ['APG', average(totals.assists)], ['SPG', average(totals.steals)], ['BPG', average(totals.blocks)], ['TOTAL POINTS', totals.points], ['TOTAL REBOUNDS', totals.rebounds], ['TOTAL ASSISTS', totals.assists], ['EXPOSURE', data.iq?.exposure_index ?? '—']].map(([label, value]) => <Card key={label as string} label={label as string} value={value as string | number} />)}</div></section><section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-display text-2xl font-bold">Badges</h2><div className="mt-4 flex flex-wrap gap-2">{data.badges.map((badge) => <span key={badge.id} className="rounded-full border border-rcl-gold/30 bg-rcl-gold/10 px-3 py-2 text-sm">{badge.icon} {badge.name}</span>)}{!data.badges.length && <p className="text-sm text-gray-500">No official badges earned yet.</p>}</div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-display text-2xl font-bold">Season history</h2>{data.seasons.length ? data.seasons.map((season) => <div key={season.id} className="mt-4 flex justify-between border-b border-white/10 pb-3 text-sm"><span>{season.name}</span><span className="text-gray-400">{data.stats.filter((stat) => data.games.find((game) => game.id === stat.game_id)?.season_id === season.id).length} games</span></div>) : <p className="mt-4 text-sm text-gray-500">Not enough official data yet.</p>}</div></section></>;
}

function CoachCareer({ data }: { data: CareerData }) { return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-display text-2xl font-bold">Coach legacy</h2><div className="mt-5 grid gap-4 sm:grid-cols-4"><Card label="TEAM" value={data.teams[0]?.name ?? '—'} /><Card label="ROLE" value={data.coach?.title ?? '—'} /><Card label="GAMES COACHED" value="0" /><Card label="LEGACY GRADE" value="—" /></div><p className="mt-6 text-sm text-gray-400">Not enough official data yet. Coaching records, championships, and achievements appear here only after verified league results are recorded.</p></section>; }
function FanJourney({ data }: { data: CareerData }) { return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-display text-2xl font-bold">Your RCL journey</h2><div className="mt-5 grid gap-4 sm:grid-cols-4"><Card label="FAN LEVEL" value={data.level?.level ?? '—'} /><Card label="XP" value={data.level?.xp ?? '—'} /><Card label="FANTASY" value="Explore fantasy" /><Card label="BADGES" value="—" /></div><p className="mt-6 text-sm text-gray-400">Your community reputation, favorite teams, fantasy milestones, and fan achievements will grow from official RCL activity.</p><Link href="/fantasy" className="mt-5 inline-flex rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase tracking-widest text-black">Enter RCL Fantasy</Link></section>; }
function Card({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p><p className="mt-2 font-display text-xl font-bold">{value}</p></div>; }
