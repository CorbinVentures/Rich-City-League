'use client';

import { useEffect, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import type { PlayerGameStats, TeamGameStats } from '@/types/database';

export default function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerGameStats[]>([]);
  const [teamStats, setTeamStats] = useState<TeamGameStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    Promise.all([client.from('player_game_stats').select('*').order('points', { ascending: false }).limit(50), client.from('team_game_stats').select('*').order('points', { ascending: false }).limit(50)])
      .then(([players, teams]) => {
        if (players.error || teams.error) throw new Error((players.error ?? teams.error)?.message);
        setPlayerStats(players.data ?? []);
        setTeamStats(teams.data ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load statistics.'));
  }, []);
  const totals = playerStats.reduce((result, stat) => ({ points: result.points + stat.points, rebounds: result.rebounds + stat.rebounds, assists: result.assists + stat.assists }), { points: 0, rebounds: 0, assists: 0 });
  return <main><Container maxWidth="xl" className="py-16"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Real game data</p><h1 className="mt-2 font-display text-4xl font-bold">Statistics</h1><p className="mt-3 text-gray-400">Player and team box-score statistics recorded in the RCL database.</p>{error ? <p className="mt-8 text-red-300">{error}</p> : <><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Points</p><p className="mt-2 text-3xl font-bold">{totals.points}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Rebounds</p><p className="mt-2 text-3xl font-bold">{totals.rebounds}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Assists</p><p className="mt-2 text-3xl font-bold">{totals.assists}</p></div></div><div className="mt-10 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-white/10 p-6"><h2 className="font-display text-2xl font-bold">Player leaderboard</h2>{playerStats.length === 0 ? <p className="mt-5 text-gray-500">No player statistics have been recorded yet.</p> : <div className="mt-5 space-y-3">{playerStats.slice(0, 10).map((stat, index) => <div key={stat.id} className="flex justify-between border-b border-white/10 pb-3"><span>#{index + 1} · {stat.player_id.slice(0, 8)}</span><span className="font-bold">{stat.points} pts · {stat.rebounds} reb · {stat.assists} ast</span></div>)}</div>}</section><section className="rounded-2xl border border-white/10 p-6"><h2 className="font-display text-2xl font-bold">Team game stats</h2>{teamStats.length === 0 ? <p className="mt-5 text-gray-500">No team statistics have been recorded yet.</p> : <div className="mt-5 space-y-3">{teamStats.slice(0, 10).map((stat) => <div key={stat.id} className="flex justify-between border-b border-white/10 pb-3"><span>{stat.team_id.slice(0, 8)}</span><span className="font-bold">{stat.points} pts · {stat.rebounds} reb</span></div>)}</div>}</section></div></>}</Container></main>;
}
