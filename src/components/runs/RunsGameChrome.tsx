'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaCompass,FaCrown,FaPeopleGroup,FaShieldHalved} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';

type Stats={level:number;within:number;toNext:number};
const modes=[
 {label:'PLAY',href:'/runs?view=world&mode=home',icon:FaBasketball,selected:'play'},
 {label:'WORLD',href:'/runs/world',icon:FaCompass,selected:'world'},
 {label:'CREWS',href:'/crews?intent=mine',icon:FaPeopleGroup,selected:'crew'},
 {label:'MY PLAYER',href:'/runs?view=world&mode=player',icon:FaCrown,selected:'player'}
] as const;

export function RunsGameChrome({crew=false}:{crew?:boolean}){
 const pathname=usePathname();
 const params=useSearchParams();
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [stats,setStats]=useState<Stats|null>(null);
 const isWorldHome=pathname==='/runs'&&params.get('view')==='world';
 const show=crew||(pathname.startsWith('/runs')&&!isWorldHome&&pathname!=='/runs/world');
 const active=crew?'crew':pathname.startsWith('/runs/courts/')?'world':params.get('mode')==='player'?'player':'play';
 useEffect(()=>{
  if(!show||!db||!user?.id){setStats(null);return;}
  let alive=true;
  setStats(null);
  void db.rpc('get_rch_world_journey').then(({data,error}:{data:WorldJourney|null;error:unknown})=>{
   if(!alive)return;
   if(error||!data?.signed_in){setStats(null);return;}
   const progress=worldXpProgress(data.world_xp);
   setStats({level:progress.level,within:progress.within,toNext:progress.toNext});
  }).catch(()=>{if(alive)setStats(null);});
  return()=>{alive=false;};
 },[db,user?.id,show]);
 if(!show)return null;
 return <section className="rch-game-chrome" aria-label="Runs game navigation">
  <div className="rch-game-chrome-brand"><span className="rch-game-chrome-logo"><FaBasketball aria-hidden="true"/></span><div><strong>RCH <em>RUNS</em></strong><small>VIRGINIA COURT WORLD</small></div><span className="rch-game-chrome-season"><FaShieldHalved aria-hidden="true"/> LIVE GAME WORLD</span></div>
  <div className="rch-game-chrome-body">
   <nav className="rch-game-chrome-modes" aria-label="Runs game destinations">{modes.map(mode=><Link key={mode.selected} href={mode.href} aria-current={active===mode.selected?'page':undefined}><mode.icon aria-hidden="true"/><span>{mode.label}</span></Link>)}</nav>
   {user&&stats&&<div className="rch-game-chrome-hud" aria-label="Hooper level"><div><small>HOOPER LVL</small><strong>{stats.level}</strong></div></div>}
   {!user&&<Link className="rch-game-chrome-signin" href={'/auth/sign-in?redirect='+encodeURIComponent(pathname||'/runs')}>SIGN IN</Link>}
  </div>
  {stats&&<div className="rch-game-chrome-xp"><span>LVL {stats.level}</span><progress max={stats.toNext} value={stats.within} aria-label="World XP toward next Hooper Level"/><span>{stats.toNext-stats.within} XP TO LEVEL UP</span></div>}
 </section>;
}
