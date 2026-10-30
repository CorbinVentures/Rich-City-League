'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCircleCheck,FaClock,FaShieldHalved,FaTrophy,FaUser} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {playerTarget,lobbySnapshot} from '@/lib/runs-gameplay-readiness';

type Person={id:string;display_name:string|null;username:string|null;avatar_url?:string|null};
type VerifiedReceipt={run_id:string;won:boolean;xp:number;rep:number;verified_at:string};
type Props={
 runId:string;format:string;status:string;capacity:number;past:boolean;suggested:boolean;listingUnknown:boolean;
 registeredIds:readonly string[];checkedInIds:readonly string[];profiles:readonly Person[];
 userId:string|null;scorecardCount:number;
};

/** The game lobby only visualizes server records. RSVP != physical attendance.
 * Recorded pickup score != independently confirmed competitive result. */
export function RunsGameplayJourney({runId,format,status,capacity,past,suggested,listingUnknown,registeredIds,checkedInIds,profiles,userId,scorecardCount}:Props){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [verified,setVerified]=useState<VerifiedReceipt|null>(null);
 const [verifiedError,setVerifiedError]=useState(false);
 useEffect(()=>{
  if(!userId||!db){setVerified(null);return;}
  let alive=true;setVerified(null);setVerifiedError(false);
  void db.rpc('get_rch_world_expansion').then(({data,error}:{data:{receipts?:VerifiedReceipt[]}|null;error:unknown})=>{
   if(!alive)return;
   if(error){setVerifiedError(true);return;}
   setVerified((data?.receipts||[]).find(receipt=>receipt.run_id===runId)||null);
  }).catch(()=>{if(alive)setVerifiedError(true);});
  return()=>{alive=false;};
 },[db,runId,userId,scorecardCount]);
 const roster=lobbySnapshot({format,registered:registeredIds.length,capacity,status,suggested,past});
 const slots=playerTarget(format);
 const actualSlots=slots===null?Math.min(10,Math.max(1,registeredIds.length)):slots;
 const checkedIn=Boolean(userId&&checkedInIds.includes(userId));
 const signedUp=Boolean(userId&&registeredIds.includes(userId));
 const unavailable=suggested||listingUnknown||past||!['open','full'].includes(status);
 const stage=verified?4:checkedIn?2:signedUp?1:0;
 const nextAction=verified?{href:'/runs?view=list#rch-upcoming-runs',title:'FIND YOUR NEXT GAME',desc:'Keep building your verified basketball story'}:
 !userId?{href:'/auth/sign-in?next='+encodeURIComponent('/runs/'+runId),title:'SIGN IN TO PLAY',desc:'Create your player and register for a real Run'}:
 !signedUp?{href:'#rch-join-action',title:unavailable?'EXPLORE OTHER RUNS':'CLAIM YOUR ROSTER SPOT',desc:unavailable?'This listing cannot confirm a game. Find another hosted Run.':'Register for the actual roster; attendance is separate'}:
 !checkedIn?{href:past?'/runs?view=list#rch-upcoming-runs':'#rch-game-day',title:past?'FIND YOUR NEXT GAME':'GET GAME-DAY READY',desc:past?'This event has ended; do not attempt a late check-in':'Check in at the court using the host’s in-person code'}:
 !verified?{href:scorecardCount>0?'#rch-result-review':'#rch-next-up',title:scorecardCount>0?'REVIEW THE RESULT':'GET ON DECK',desc:'Only independent confirmation can award ranked results'}:
 {href:'/runs?view=list#rch-upcoming-runs',title:'PLAY AGAIN',desc:'Find a real hosted game'};
 const safeAction=unavailable&&!verified&&nextAction.href==='#rch-join-action'?{...nextAction,href:'/runs?view=list#rch-upcoming-runs'}:nextAction;
 return <section className="rch-game-journey" aria-label="Live Runs game journey" data-rch-game-lifecycle="true">
  <header className="rch-game-journey-head"><div><span>GAME LOBBY · REAL BASKETBALL</span><h2>YOUR GAME DAY</h2></div><div className="rch-game-journey-format"><FaBasketball aria-hidden="true"/>{format.toUpperCase()}</div></header>
  <div className="rch-game-journey-stages" aria-label="Game lifecycle">
   {[
    {title:'JOIN',desc:'Roster',target:'#rch-join-action',icon:FaUser},
    {title:'ARRIVE',desc:'Court code',target:'#rch-game-day',icon:FaClock},
    {title:'PLAY',desc:'On deck',target:'#rch-next-up',icon:FaBasketball},
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
      <small>{playerId?(checkedInIds.includes(playerId)?'CHECKED IN':'RSVP · NOT CHECKED IN'):'WAITING FOR A PLAYER'}</small>
     </div>;
    })}
   </div>}
  {slots===null&&<p className="rch-game-journey-caution">Game format needs host confirmation; roster minimum cannot be determined.</p>}
  {!suggested&&slots!==null&&<p className="rch-game-journey-caution">{roster.guidance}</p>}
  {verified?<div className="rch-game-verified" role="status"><FaTrophy aria-hidden="true"/><div><strong>{verified.won?'VICTORY VERIFIED':'GAME VERIFIED'}</strong><span>+{verified.xp} World XP · +{verified.rep} credited match REP · independently confirmed for your player</span></div></div>:
   scorecardCount>0?<p className="rch-game-journey-caution"><FaShieldHalved aria-hidden="true"/> {scorecardCount} pickup scorecard{scorecardCount===1?'':'s'} recorded. This does not prove a verified ranked result or issue rewards.</p>:null}
  {verifiedError&&<p className="rch-game-journey-caution">Verified career receipts cannot sync right now; no game result is being assumed.</p>}
  <Link href={safeAction.href} className="rch-game-next"><div><small>YOUR NEXT MOVE</small><strong>{safeAction.title}</strong><span>{safeAction.desc}</span></div><FaArrowRight aria-hidden="true"/></Link>
  {verified&&<Link className="rch-game-replay" href="/runs?view=world&mode=player">VIEW VERIFIED CAREER RECAP <FaArrowRight aria-hidden="true"/></Link>}
 </section>;
}
