'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaCompass,FaCrown,FaPeopleGroup,FaShieldHalved,FaArrowRight} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';

type Stats={level:number;within:number;toNext:number;verified:number;rep:number|null};
const modes=[
 {label:'PLAY',href:'/runs?view=world&mode=home',icon:FaBasketball,selected:'play'},
 {label:'WORLD',href:'/runs/world',icon:FaCompass,selected:'world'},
 {label:'CREWS',href:'/crews?intent=mine',icon:FaPeopleGroup,selected:'crew'},
 {label:'MYPLAYER',href:'/runs?view=world&mode=player',icon:FaCrown,selected:'player'}
] as const;

export function RunsGameChrome({crew=false}:{crew?:boolean}){
 const pathname=usePathname();
 const params=useSearchParams();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [stats,setStats]=useState<Stats|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 const isWorldHome=pathname==='/runs'&&params.get('view')==='world';
 const show=crew||(pathname.startsWith('/runs')&&!isWorldHome&&pathname!=='/runs/world');
 const active=crew?'crew':pathname.startsWith('/runs/courts/')?'world':params.get('mode')==='player'?'player':'play';
 useEffect(()=>{
  if(!show||!db||!user?.id){setStats(null);setUnavailable(false);return;}
  let alive=true;
  setStats(null);setUnavailable(false);
  void Promise.all([
   db.rpc('get_rch_world_journey'),
   db.from('rch_rep_wallets').select('balance').eq('profile_id',user.id).maybeSingle()
  ]).then(([journey,wallet]:[{data:WorldJourney|null;error:unknown},{data:{balance:number}|null;error:unknown}])=>{
   if(!alive)return;
   if(journey.error||!journey.data?.signed_in){setUnavailable(true);return;}
   const x=worldXpProgress(journey.data.world_xp);
   setStats({level:x.level,within:x.within,toNext:x.toNext,verified:journey.data.verified_games,rep:wallet.error?null:Number(wallet.data?.balance??0)});
  }).catch(()=>{if(alive)setUnavailable(true);});
  return()=>{alive=false;};
 },[db,user?.id,show]);
 if(!show)return null;
 return <section className="rch-game-chrome" aria-label="Runs game dashboard">
  <div className="rch-game-chrome-brand"><span className="rch-game-chrome-logo"><FaBasketball aria-hidden="true"/></span><div><strong>RCH <em>RUNS</em></strong><small>THE REAL-WORLD BASKETBALL GAME</small></div><span className="rch-game-chrome-season"><FaShieldHalved/> VERIFIED PLAY</span></div>
  <div className="rch-game-chrome-body">
   <nav className="rch-game-chrome-modes" aria-label="Runs game destinations">{modes.map(mode=><Link key={mode.selected} href={mode.href} aria-current={active===mode.selected?'page':undefined}><mode.icon aria-hidden="true"/><span>{mode.label}</span></Link>)}</nav>
   <div className="rch-game-chrome-hud" aria-label="Your verified Runs career">
    <div><small>HOOPER LVL</small><strong>{!user?'—':stats?.level??'—'}</strong></div>
    <div><small>VERIFIED GAMES</small><strong>{!user?'—':stats?.verified??'—'}</strong></div>
    <div><small>REP WALLET</small><strong>{stats?.rep!==null&&stats?.rep!==undefined?stats.rep.toLocaleString():'—'}</strong></div>
   </div>
  </div>
  {stats?<div className="rch-game-chrome-xp"><span>LEVEL {stats.level} PROGRESS</span><progress max={stats.toNext} value={stats.within} aria-label="Verified World XP toward next Hooper Level"/><span>{stats.toNext-stats.within} XP TO GO</span></div>:
   <div className="rch-game-chrome-note">{!user?'Sign in to build a verified basketball career.':unavailable?'Career data temporarily unavailable. Your actual game records are unchanged.':'Syncing verified basketball career…'} <Link href={!user?'/auth/sign-in?redirect=%2Fruns':'/runs?view=world&mode=player'}>{!user?'SIGN IN':'MYPLAYER'} <FaArrowRight aria-hidden="true"/></Link></div>}
 </section>;
}
