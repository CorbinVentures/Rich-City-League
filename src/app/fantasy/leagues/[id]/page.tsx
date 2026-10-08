'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaCrown, FaKey, FaLock, FaTrophy, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type League = { id:string; fantasy_season_id:string; owner_id:string; name:string; join_code:string; max_teams:number; status:string; created_at:string };
type Membership = { fantasy_league_id:string; profile_id:string; role:string; joined_at:string };
type Team = { id:string; manager_id:string; name:string; total_points:number; created_at:string };
type Matchup = { id:string; week_number:number; starts_at:string; ends_at:string; home_team_id:string; away_team_id:string; home_points:number; away_points:number; status:'scheduled'|'live'|'final'; winner_team_id:string|null };
type Standing = { team:Team; wins:number; losses:number; ties:number };

function formatDate(value:string) {
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));
}

export default function PrivateFantasyLeaguePage({ params }:{ params:Promise<{id:string}> }) {
  const { id } = use(params);
  const { user, profile, loading:authLoading } = useAuth();
  const supabase = useMemo(()=>getSupabaseClient(),[]);
  const db = supabase as any;
  const [league,setLeague] = useState<League|null>(null);
  const [members,setMembers] = useState<Membership[]>([]);
  const [teams,setTeams] = useState<Team[]>([]);
  const [matchups,setMatchups] = useState<Matchup[]>([]);
  const [myTeam,setMyTeam] = useState<Team|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [copied,setCopied] = useState(false);

  async function load() {
    if (!supabase || !user) return;
    setLoading(true); setError('');
    const leagueResult = await db.from('fantasy_leagues').select('id,fantasy_season_id,owner_id,name,join_code,max_teams,status,created_at').eq('id',id).maybeSingle();
    if (leagueResult.error || !leagueResult.data) {
      setLeague(null); setError('This private Fantasy league is unavailable or you are not a member.'); setLoading(false); return;
    }
    const currentLeague = leagueResult.data as League;
    setLeague(currentLeague);
    const [memberResult,matchupResult,myTeamResult] = await Promise.all([
      db.from('fantasy_league_members').select('fantasy_league_id,profile_id,role,joined_at').eq('fantasy_league_id',id).order('joined_at'),
      db.from('fantasy_league_matchups').select('id,week_number,starts_at,ends_at,home_team_id,away_team_id,home_points,away_points,status,winner_team_id').eq('fantasy_league_id',id).order('week_number').order('starts_at'),
      supabase.from('fantasy_teams').select('id,manager_id,name,total_points,created_at').eq('fantasy_season_id',currentLeague.fantasy_season_id).eq('manager_id',user.id).maybeSingle(),
    ]);
    const memberRows = (memberResult.data ?? []) as Membership[];
    setMembers(memberRows);
    setMatchups((matchupResult.data ?? []) as Matchup[]);
    setMyTeam(myTeamResult.data ? { ...myTeamResult.data, total_points:Number(myTeamResult.data.total_points ?? 0) } as Team : null);
    const managerIds = memberRows.map(row=>row.profile_id);
    if (managerIds.length) {
      const teamResult = await supabase.from('fantasy_teams').select('id,manager_id,name,total_points,created_at').eq('fantasy_season_id',currentLeague.fantasy_season_id).in('manager_id',managerIds);
      setTeams(((teamResult.data ?? []) as Team[]).map(team=>({...team,total_points:Number(team.total_points??0)})));
    } else setTeams([]);
    setLoading(false);
  }

  useEffect(()=>{ if(!authLoading) void load(); },[authLoading,id,supabase,user]);
  useEffect(()=>{
    if(authLoading || !league) return;
    const timer=window.setInterval(()=>void load(),15000);
    return()=>window.clearInterval(timer);
  },[authLoading,league?.id,supabase,user]);

  const teamById = useMemo(()=>new Map(teams.map(team=>[team.id,team])),[teams]);
  const standings = useMemo<Standing[]>(()=>{
    const rows = new Map<string,Standing>();
    teams.forEach(team=>rows.set(team.id,{team,wins:0,losses:0,ties:0}));
    for(const matchup of matchups.filter(item=>item.status==='final')) {
      const home=rows.get(matchup.home_team_id); const away=rows.get(matchup.away_team_id);
      if(!home||!away) continue;
      if(matchup.home_points===matchup.away_points){home.ties+=1;away.ties+=1;}
      else if(matchup.winner_team_id===home.team.id){home.wins+=1;away.losses+=1;}
      else if(matchup.winner_team_id===away.team.id){away.wins+=1;home.losses+=1;}
    }
    return [...rows.values()].sort((a,b)=>b.wins-a.wins || b.team.total_points-a.team.total_points || a.team.name.localeCompare(b.team.name));
  },[matchups,teams]);
  const currentWeek = matchups.find(item=>item.status==='live')?.week_number ?? matchups.find(item=>item.status==='scheduled')?.week_number ?? matchups.at(-1)?.week_number ?? 1;
  const member = members.find(item=>item.profile_id===user?.id);
  const commissioner = league?.owner_id===user?.id || member?.role==='commissioner';

  async function copyCode() {
    if(!league) return;
    await navigator.clipboard.writeText(league.join_code);
    setCopied(true); window.setTimeout(()=>setCopied(false),1800);
  }

  if(authLoading||loading) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><div className="h-72 animate-pulse rounded-3xl bg-white/5"/></Container></main>;
  if(!league) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-20 text-center"><FaLock className="mx-auto text-4xl text-rcl-orange"/><h1 className="mt-5 font-display text-4xl font-black uppercase">Private league unavailable</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">{error||'Only invited league members can open this Fantasy room.'}</p><Link href="/fantasy" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Fantasy Lobby <FaArrowRight/></Link></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_82%_20%,rgba(21,159,255,.18),transparent_28%),radial-gradient(circle_at_15%_70%,rgba(59,130,246,.14),transparent_30%),#071522]">
      <Container maxWidth="xl" className="relative py-10 sm:py-14">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.24em] text-rcl-blue"><FaLock/> Private Fantasy League</p><h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.9] sm:text-7xl">{league.name}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/48">Your RCL Fantasy franchise competes here using the same registered players and official game statistics as the public league. Scorebook updates flow into this league automatically.</p></div>
          <div className="grid min-w-72 grid-cols-2 gap-2"><Metric label="Members" value={`${members.length}/${league.max_teams}`}/><Metric label="Week" value={String(currentWeek)}/><Metric label="Status" value={league.status}/><Metric label="My team" value={myTeam?.name??'Not built'}/></div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8 sm:py-10">
      {commissioner&&<section className="mb-6 rounded-3xl border border-rcl-orange/25 bg-rcl-orange/[.05] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-rcl-orange"><FaCrown/> Commissioner controls</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Invite your league</h2><p className="mt-2 text-xs leading-5 text-white/40">Only people with this code can join. The room remains invisible to other RCL members.</p></div><button type="button" onClick={copyCode} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-rcl-orange/30 bg-black/25 px-5 text-sm font-black uppercase tracking-[.15em]"><FaKey className="text-rcl-orange"/>{league.join_code}<span className="text-[10px] text-white/35">{copied?'Copied':'Copy'}</span></button></div></section>}

      {!myTeam&&profile?.role==='fan'&&<section className="mb-6 rounded-3xl border border-rcl-blue/25 bg-rcl-blue/[.05] p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Your franchise is missing</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Build your RCL Fantasy team first.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">Your one RCL Fantasy franchise follows you into every league you join. Build the roster once; public and private competitions score it from official RCL stats.</p></div><Link href="/fantasy#draft" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Build franchise <FaArrowRight/></Link></div></section>}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="space-y-6">
          <Panel><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Private standings</p><h2 className="mt-1 font-display text-3xl font-black uppercase">League table</h2></div><FaTrophy className="text-2xl text-rcl-orange"/></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-white/25"><th className="px-2 py-3">#</th><th className="px-2 py-3">Franchise</th><th className="px-2 py-3">Record</th><th className="px-2 py-3 text-right">Season pts</th></tr></thead><tbody>{standings.map((row,index)=><tr key={row.team.id} className={`border-b border-white/5 ${row.team.id===myTeam?.id?'bg-rcl-orange/[.05]':''}`}><td className="px-2 py-4 text-xs font-black text-rcl-orange">{index+1}</td><td className="px-2 py-4 text-sm font-bold">{row.team.name}{row.team.id===myTeam?.id&&<span className="ml-2 text-[9px] font-black uppercase text-rcl-blue">You</span>}</td><td className="px-2 py-4 text-xs text-white/45">{row.wins}-{row.losses}{row.ties?`-${row.ties}`:''}</td><td className="px-2 py-4 text-right text-xs font-black">{row.team.total_points.toFixed(1)}</td></tr>)}</tbody></table>{!standings.length&&<Empty text="Member franchises will appear here after they build their RCL Fantasy teams."/>}</div></Panel>

          <Panel><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">Weekly competition</p><h2 className="mt-1 font-display text-3xl font-black uppercase">Matchups</h2></div><FaBasketball className="text-2xl text-rcl-blue"/></div><div className="mt-5 space-y-3">{matchups.slice(0,18).map(item=><article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-wider text-rcl-orange">Week {item.week_number} · {item.status}</span><time className="text-[10px] uppercase text-white/25">{formatDate(item.starts_at)}</time></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><TeamScore name={teamById.get(item.home_team_id)?.name??'RCL Team'} score={item.home_points}/><span className="font-display text-sm font-black text-white/20">VS</span><TeamScore name={teamById.get(item.away_team_id)?.name??'RCL Team'} score={item.away_points} right/></div></article>)}{!matchups.length&&<Empty text={teams.length<2?'At least two member franchises are needed before private matchups are generated.':'Private matchups are being generated from the RCL season calendar.'}/>}</div></Panel>
        </section>

        <aside className="space-y-6">
          <Panel><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-rcl-blue"><FaUsers/> League members</p><div className="mt-4 space-y-2">{members.map((item,index)=>{const team=teams.find(t=>t.manager_id===item.profile_id);return <div key={item.profile_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3"><div><b className="block text-xs">{team?.name??`Member ${index+1}`}</b><span className="text-[10px] uppercase text-white/28">{item.role}{!team?' · franchise pending':''}</span></div>{item.role==='commissioner'&&<FaCrown className="text-rcl-orange"/>}</div>})}</div></Panel>
          <Panel><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Live stat sync</p><h3 className="mt-2 font-display text-2xl font-black uppercase">One stat source.</h3><p className="mt-3 text-xs leading-5 text-white/40">Coaches and admins record the real game in RCL Scorebook. Finalized player-game stats feed Fantasy scoring, and this league&apos;s matchup totals refresh automatically. Private league managers never enter basketball stats manually.</p><Link href="/fantasy" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Manage my roster <FaArrowRight/></Link></Panel>
        </aside>
      </div>
    </Container>
  </main>;
}

function Panel({children}:{children:React.ReactNode}){return <section className="rounded-3xl border border-white/10 bg-[#071522]/60 p-5 sm:p-6">{children}</section>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-white/28">{label}</p><p className="mt-1 truncate font-display text-lg font-black uppercase">{value}</p></div>}
function TeamScore({name,score,right=false}:{name:string;score:number;right?:boolean}){return <div className={right?'text-right':''}><p className="truncate text-xs font-black uppercase">{name}</p><p className="mt-1 font-display text-3xl font-black">{Number(score??0).toFixed(1)}</p></div>}
function Empty({text}:{text:string}){return <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs leading-5 text-white/28">{text}</p>}
