'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaCircleCheck, FaFlag, FaShieldHalved, FaTrophy } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

const formats = ['1v1','2v2','3v3','4v4','5v5'];
type Game = { id:string; home_run_team_id:string; away_run_team_id:string; home_score:number; away_score:number; status:string };
type Team = { id:string; name:string };
type Review = {
  id:string;game_id:string;home_roster:string[];away_roster:string[];status:string;
  home_confirmed_by:string|null;away_confirmed_by:string|null;home_score:number;away_score:number;
};

export function RunRankedMatchControl({runId,hostId,runType,format,games,teams}:{
  runId:string;hostId:string;runType:string;format:string|null;games:Game[];teams:Team[];
}) {
  const {user}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [loading,setLoading]=useState(true);
  const [unavailable,setUnavailable]=useState(false);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [revision,setRevision]=useState(0);
  const [confirmTarget,setConfirmTarget]=useState<string|null>(null);
  const eligible=runType==='competitive' && formats.includes(format??'');

  useEffect(()=>{
    if(!db||!eligible){setLoading(false);return;}
    let cancelled=false;
    const fetchReviews=async()=>{
      const {data,error}=await db.from('run_ranked_matches')
        .select('id,game_id,home_roster,away_roster,status,home_confirmed_by,away_confirmed_by,home_score,away_score')
        .eq('run_id',runId).limit(60);
      if(cancelled)return;
      setReviews((data??[]) as Review[]);
      setUnavailable(Boolean(error));
      setLoading(false);
    };
    void fetchReviews();
    return ()=>{cancelled=true;};
  },[db,eligible,runId,revision]);

  useEffect(()=>{
    if(!db||!eligible)return;
    const channel=db.channel('rch-ranked-review-'+runId)
      .on('postgres_changes',{event:'*',schema:'public',table:'run_ranked_matches',filter:'run_id=eq.'+runId},()=>setRevision(v=>v+1))
      .subscribe();
    return()=>{void db.removeChannel(channel);};
  },[db,eligible,runId]);

  async function action(name:'submit_ranked_run_result'|'review_ranked_run_result',args:Record<string,unknown>){
    if(!db||!user)return;
    setBusy(String(args.p_game||args.p_match));
    setConfirmTarget(null);
    setNotice('');
    const {data,error}=await db.rpc(name,args);
    setBusy('');
    setNotice(error?error.message:
      name==='submit_ranked_run_result'?'Result submitted. Both opposing sides must confirm it.':
      data==='verified'?'Verified! Rankings have been updated.':
      data==='rejected'?'Score disputed. The host can review and resubmit.':
      'Confirmation saved. The other side still needs to confirm.');
    if(!error)setRevision(x=>x+1);
  }

  if(!eligible)return null;
  const label=(id:string)=>teams.find(t=>t.id===id)?.name||'Team';
  return <section className="mt-6 overflow-hidden rounded-3xl border border-[#3169a1]/80 bg-[linear-gradient(135deg,#102d4e,#071323)] p-5 text-white sm:p-7" aria-labelledby="rch-run-ranked-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#85beff]"><FaShieldHalved/> RCH Ranked · {format}</p>
        <h2 id="rch-run-ranked-title" className="mt-2 text-2xl font-black uppercase sm:text-3xl">OFFICIAL SCORE REVIEW</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#bad3ec]">The host records a completed game. A checked-in player from each team independently confirms the result before ratings move. No verified match can be quietly edited.</p>
      </div>
      <Link href="/commonwealth" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#4c86bb] px-4 text-xs font-black text-white"><FaTrophy/> Road to the Cup</Link>
    </div>
    {unavailable&&<p className="mt-4 rounded-xl border border-[#ba9959]/35 bg-[#6e4919]/30 p-3 text-xs text-[#fbe7ba]">Ranked verification is not yet available on this deployment. Pickup results remain separate from official ratings.</p>}
    {notice&&<p className="mt-4 rounded-xl border border-[#568dbd] bg-[#1c4667] p-3 text-sm" role="status">{notice}</p>}
    <div className="rch-ranked-review-state"><FaShieldHalved aria-hidden="true"/> An entered score is a pickup record only. Until opposing checked-in sides confirm the official review, no rank or verified match reward is granted.</div>
    {!loading&&!unavailable&&<div className="mt-5 space-y-3">
      {games.filter(g=>g.status==='completed').map(game=>{
        const review=reviews.find(r=>r.game_id===game.id);
        const onHome=Boolean(user&&review?.home_roster.includes(user.id));
        const onAway=Boolean(user&&review?.away_roster.includes(user.id));
        const canConfirm=review?.status==='pending'&&((onHome&&!review.home_confirmed_by)||(onAway&&!review.away_confirmed_by));
        const canSubmit=Boolean(user?.id===hostId&&(!review||review.status==='rejected'));
        return <article key={game.id} className="rounded-2xl border border-[#365b7d] bg-[#07182a]/85 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-bold text-[#a8c7e7]">{label(game.home_run_team_id)} vs {label(game.away_run_team_id)}</p>
              <p className="mt-1 font-display text-2xl font-black text-white">{review?review.home_score:game.home_score} – {review?review.away_score:game.away_score}</p></div>
            <span className={'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider '+(review?.status==='verified'?'bg-emerald-400/15 text-emerald-200':'bg-[#2b5c88] text-[#d7eaff]')}>
              {review?.status==='verified'?'Verified / Rated':review?.status==='rejected'?'Disputed':review?'Awaiting both sides':'Not submitted'}
            </span>
          </div>
          {review?.status==='pending'&&<div className="rch-ranked-confirmation" aria-label="Independent team confirmation status"><div><strong>{review.home_confirmed_by?'✓ HOME CONFIRMED':'○ HOME PENDING'}</strong><small>One eligible checked-in home player</small></div><div><strong>{review.away_confirmed_by?'✓ AWAY CONFIRMED':'○ AWAY PENDING'}</strong><small>One eligible checked-in away player</small></div></div>}
          {confirmTarget===review?.id&&canConfirm&&<p className="rch-ranked-review-state" role="status">Check the displayed score. A second tap verifies it as your independent team confirmation. Use Dispute if incorrect.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {canSubmit&&<button disabled={!!busy} onClick={()=>void action('submit_ranked_run_result',{p_game:game.id})} className="min-h-10 rounded-xl bg-[#2b92ff] px-4 text-xs font-bold text-white disabled:opacity-50">{busy===game.id?'Saving…':review?'Resubmit corrected result':'Submit for ranking'}</button>}
            {canConfirm&&<><button disabled={!!busy} onClick={()=>{if(confirmTarget===review.id)void action('review_ranked_run_result',{p_match:review.id,p_approve:true});else setConfirmTarget(review.id);}} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-50"><FaCircleCheck/> {confirmTarget===review.id?'YES — VERIFY THIS SCORE':'Review and confirm'}</button>
              <button disabled={!!busy} onClick={()=>void action('review_ranked_run_result',{p_match:review.id,p_approve:false})} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#68839c] px-4 text-xs font-bold disabled:opacity-50"><FaFlag/> Dispute</button></>}
          </div>
        </article>;
      })}
      {!games.some(g=>g.status==='completed')&&<p className="rounded-xl border border-dashed border-[#446282] p-5 text-sm text-[#a9c6e4]">Once the host records a finished game, its score can enter the ranked verification process.</p>}
    </div>}
    <p className="mt-4 text-[11px] leading-5 text-[#9db8d5]">All players must be assigned to exactly sized teams and checked in. Ratings are separate for each format and never awarded for attendance or social REP.</p>
  </section>;
}
