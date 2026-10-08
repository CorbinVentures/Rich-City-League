'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCrown, FaKey, FaLock, FaPlus, FaTrophy, FaUsers } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type PrivateLeague = {
  id:string;
  fantasy_season_id:string;
  owner_id:string;
  name:string;
  join_code:string;
  max_teams:number;
  status:string;
  created_at:string;
};

type Membership = { fantasy_league_id:string; profile_id:string; role:'commissioner'|'manager'; joined_at:string };
type PublicFranchise = { id:string; name:string; wins:number; losses:number; total_points:number };

export function FantasyLeagueNavigator() {
  const { user, profile, loading:authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [leagues,setLeagues] = useState<PrivateLeague[]>([]);
  const [memberships,setMemberships] = useState<Membership[]>([]);
  const [franchise,setFranchise] = useState<PublicFranchise|null>(null);
  const [seasonId,setSeasonId] = useState('');
  const [createName,setCreateName] = useState('');
  const [maxTeams,setMaxTeams] = useState(10);
  const [joinCode,setJoinCode] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const fan = profile?.role === 'fan';

  async function load() {
    if (!supabase || !user) return;
    const seasonResult = await supabase.from('fantasy_seasons').select('id').eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    const activeSeasonId = seasonResult.data?.id ?? '';
    setSeasonId(activeSeasonId);
    if (!activeSeasonId) { setLeagues([]); setMemberships([]); setFranchise(null); return; }

    const [leagueResult,membershipResult,teamResult] = await Promise.all([
      db.from('fantasy_leagues').select('id,fantasy_season_id,owner_id,name,join_code,max_teams,status,created_at').eq('fantasy_season_id',activeSeasonId).order('created_at',{ascending:false}),
      db.from('fantasy_league_members').select('fantasy_league_id,profile_id,role,joined_at').eq('profile_id',user.id),
      supabase.from('fantasy_teams').select('id,name,wins,losses,total_points').eq('fantasy_season_id',activeSeasonId).eq('manager_id',user.id).maybeSingle(),
    ]);
    setLeagues((leagueResult.data ?? []) as PrivateLeague[]);
    setMemberships((membershipResult.data ?? []) as Membership[]);
    setFranchise(teamResult.data ? {
      id:teamResult.data.id,
      name:teamResult.data.name,
      wins:Number(teamResult.data.wins ?? 0),
      losses:Number(teamResult.data.losses ?? 0),
      total_points:Number(teamResult.data.total_points ?? 0),
    } : null);
  }

  useEffect(() => { if (!authLoading) void load(); }, [authLoading, user, supabase]);

  async function createPrivate(event:React.FormEvent) {
    event.preventDefault();
    if (!fan || createName.trim().length < 2 || busy) return;
    setBusy(true); setMessage('');
    const result = await db.rpc('create_private_fantasy_league', { target_name:createName.trim(), target_max_teams:maxTeams });
    if (result.error) setMessage(result.error.message ?? 'Unable to create private league.');
    else {
      const id = result.data as string;
      setCreateName('');
      setMessage('Private league created. Share the invite code with your group.');
      await load();
      window.location.assign(`/fantasy/leagues/${id}`);
    }
    setBusy(false);
  }

  async function joinPrivate(event:React.FormEvent) {
    event.preventDefault();
    if (!fan || joinCode.trim().length < 6 || busy) return;
    setBusy(true); setMessage('');
    const result = await db.rpc('join_private_fantasy_league', { target_join_code:joinCode.trim() });
    if (result.error) setMessage(result.error.message ?? 'Unable to join private league.');
    else {
      const id = result.data as string;
      setJoinCode('');
      setMessage('Private league joined.');
      await load();
      window.location.assign(`/fantasy/leagues/${id}`);
    }
    setBusy(false);
  }

  if (authLoading || !user) return null;

  return <section className="border-b border-white/10 bg-[#03070d] text-white">
    <div className="mx-auto max-w-7xl px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/60">Fantasy</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Leagues</h2>
        </div>
        <Link href="/league" className="text-xs font-semibold text-white/40 hover:text-rcl-blue">League Center →</Link>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Link href="/fantasy" className="group rounded-2xl border border-rcl-blue/18 bg-[#071522]/58 p-5 transition hover:border-rcl-blue/42">
          <div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaTrophy/></span><span className="rounded-lg border border-rcl-blue/20 bg-rcl-blue/[.04] px-3 py-1 text-[10px] font-semibold text-rcl-blue">Official public</span></div>
          <h3 className="mt-4 font-display text-xl font-semibold">RCL Public League</h3>
          <p className="mt-2 text-xs leading-5 text-white/42">Build one RCL Fantasy franchise with registered league players. Official Scorebook stats drive your roster and public matchups.</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-xs font-medium text-white/50">{franchise ? `${franchise.name} · ${franchise.wins}-${franchise.losses}` : fan ? 'Create your franchise to join' : 'View league'}</span><FaArrowRight className="text-rcl-blue transition group-hover:translate-x-1"/></div>
        </Link>

        <div className="rounded-2xl border border-rcl-blue/18 bg-[#071522]/58 p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/60">My private leagues</p><h3 className="mt-1 font-display text-xl font-semibold">Invite-only competition</h3></div><FaLock className="text-rcl-blue"/></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {leagues.map(league => {
              const membership = memberships.find(item => item.fantasy_league_id === league.id);
              return <Link key={league.id} href={`/fantasy/leagues/${league.id}`} className="rounded-xl border border-white/10 bg-black/20 p-4 hover:border-rcl-blue/40"><div className="flex items-center justify-between gap-2"><b className="truncate font-display text-sm font-semibold">{league.name}</b>{membership?.role === 'commissioner' && <FaCrown className="shrink-0 text-rcl-blue"/>}</div><p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/28">{league.status} · up to {league.max_teams} teams</p></Link>;
            })}
            {!leagues.length && <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-white/30 sm:col-span-2">You have not joined a private Fantasy league yet.</div>}
          </div>
        </div>
      </div>

      {fan && seasonId && <details className="mt-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold text-white/55"><span className="inline-flex items-center gap-2"><FaPlus className="text-rcl-blue"/> Create or join a private league</span></summary>
        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-2">
          <form onSubmit={createPrivate}>
            <div className="flex items-center gap-2"><FaCrown className="text-rcl-blue"/><b className="text-sm font-semibold">Create your league</b></div>
            <p className="mt-2 text-xs leading-5 text-white/35">You become commissioner. Your existing RCL Fantasy franchise carries into the league, and official stats continue to score it automatically.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_auto]"><input value={createName} onChange={event=>setCreateName(event.target.value)} minLength={2} maxLength={60} placeholder="League name" className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-xs outline-none focus:border-rcl-blue/45"/><select value={maxTeams} onChange={event=>setMaxTeams(Number(event.target.value))} className="min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-xs outline-none"><option value={4}>4 teams</option><option value={6}>6 teams</option><option value={8}>8 teams</option><option value={10}>10 teams</option><option value={12}>12 teams</option><option value={16}>16 teams</option><option value={20}>20 teams</option></select><button disabled={busy||createName.trim().length<2} className="min-h-11 rounded-xl bg-rcl-blue px-4 text-xs font-semibold text-[#071018] disabled:opacity-40">Create</button></div>
          </form>
          <form onSubmit={joinPrivate}>
            <div className="flex items-center gap-2"><FaKey className="text-rcl-blue"/><b className="text-sm font-semibold">Join with code</b></div>
            <p className="mt-2 text-xs leading-5 text-white/35">Enter the commissioner&apos;s invite code. Private league standings and matchups remain visible only to league members.</p>
            <div className="mt-4 flex gap-2"><input value={joinCode} onChange={event=>setJoinCode(event.target.value.toUpperCase())} minLength={6} maxLength={12} placeholder="INVITE CODE" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-semibold uppercase tracking-[.12em] outline-none focus:border-rcl-blue/45"/><button disabled={busy||joinCode.trim().length<6} className="min-h-11 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-4 text-xs font-semibold text-rcl-blue disabled:opacity-40">Join</button></div>
          </form>
        </div>
        {message && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/55">{message}</p>}
      </details>}

      {profile?.role !== 'fan' && <p className="mt-3 flex items-center gap-2 text-[11px] text-white/28"><FaUsers/> Private league creation and roster management are reserved for fan profiles; other RCL roles can view the official Fantasy experience.</p>}
    </div>
  </section>;
}
