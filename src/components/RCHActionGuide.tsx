'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaBolt,FaBuilding,FaCamera,FaChevronDown,FaCompass,FaMagnifyingGlass,FaPeopleGroup,FaPlay} from 'react-icons/fa6';
import {getRCHIntent,isRCHIntent,RCH_INTENTS,searchRCHActions,type RCHIntentId} from '@/lib/rch-user-intents';

type Props={variant?:'feed'|'drawer';onNavigate?:()=>void};
const preferenceKey='rch-next-move-intent-v1';
const usedKey='rch-next-move-used-v1';

const icons={
 play:FaBasketball,
 watch:FaPlay,
 connect:FaPeopleGroup,
 create:FaCamera,
 grow:FaBuilding,
} as const;

export function RCHActionGuide({variant='feed',onNavigate}:Props){
 const [active,setActive]=useState<RCHIntentId>('play');
 const [expanded,setExpanded]=useState(true);
 const [query,setQuery]=useState('');
 const isDrawer=variant==='drawer';
 useEffect(()=>{
  try{
   const stored=window.localStorage.getItem(preferenceKey);
   if(stored&&isRCHIntent(stored))setActive(stored);
   if(variant==='feed'&&window.localStorage.getItem(usedKey)==='1')setExpanded(false);
  }catch{/* Navigation remains available without device storage. */}
 },[variant]);
 const intent=getRCHIntent(active);
 const matches=useMemo(()=>query.trim()?searchRCHActions(query).slice(0,5):intent.actions,[query,intent]);
 const choose=(id:RCHIntentId)=>{
  setActive(id);setQuery('');
  try{window.localStorage.setItem(preferenceKey,id);}catch{}
 };
 const markUsed=()=>{
  try{window.localStorage.setItem(usedKey,'1');}catch{}
  onNavigate?.();
 };
 const collapse=()=>{
  try{window.localStorage.setItem(usedKey,'1');}catch{}
  setExpanded(false);
 };
 if(!isDrawer&&!expanded)return <section className="rch-move-collapsed" aria-label="Find what to do next">
  <div><FaBolt aria-hidden="true"/><span><strong>What’s your next move?</strong><small>Play, watch, connect, create or build.</small></span></div>
  <button type="button" onClick={()=>setExpanded(true)} aria-expanded={false} aria-label="Show RCH quick starts">Find my way <FaArrowRight aria-hidden="true"/></button>
 </section>;
 return <section className={'rch-move-guide rch-move-'+variant} aria-label="Find your next move on RCH">
  <div className="rch-move-head">
   <div><p className="rch-move-eyebrow"><FaBolt aria-hidden="true"/> YOUR NEXT MOVE</p>
    <h2>{isDrawer?'What are you here to do?':'What brings you to RCH today?'}</h2>
    <p>Pick a goal. We’ll show you where to start—no guessing through menus.</p></div>
   {!isDrawer&&<button type="button" onClick={collapse} className="rch-move-dismiss" aria-label="Minimize quick starts">Not now <FaChevronDown aria-hidden="true"/></button>}
  </div>
  <div className="rch-move-goals" aria-label="Choose what you want to do">
   {RCH_INTENTS.map(item=>{
    const Icon=icons[item.id];
    return <button type="button" key={item.id} aria-pressed={item.id===active} onClick={()=>choose(item.id)} className={'rch-move-goal '+(item.id===active?'selected':'')}>
     <Icon aria-hidden="true"/><span>{item.label}</span>
    </button>;
   })}
  </div>
  <div className="rch-move-context">
   <div><b>{query.trim()?'Matching shortcuts':intent.subtitle}</b><small>{query.trim()?'Choose an action to open that feature.':'Three straightforward ways to get started.'}</small></div>
   {isDrawer&&<Link href="/search" onClick={markUsed} className="rch-move-search-all"><FaCompass aria-hidden="true"/> Full search</Link>}
  </div>
  {isDrawer&&<label className="rch-move-search"><FaMagnifyingGlass aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try ‘join a run’ or ‘post a clip’" aria-label="Search what you can do on RCH"/></label>}
  <div className="rch-move-links">
   {matches.length?matches.map((action,index)=><Link key={action.id} href={action.href} onClick={markUsed} className={'rch-move-link '+(index===0?'rch-move-featured':'')}>
    <span className="rch-move-step" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
    <span className="rch-move-link-copy"><strong>{action.title}</strong><small>{action.detail}</small></span>
    <FaArrowRight aria-hidden="true" className="rch-move-arrow"/>
   </Link>):<div className="rch-move-empty">No quick action matches. <Link href="/search" onClick={markUsed}>Try the full RCH search <FaArrowRight aria-hidden="true"/></Link></div>}
  </div>
  <div className="rch-move-foot"><span>Your choice changes shortcuts, not your profile.</span>
   {!isDrawer&&<Link href="/today" onClick={markUsed}>See today in RCH <FaArrowRight aria-hidden="true"/></Link>}
  </div>
 </section>;
}
