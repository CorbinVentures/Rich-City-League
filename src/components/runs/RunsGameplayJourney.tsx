'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCircleCheck,FaClock,FaShieldHalved,FaTrophy,FaUser} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {playerTarget,lobbySnapshot} from '@/lib/runs-gameplay-readiness';

type Person={id:string;display_name:string|null;username:string|null;avatar_url?:string|null};
type VerifiedReceipt={run_id:string;won:boolean;xp:number;rep:number;verified_at:string};
type RankedReview={id:string;home_roster:string[];away_roster:string[];status:'pending'|'verified'|'rejected';home_confirmed_by:string|null;away_confirmed_by:string|null;home_score:number;away_score:number;submitted_at:string;verified_at:string|null};
type Props={
 runId:string;runType:string;format:string;status:string;capacity:number;past:boolean;suggested:boolean;listingUnknown:boolean;
 registeredIds:readonly string[];checkedInIds:readonly string[];profiles:readonly Person[];
 userId:string|null;scorecardCount:number;host:boolean;liveGame:boolean;
};

/** The game lobby only visualizes server records. RSVP != physical attendance.
 * Recorded pickup score != independently confirmed competitive result. */
export function RunsGameplayJourney({runId,runType,format,status,capacity,past,suggested,listingUnknown,registeredIds,checkedInIds,profiles,userId,scorecardCount,host,liveGame}:Props){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [verified,setVerified]=useState<VerifiedReceipt|null>(null);
 const [verifiedError,setVerifiedError]=useState(false);
 const [refreshTick,setRefreshTick]=useState(0);
 const [rankedReview,setRankedReview]=useState<RankedReview|null>(null);
 const [rankedReviewError,setRankedReviewError]=useState(false);
 const [rankedReviewLoading,setRankedReviewLoading]=useState(false);
 const [queueStatus,setQueueStatus]=useState<'waiting'|'called'|'playing'|null>(null);
 useEffect(()=>{
  if(!userId||!db){setVerified(null);return;}
  let alive=true;setVerified(null);setVerifiedError(false);
  void db.rpc('get_rch_world_expansion').then(({data,error}:{data:{receipts?:VerifiedReceipt[]}|null;error:unknown})=>{
   if(!alive)return;
   if(error){setVerifiedError(true);return;}
   setVerified((data?.receipts||[]).find(receipt=>receipt.run_id===runId)||null);
  }).catch(()=>{if(alive)setVerifiedError(true);});
  return()=>{alive=false;};
 },[db,runId,userId,scorecardCount,refreshTick]);
 const rankedEligible=runType==='competitive'&&['1v1','2v2','3v3','4v4','5v5'].includes(format);
 useEffect(()=>{
  if(!db||!userId||!rankedEligible||suggested||listingUnknown){setRankedReview(null);setRankedReviewError(false);setRankedReviewLoading(false);return;}
  let active=true;setRankedReviewLoading(true);setRankedReviewError(false);
  void db.from('run_ranked_matches')
   .select('id,home_roster,away_roster,status,home_confirmed_by,away_confirmed_by,home_score,away_score,submitted_at,verified_at')
   .eq('run_id',runId).order('submitted_at',{ascending:false}).limit(60)
   .then(({data,error}:{data:RankedReview[]|null;error:unknown})=>{
    if(!active)return;
    if(error){setRankedReview(null);setRankedReviewError(true);}
    else setRankedReview((data||[]).find(match=>match.home_roster.includes(userId)||match.away_roster.includes(userId))||null);
    setRankedReviewLoading(false);
   }).catch(()=>{if(active){setRankedReview(null);setRankedReviewError(true);setRankedReviewLoading(false);}});
  return()=>{active=false;};
 },[db,runId,userId,rankedEligible,suggested,listingUnknown,refreshTick,scorecardCount]);
 useEffect(()=>{
  if(!db||!userId||suggested||listingUnknown){setQueueStatus(null);return;}
  let active=true;
  const load=()=>db.from('rch_run_queue').select('status')
   .eq('run_id',runId).eq('profile_id',userId).in('status',['waiting','called','playing'])
   .order('joined_at',{ascending:false}).limit(1).maybeSingle()
   .then(({data,error}:{data:{status:string}|null;error:unknown})=>{
    if(!active)return;
    setQueueStatus(!error&&['waiting','called','playing'].includes(data?.status||'')?data!.status as 'waiting'|'called'|'playing':null);
   }).catch(()=>{if(active)setQueueStatus(null);});
  void load();
  const channel=db.channel('rch-game-day-personal-queue-'+runId+'-'+userId)
   .on('postgres_changes',{event:'*',schema:'public',table:'rch_run_queue',filter:'run_id=eq.'+runId},()=>{void load();})
   .subscribe();
  return()=>{active=false;void db.removeChannel(channel);};
 },[db,runId,userId,suggested,listingUnknown]);
 useEffect(()=>{
  if(!db||!userId||suggested)return;
  const channel=db.channel('rch-game-day-verified-'+runId)
   .on('postgres_changes',{event:'*',schema:'public',table:'run_ranked_matches',filter:'run_id=eq.'+runId},()=>setRefreshTick(v=>v+1))
   .subscribe();
  return()=>{void db.removeChannel(channel);};
 },[db,runId,userId,suggested]);
 const [shareStatus,setShareStatus]=useState('');
 const sharePostgame=async()=>{
  if(!verified)return;
  const text='RCH Runs · '+(verified.won?'Verified Victory':'Verified Game')+
   ' · '+format+' · +'+verified.xp+' World XP · +'+verified.rep+' Match REP. #RCHRuns';
  const url=window.location.origin+'/runs/'+encodeURIComponent(runId);
  try{
   if(navigator.share)await navigator.share({title:'My verified RCH Runs result',text,url});
   else{await navigator.clipboard.writeText(text+' '+url);setShareStatus('Verified result recap copied.');}
  }catch(error){
   if(!(error instanceof Error&&error.name==='AbortError'))setShareStatus('Sharing unavailable on this device.');
  }
 };
 const roster=lobbySnapshot({format,registered:registeredIds.length,capacity,status,suggested,past});
 const slots=playerTarget(format);
 const actualSlots=slots===null?Math.min(10,Math.max(1,registeredIds.length)):slots;
 const checkedIn=Boolean(userId&&checkedInIds.includes(userId));
 const signedUp=Boolean(userId&&registeredIds.includes(userId));
 const unavailable=suggested||listingUnknown||past||!['open','full'].includes(status);
 // Never mark a player's PLAY / CONFIRM stages complete because another team recorded a scorecard.
 const outstandingReview=rankedReview?.status==='pending'||rankedReview?.status==='rejected';
 const resultVerified=Boolean(verified||rankedReview?.status==='verified');
 const stage=outstandingReview?3:resultVerified?4:liveGame?2:checkedIn?2:signedUp?1:0;
 const onHome=Boolean(userId&&rankedReview?.home_roster.includes(userId));
 const mySideConfirmed=Boolean(onHome?rankedReview?.home_confirmed_by:rankedReview?.away_confirmed_by);
 const otherSideConfirmed=Boolean(onHome?rankedReview?.away_confirmed_by:rankedReview?.home_confirmed_by);
 const nextAction=rankedReview?.status==='pending'?{href:'#rch-result-review',title:mySideConfirmed?'WAITING ON THE OTHER SIDE':'REVIEW & CONFIRM THE SCORE',desc:mySideConfirmed?'Your side confirmed. The opposing side must confirm before ratings or rewards.':'Check the final score below, then confirm or dispute it.'}:
 rankedReview?.status==='rejected'?{href:'#rch-result-review',title:host?'REVIEW & RESUBMIT SCORE':'SCORE DISPUTED · HOST REVIEW',desc:host?'Correct the recorded score and submit it for both sides to review.':'The host must correct the score before either side can confirm.'}:
 resultVerified?{href:'/runs?view=list#rch-upcoming-runs',title:'FIND YOUR NEXT GAME',desc:'Keep building your verified basketball story'}:
 !userId?{href:'/auth/sign-in?next='+encodeURIComponent('/runs/'+runId),title:'SIGN IN TO PLAY',desc:'Create your player and register for a real Run'}:
 !signedUp?host?{href:'#rch-run-lobby',title:'MANAGE YOUR GAME',desc:'Host the event and set up teams; hosting is not player check-in'}:{href:'#rch-join-action',title:unavailable?'EXPLORE OTHER RUNS':'CLAIM YOUR ROSTER SPOT',desc:unavailable?'This listing cannot confirm a game. Find another hosted Run.':'Register for the actual roster; attendance is separate'}:
 !checkedIn?{href:past?'/runs?view=list#rch-upcoming-runs':'#rch-game-day',title:past?'FIND YOUR NEXT GAME':'GET GAME-DAY READY',desc:past?'This event has ended; do not attempt a late check-in':'Check in at the court using the host’s in-person code'}:
 liveGame?{href:'#rch-live-game',title:'FOLLOW THE LIVE GAME',desc:'The court score and player stats update as the host logs each play'}:
 !verified?scorecardCount>0&&rankedEligible?{href:'#rch-result-review',title:host?'SUBMIT SCORE FOR REVIEW':'WAIT FOR OFFICIAL SCORE',desc:host?'Send the completed score into independent team confirmation.':'A scorecard is recorded; the host still needs to submit it for review.'}:
 scorecardCount>0?{href:'#rch-next-up',title:'PICKUP SCORE RECORDED',desc:'This run does not use ranked confirmation or match rewards.'}:
 {href:'#rch-next-up',title:queueStatus==='called'?'YOU ARE ON DECK':queueStatus==='playing'?'RECORDED ON COURT':queueStatus==='waiting'?'YOUR NEXT UP QUEUE':'JOIN NEXT UP',desc:queueStatus==='called'?'The host marked you called; report to the court':queueStatus==='playing'?'The host recorded you as playing; no result is verified yet':queueStatus==='waiting'?'Your queue position is available in Next Up':'Get in the real court queue for this Run'}:
 {href:'/runs?view=list#rch-upcoming-runs',title:'PLAY AGAIN',desc:'Find a real hosted game'};
 const safeAction=unavailable&&!verified&&nextAction.href==='#rch-join-action'?{...nextAction,href:'/runs?view=list#rch-upcoming-runs'}:nextAction;
 return <section className="rch-game-journey" aria-label="Live Runs game journey" data-rch-game-lifecycle="true">
  <header className="rch-game-journey-head"><div><span>GAME LOBBY · REAL BASKETBALL</span><h2>YOUR GAME DAY</h2></div><div className="rch-game-journey-format"><FaBasketball aria-hidden="true"/>{format.toUpperCase()}</div></header>
  <div className="rch-game-journey-stages" aria-label="Game lifecycle">
   {[
    {title:'JOIN',desc:'Roster',target:'#rch-join-action',icon:FaUser},
    {title:'ARRIVE',desc:'Court code',target:'#rch-game-day',icon:FaClock},
    {title:'PLAY',desc:liveGame?'Live score':'Game mode',target:liveGame?'#rch-live-game':'#rch-next-up',icon:FaBasketball},
    {title:'CONFIRM',desc:'Official review',target:'#rch-result-review',icon:FaShieldHalved},
   ].map((step,index)=><a key={step.title} href={step.target} className={stage>index?'complete':stage===index?'current':''} aria-label={step.title+' · '+step.desc}>
    <step.icon aria-hidden="true"/><strong>{step.title}</strong><small>{step.desc}</small>{stage>index&&<FaCircleCheck className="rch-game-stage-check" aria-label="Completed"/>}</a>)}
  </div>
  <div className="rch-game-lineup-heading"><strong>GAME ROSTER</strong><span>{registeredIds.length} registered {slots!==null?' / '+slots+' minimum for '+format:''}</span></div>
  {suggested?<p className="rch-game-journey-caution">This is an open-court suggestion, not a hosted game. Interested players are not confirmed opponents.</p>:
   <div className="rch-game-lineup" aria-label="Registered roster slots">
    {Array.from({length:Math.max(actualSlots,Math.min(registeredIds.length,20))},(_,index)=>{
     const playerId=registeredIds[index];const person=profiles.find(item=>item.id===playerId);
     return <div key={playerId||'empty-'+index} className={'rch-game-slot '+(playerId?'occupied':'empty')+(playerId===userId?' own':'')}>
      <span className="rch-game-slot-avatar">{person?.avatar_url?<img src={person.avatar_url} alt="" loading="lazy"/>:<FaUser aria-hidden="true"/>}</span>
      <strong>{playerId?(person?.display_name||person?.username||'Registered player'):'OPEN SLOT'}</strong>
      <small>{playerId?(checkedInIds.includes(playerId)?'CHECKED IN':playerId===userId?'RSVP · NOT CHECKED IN':'RSVP · CHECK-IN NOT VISIBLE'):'WAITING FOR A PLAYER'}</small>
     </div>;
    })}
   </div>}
  {queueStatus&&<p className="rch-game-journey-caution" role="status" aria-live="polite"><FaBasketball aria-hidden="true"/> Your recorded Next Up status: <strong>{queueStatus.toUpperCase()}</strong>. Actual court play and result verification remain separate.</p>}
  {slots===null&&<p className="rch-game-journey-caution">Game format needs host confirmation; roster minimum cannot be determined.</p>}
  {!suggested&&slots!==null&&<p className="rch-game-journey-caution">{roster.guidance}</p>}
  {verified&&<div className="rch-game-verified" role="status"><FaTrophy aria-hidden="true"/><div><strong>{verified.won?'VICTORY VERIFIED':'GAME VERIFIED'}</strong><span>+{verified.xp} World XP · +{verified.rep} credited match REP · independently confirmed for your player</span></div></div>}
  {!verified&&rankedReview?.status==='verified'&&<div className="rch-game-verified rch-game-verified-sync" role="status" aria-live="polite"><FaTrophy aria-hidden="true"/><div><strong>HOME {rankedReview.home_score}–{rankedReview.away_score} AWAY · VERIFIED</strong><span>Both sides confirmed this result. Syncing your career rewards… No reward is shown until your verified receipt arrives.</span></div></div>}
  {rankedReview?.status==='pending'&&<div className="rch-ranked-result-card" role="status" aria-live="polite"><div className="rch-ranked-result-top"><div><small>OFFICIAL RESULT · {format} · HOME — AWAY</small><strong>{rankedReview.home_score}<span> — </span>{rankedReview.away_score}</strong></div><span className="rch-ranked-result-badge pending">AWAITING CONFIRMATION</span></div><p>{mySideConfirmed?'YOUR SIDE CONFIRMED · WAITING FOR OPPONENT':otherSideConfirmed?'OPPONENT CONFIRMED · YOUR REVIEW NEEDED':'BOTH SIDES MUST REVIEW'}</p><div className="rch-ranked-result-sides"><span>{rankedReview.home_confirmed_by?'✓ HOME CONFIRMED':'○ HOME PENDING'}</span><span>{rankedReview.away_confirmed_by?'✓ AWAY CONFIRMED':'○ AWAY PENDING'}</span></div></div>}
  {rankedReview?.status==='rejected'&&<div className="rch-ranked-result-card disputed" role="status" aria-live="polite"><div className="rch-ranked-result-top"><div><small>RESULT NEEDS HOST REVIEW · {format} · HOME — AWAY</small><strong>{rankedReview.home_score}<span> — </span>{rankedReview.away_score}</strong></div><span className="rch-ranked-result-badge disputed">DISPUTED</span></div><p>The score is not final. {host?'Correct it and resubmit for independent confirmation.':'The host must review and resubmit before this game can be verified.'}</p></div>}
  {!verified&&!rankedReview&&rankedReviewLoading&&<p className="rch-game-journey-caution" role="status">Checking official result status…</p>}
  {!verified&&!rankedReview&&scorecardCount>0?<p className="rch-game-journey-caution"><FaShieldHalved aria-hidden="true"/> {scorecardCount} pickup scorecard{scorecardCount===1?'':'s'} recorded. {rankedEligible?'This score is not official until the host submits it and both teams confirm.':'This run does not offer ranked score confirmation.'} No personal reward is assumed.</p>:null}
  {userId&&!suggested&&<button type="button" onClick={()=>setRefreshTick(v=>v+1)} className="rch-game-sync" aria-label="Refresh verified game rewards">Refresh verified game status</button>}
  {verifiedError&&<p className="rch-game-journey-caution">Verified career receipts cannot sync right now; no game result is being assumed.</p>}
  {rankedReviewError&&<p className="rch-game-journey-caution" role="status">Official result status is temporarily unavailable. Check the review desk before treating any score as final.</p>}
  <Link href={safeAction.href} className="rch-game-next"><div><small>YOUR NEXT MOVE</small><strong>{safeAction.title}</strong><span>{safeAction.desc}</span></div><FaArrowRight aria-hidden="true"/></Link>
  {verified&&<div className="rch-game-postgame-actions"><button type="button" onClick={()=>void sharePostgame()}>SHARE VERIFIED RESULT <FaArrowRight aria-hidden="true"/></button><Link className="rch-game-replay" href="/runs?view=world&mode=player">VIEW MYPLAYER CAREER <FaArrowRight aria-hidden="true"/></Link></div>}
  {shareStatus&&<p className="rch-game-journey-caution" role="status">{shareStatus}</p>}
 </section>;
}
