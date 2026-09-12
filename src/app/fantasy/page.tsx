'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { FantasyRoster, FantasySeason, FantasyTeam, PublicPlayer } from '@/types/database';
import { calculateFantasyPoints } from '@/lib/rcl-algorithms';

type RosterRow = FantasyRoster & { player?: PublicPlayer };

export default function FantasyPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient() as any, []);
  const [season, setSeason] = useState<FantasySeason | null>(null);
  const [team, setTeam] = useState<FantasyTeam | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [teamName, setTeamName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!supabase) { setLoading(false); setMessage('Fantasy is unavailable until Supabase is configured.'); return; }
    const load = async () => {
      setLoading(true);
      const seasonResult = await supabase.from('fantasy_seasons').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
      const playersResult = await supabase.from('public_players').select('*').eq('is_active', true).order('last_name').limit(100);
      if (seasonResult.error || playersResult.error) {
        setMessage('Official fantasy data is not available yet.');
        setLoading(false);
        return;
      }
      setSeason(seasonResult.data);
      setPlayers(playersResult.data ?? []);
      if (user && seasonResult.data) {
        const teamResult = await supabase.from('fantasy_teams').select('*').eq('fantasy_season_id', seasonResult.data.id).eq('manager_id', user.id).maybeSingle();
        if (!teamResult.error && teamResult.data) {
          setTeam(teamResult.data);
          const rosterResult = await supabase.from('fantasy_rosters').select('*').eq('fantasy_team_id', teamResult.data.id);
          setRoster((rosterResult.data ?? []).map((item: any) => ({ ...item, player: (playersResult.data ?? []).find((player: any) => player.id === item.player_id) })));
        }
      }
      setLoading(false);
    };
    void load();
  }, [authLoading, supabase, user]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !season || profile?.role !== 'fan' || teamName.trim().length < 2) return;
    setMessage(null);
    const result = await supabase.from('fantasy_teams').insert({ fantasy_season_id: season.id, manager_id: user.id, name: teamName.trim() } as never).select().single();
    if (result.error) { setMessage('Only fan accounts can create fantasy teams.'); return; }
    setTeam(result.data);
    setTeamName('');
  }

  if (authLoading || loading) return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-16"><div className="h-10 w-64 animate-pulse rounded bg-white/10" /></Container></main>;

  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(43,130,201,.25),transparent_65%)] py-14">
        <Container maxWidth="xl"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-blue">RCL FANTASY</p><h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-7xl">Own the <span className="text-rcl-orange">competition.</span></h1><p className="mt-4 max-w-xl text-gray-400">Build your squad. Follow the league. Official fantasy points come from verified RCL game statistics.</p></Container>
      </section>
      <Container maxWidth="xl" className="py-10">
        {!user && <Notice>Sign in as a fan to manage a fantasy team.</Notice>}
        {user && profile?.role !== 'fan' && <Notice>Fantasy management is reserved for fan accounts. Players and coaches can still explore official player data.</Notice>}
        {message && <Notice>{message}</Notice>}
        {!season && <Notice>No active fantasy season is available yet.</Notice>}
        {season && user && profile?.role === 'fan' && !team && <form onSubmit={createTeam} className="rounded-2xl border border-rcl-blue/30 bg-rcl-blue/10 p-6"><h2 className="font-display text-2xl font-bold">Create your fantasy team</h2><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={teamName} onChange={(event) => setTeamName(event.target.value)} minLength={2} maxLength={60} placeholder="Team name" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-rcl-gold" /><button className="min-h-12 rounded-xl bg-rcl-orange px-6 font-black uppercase tracking-widest text-black">Enter fantasy</button></div></form>}
        {team && <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-rcl-orange">MY TEAM</p><h2 className="mt-2 font-display text-3xl font-black">{team.name}</h2></div><div className="text-right"><p className="text-xs uppercase text-gray-500">POINTS</p><p className="font-display text-3xl font-bold text-rcl-gold">{team.total_points}</p></div></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">{['PG', 'SG', 'SF', 'PF', 'C'].map((slot) => <div key={slot} className="rounded-xl border border-white/10 p-3"><p className="text-[10px] font-black text-gray-500">{slot}</p><p className="mt-3 text-xs text-gray-400">{roster.find((item) => item.roster_slot === 'starter')?.player?.last_name ?? 'Open slot'}</p></div>)}</div><div className="mt-8"><h3 className="font-display text-xl font-bold">Bench</h3><div className="mt-3 space-y-2">{roster.filter((item) => item.roster_slot !== 'starter').map((item) => <Link key={item.player_id} href={`/players/${item.player_id}`} className="flex justify-between rounded-xl border border-white/10 p-3 text-sm hover:border-rcl-gold"><span>{item.player ? `${item.player.first_name} ${item.player.last_name}` : 'RCL player'}</span><span className="text-gray-500">{item.roster_slot}</span></Link>)}{!roster.length && <p className="text-sm text-gray-500">No players selected yet.</p>}</div></div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><p className="text-xs uppercase tracking-widest text-rcl-orange">PLAYER DISCOVERY</p><h2 className="mt-2 font-display text-2xl font-bold">Official RCL players</h2><div className="mt-5 space-y-2">{players.slice(0, 8).map((player) => <Link key={player.id} href={`/players/${player.id}`} className="flex items-center justify-between rounded-xl border border-white/10 p-3 hover:border-rcl-blue"><span><span className="block text-sm font-bold">{player.first_name} {player.last_name}</span><span className="text-xs text-gray-500">{player.position ?? 'Position unlisted'} · {player.jersey_number ? `#${player.jersey_number}` : 'RCL roster'}</span></span><span className="text-xs text-rcl-gold">VIEW</span></Link>)}{!players.length && <p className="text-sm text-gray-500">No official players are available yet.</p>}</div><p className="mt-5 text-xs text-gray-500">Scoring uses the existing RCL engine: points, rebounds, assists, steals, blocks, and turnovers. Example calculation: {calculateFantasyPoints({ points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0 })} points.</p></div></section>}
      </Container>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) { return <div className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-gray-400">{children}</div>; }
