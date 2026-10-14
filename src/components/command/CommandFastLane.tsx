'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {FaArrowRight,FaBolt,FaMagnifyingGlass,FaXmark} from 'react-icons/fa6';
import {actionById,areaSuggestions,commandActions,findCommandActions,type CommandAction,type CommandArea,type CommandCaptureKind} from '@/lib/command/fastlane';

export type CommandWorkSignal={id:string;title:string;detail:string;area:CommandArea;tone:'urgent'|'warning'|'info'};
export type CommandFocusGame={id:string;label:string;when:string};
type Props={
 active:CommandArea;
 open:boolean;
 onOpenChange:(next:boolean)=>void;
 onNavigate:(area:CommandArea)=>boolean;
 onCapture:(kind:CommandCaptureKind,defaults:Record<string,string>)=>boolean;
 signals:CommandWorkSignal[];
 games:CommandFocusGame[];
};

const recentKey='rch-command-fastlane-recent-v1';
const gameKinds:CommandCaptureKind[]=['ledger','bookings','concession_sales','tasks'];

export function CommandFastLane({active,open,onOpenChange,onNavigate,onCapture,signals,games}:Props){
 const [search,setSearch]=useState('');
 const [selectedGame,setSelectedGame]=useState('auto');
 const [recent,setRecent]=useState<string[]>([]);
 const [cursor,setCursor]=useState(0);
 const inputRef=useRef<HTMLInputElement>(null);
 const gameId=selectedGame==='auto'?(games[0]?.id||''):selectedGame;
 const visible=useMemo(()=>{
  const found=findCommandActions(search);
  if(search.trim())return found;
  const priority=[...recent,...areaSuggestions[active]];
  return [...found].sort((a,b)=>{
   const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);
   return (ai<0?999:ai)-(bi<0?999:bi);
  });
 },[search,recent,active]);
 const suggestions=areaSuggestions[active].map(id=>actionById(id)).filter((a):a is CommandAction=>Boolean(a));
 useEffect(()=>{
  try{
   const stored=JSON.parse(window.localStorage.getItem(recentKey)||'[]');
   if(Array.isArray(stored))setRecent(stored.filter((id):id is string=>typeof id==='string'&&Boolean(actionById(id))).slice(0,5));
  }catch{/* Corrupt or unavailable local preferences should never block work. */}
 },[]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();onOpenChange(!open);return;}
   if(e.key==='Escape'&&open){e.preventDefault();onOpenChange(false);}
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[open,onOpenChange]);
 useEffect(()=>{if(open){inputRef.current?.focus();setCursor(0)}},[open]);
 useEffect(()=>{setCursor(0)},[search]);
 const run=(action:CommandAction)=>{
  const defaults={...action.defaults};
  if(gameId&&action.kind&&gameKinds.includes(action.kind))defaults.game_id=gameId;
  const success=action.kind?onCapture(action.kind,defaults):onNavigate(action.area);
  if(!success)return;
  const next=[action.id,...recent.filter(id=>id!==action.id)].slice(0,5);
  setRecent(next);
  try{window.localStorage.setItem(recentKey,JSON.stringify(next));}catch{}
  setSearch('');
  onOpenChange(false);
 };
 return <>
  <section className="cmd-fastlane" aria-label="Fast Lane command shortcuts">
   <div className="cmd-fast-heading">
    <div><p className="cmd-eyebrow"><FaBolt aria-hidden="true"/> FAST LANE</p><h2>{active==='overview'?'What needs to get done?':'Get straight to the action.'}</h2><p>Find a task, take action, move on.</p></div>
    <div className="cmd-fast-game">
     <label htmlFor="cmd-context-game">WORKING ON</label>
     <select id="cmd-context-game" value={gameId} onChange={e=>setSelectedGame(e.target.value)} aria-label="Choose a game for new records">
      <option value="">League-wide / no game</option>
      {games.map(g=><option key={g.id} value={g.id}>{g.label} · {g.when}</option>)}
     </select>
    </div>
   </div>
   <div className="cmd-fast-actions">
    {suggestions.map(a=><button key={a.id} type="button" onClick={()=>run(a)} className="cmd-fast-action" title={a.description}>
      <span>{a.title}</span><FaArrowRight aria-hidden="true" size={11}/>
    </button>)}
    <button className="cmd-fast-all" type="button" onClick={()=>onOpenChange(true)}><FaMagnifyingGlass aria-hidden="true" size={12}/> Find any action <kbd>⌘ K</kbd></button>
   </div>
   {active==='overview'&&<div className="cmd-fast-queue">
    <div className="cmd-fast-queue-head"><strong>Action queue</strong><small>Based on existing league records</small></div>
    <div className="cmd-fast-signal-list">
     {signals.length?signals.slice(0,4).map(signal=><button key={signal.id} type="button" className={'cmd-fast-signal '+signal.tone} onClick={()=>onNavigate(signal.area)}>
      <span className="cmd-fast-signal-dot" aria-hidden="true"/><span><strong>{signal.title}</strong><small>{signal.detail}</small></span><FaArrowRight size={12} aria-hidden="true"/>
     </button>):<p className="cmd-fast-clear">No urgent actions in the records currently loaded. Use Quick Find to start a new task.</p>}
    </div>
   </div>}
  </section>
  {open&&<div className="cmd-fast-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onOpenChange(false)}}>
   <section className="cmd-fast-dialog" role="dialog" aria-modal="true" aria-label="Find a Command Center action">
    <div className="cmd-fast-search-row"><FaMagnifyingGlass aria-hidden="true" size={17}/>
     <input ref={inputRef} type="search" value={search} autoComplete="off" placeholder="What do you want to do? Try ‘sell snacks’ or ‘make trailer’"
      aria-label="Search Command Center actions" onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{
       if(e.key==='ArrowDown'){e.preventDefault();setCursor(c=>(c+1)%Math.max(1,visible.length));}
       if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>(c+Math.max(1,visible.length)-1)%Math.max(1,visible.length));}
       if(e.key==='Enter'&&visible.length){e.preventDefault();run(visible[Math.min(cursor,visible.length-1)]);}
      }}/>
     <button type="button" aria-label="Close quick find" onClick={()=>onOpenChange(false)}><FaXmark aria-hidden="true"/></button>
    </div>
    <div className="cmd-fast-results-label">{search?'MATCHING ACTIONS':'RECOMMENDED AND RECENT ACTIONS'} <span>{visible.length} available</span></div>
    <div className="cmd-fast-results">
     {visible.length?visible.map((action,index)=><button key={action.id} type="button" className={'cmd-fast-result '+(index===cursor?'chosen':'')} onClick={()=>run(action)} onMouseEnter={()=>setCursor(index)}>
      <span><strong>{action.title}</strong><small>{action.description}</small></span><span className="cmd-fast-result-right">{action.kind?'QUICK CAPTURE':'OPEN DESK'} <FaArrowRight aria-hidden="true"/></span>
     </button>):<div className="cmd-fast-none">No matching action. Try “venue”, “budget”, “halftime”, “trade”, or “tickets”.</div>}
    </div>
    <footer className="cmd-fast-help">↑ ↓ choose <span>↵ open</span><span>esc close</span><span>{commandActions.length} available workflows</span></footer>
   </section>
  </div>}
 </>;
}
