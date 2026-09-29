'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaBolt, FaCircleCheck, FaLock, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Team = { id: string; name: string; short_name: string | null; logo_url: string | null };
type Game = { id: string; scheduled_at: string; status: string; home_team_id: string; away_team_id: string; home_score: number; away_score: number; home?: Team | null; away?: Team | null };
type Pick = { id: string; game_id: string; selected_team_id: string; predicted_home_score: number | null; predicted_away_score: number | null; points_earned: number; scored_at: string | null };

type Draft = { teamId: string; homeScore: string; awayScore: string };

function date(value:string){return new Date(value).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});}

export default function PickemPage(){
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(true),[]);
  const db=supabase as any;
  const [games,setGames]=useState<Game[]>([]);
  const [picks,setPicks]=useState<Pick[]>([]);
  const [drafts,setDrafts]=useState<Record<string,Draft>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    if(!db){setLoading(false);return;}
    setLoading(true); setError('');
    const since=new Date(Date.now()-14*24*60*60*1000).toISOString();
    const {data:gameRows,error:gameError}=await db.from('games')
      .select('id,scheduled_at,status,home_team_id,away_team_id,home_score,away_score,home:teams!games_home_team_id_fkey(id,name,short_name,logo_url),away:teams!games_away_team_id_fkey(id,name,short_name,logo_url)')
      .in('status',['scheduled','live','completed']).gte('scheduled_at',since).order('scheduled_at',{ascending:false}).limit(30);
    if(gameError){setError('Pick’em games could not be loaded.');setLoading(false);return;}
    const rows=(gameRows??[]) as Game[];
    rows.sort((a,b)=>{
      const aOpen=a.status==='scheduled'&&new Date(a.scheduled_at).getTime()>Date.now();
      const bOpen=b.status==='scheduled'&&new Date(b.scheduled_at).getTime()>Date.now();
      if(aOpen!==bOpen)return aOpen?-1:1;
      return new Date(b.scheduled_at).getTime()-new Date(a.scheduled_at).getTime();
    });
    setGames(rows);
    if(user){
      const {data:pickRows}=await db.from('pickem_picks').select('*').eq('profile_id',user.id).in('game_id',rows.map(game=>game.id));
      const memberPicks=(pickRows??[]) as Pick[];
      setPicks(memberPicks);
      const next:Record<string,Draft>={};
      for(const game of rows){const pick=memberPicks.find(item=>item.game_id===game.id);next[game.id]={teamId:pick?.selected_team_id??'',homeScore:pick?.predicted_home_score?.toString()??'',awayScore:pick?.predicted_away_score?.toString()??''};}
      setDrafts(next);
    }else{setPicks([]);setDrafts({});}
    setLoading(false);
  },[db,user]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!supabase)return;const channel=supabase.channel('rcl-pickem-live').on('postgres_changes',{event:'*',schema:'public',table:'games'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel);};},[load,supabase]);

  const save=async(game:Game)=>{
    if(!db||!user)return;
    const draft=drafts[game.id];
    if(!draft?.teamId){setError('Choose the team you think will win.');return;}
    const homeScore=draft.homeScore.trim()===''?null:Number(draft.homeScore);
    const awayScore=draft.awayScore.trim()===''?null:Number(draft.awayScore);
    if((homeScore!==null&&(!Number.isInteger(homeScore)||homeScore<0||homeScore>250))||(awayScore!==null&&(!Number.isInteger(awayScore)||awayScore<0||awayScore>250))){setError('Predicted scores must be whole numbers from 0 to 250.');return;}
    setBusy(game.id);setError('');setNotice('');
    const {error:saveError}=await db.from('pickem_picks').upsert({game_id:game.id,profile_id:user.id,selected_team_id:draft.teamId,predicted_home_score:homeScore,predicted_away_score:awayScore,updated_at:new Date().toISOString()},{onConflict:'game_id,profile_id'});
    if(saveError)setError(saveError.message);else setNotice('Pick locked in. You can edit it until tip-off.');
    setBusy(null);await load();
  };

  const earned=picks.reduce((sum,pick)=>sum+Number(pick.points_earned??0),0);
  const correct=picks.filter(pick=>pick.scored_at&&pick.points_earned>=20).length;

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <ClientPageHero eyebrow="RCL Fan Competition" title="Pick’em" accent="Call your shot" description="Pick upcoming winners, optionally predict the final score, and turn correct calls into Community REP. Picks lock automatically at tip-off." assetKey="games.cover" meta={<div className="min-w-48 rounded-2xl border border-rcl-orange/20 bg-[#071522]/85 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Your results</p><p className="mt-2 font-display text-4xl font-black">{earned}</p><p className="mt-1 text-xs text-white/40">REP earned · {correct} correct picks</p></div>} />
    <Container maxWidth="lg" className="py-8 sm:py-12">
      <section className="grid gap-3 sm:grid-cols-3"><Rule icon={<FaTrophy/>} title="Winner" copy="+20 REP for picking the winning team."/><Rule icon={<FaBolt/>} title="Margin" copy="+10 REP when you also nail the winning margin."/><Rule icon={<FaCircleCheck/>} title="Exact" copy="+15 more REP for an exact final score."/></section>
      {notice&&<p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-100">{notice}</p>}{error&&<p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-100">{error}</p>}
      {!user&&!authLoading?<section className="mt-7 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-10 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in to make your picks</h2><p className="mt-2 text-sm text-white/40">Your picks, scoring and REP are tied to your RCL identity.</p><Link href="/auth/sign-in?next=/pickem" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link></section>:null}
      <section className="mt-7 space-y-4">{loading?[1,2,3].map(i=><div key={i} className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[.02]"/>):games.length?games.map(game=>{
        const open=game.status==='scheduled'&&new Date(game.scheduled_at).getTime()>Date.now();
        const pick=picks.find(item=>item.game_id===game.id);const draft=drafts[game.id]??{teamId:'',homeScore:'',awayScore:''};
        const winner=game.status==='completed'?(game.home_score>game.away_score?game.home_team_id:game.away_team_id):null;
        return <article key={game.id} className={`rounded-3xl border p-5 sm:p-7 ${open?'border-rcl-blue/20 bg-[#071522]/50':'border-white/10 bg-white/[.02]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className={`text-[10px] font-black uppercase tracking-[.2em] ${open?'text-rcl-blue':'text-white/30'}`}>{open?'Picks open':game.status==='completed'?'Final':'Locked'}</p><p className="mt-1 text-xs text-white/35">{date(game.scheduled_at)}</p></div>{!open&&<span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/35"><FaLock/>Locked</span>}</div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{[game.away,game.home].map((team,index)=>{if(!team)return null;const selected=(open?draft.teamId:pick?.selected_team_id)===team.id;const won=winner===team.id;return <button key={team.id} type="button" disabled={!open||!user} onClick={()=>setDrafts(current=>({...current,[game.id]:{...draft,teamId:team.id}}))} className={`rounded-2xl border p-5 text-left transition ${selected?'border-rcl-orange bg-rcl-orange/[.08]':'border-white/10 bg-black/20 hover:border-rcl-blue/30'} disabled:cursor-default`}><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-white/30">{index===0?'Away':'Home'}</p><h2 className="mt-1 font-display text-xl font-black uppercase">{team.name}</h2></div>{game.status==='completed'&&<b className="font-display text-4xl">{index===0?game.away_score:game.home_score}</b>}</div>{won&&<p className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-300">Winner</p>}{selected&&open&&<p className="mt-3 text-[10px] font-black uppercase tracking-wider text-rcl-orange">Your pick</p>}</button>})}</div>
          {open&&user?<div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-[10px] font-black uppercase tracking-wider text-white/35">Away score <input inputMode="numeric" value={draft.awayScore} onChange={e=>setDrafts(current=>({...current,[game.id]:{...draft,awayScore:e.target.value}}))} className="mt-2 block h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-base text-white outline-none focus:border-rcl-blue/45" placeholder="Optional"/></label><label className="text-[10px] font-black uppercase tracking-wider text-white/35">Home score <input inputMode="numeric" value={draft.homeScore} onChange={e=>setDrafts(current=>({...current,[game.id]:{...draft,homeScore:e.target.value}}))} className="mt-2 block h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-base text-white outline-none focus:border-rcl-blue/45" placeholder="Optional"/></label><button type="button" disabled={busy===game.id||!draft.teamId} onClick={()=>void save(game)} className="h-11 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40">{busy===game.id?'Saving…':pick?'Update pick':'Lock pick'}</button></div>:null}
          {!open&&pick?<div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-white/30">Your call</p><p className="mt-1 text-sm font-black">{pick.selected_team_id===game.home_team_id?game.home?.name:game.away?.name}{pick.predicted_away_score!==null&&pick.predicted_home_score!==null?` · ${pick.predicted_away_score}–${pick.predicted_home_score}`:''}</p></div><div className="text-right"><p className="text-[10px] font-black uppercase tracking-wider text-white/30">Result</p><p className={`mt-1 font-display text-2xl font-black ${pick.points_earned>0?'text-rcl-orange':'text-white/45'}`}>{pick.scored_at?`+${pick.points_earned} REP`:'Pending'}</p></div></div>:null}
          <Link href={`/games/${game.id}`} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Game center <FaArrowRight/></Link>
        </article>;}):<div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/40">No Pick’em games are available yet.</div>}</section>
    </Container>
  </main>;
}

function Rule({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}){return <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><span className="text-rcl-orange">{icon}</span><h2 className="mt-3 font-display text-lg font-black uppercase">{title}</h2><p className="mt-1 text-xs leading-5 text-white/40">{copy}</p></article>;}
