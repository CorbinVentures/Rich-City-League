'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {getSupabaseClient} from '@/lib/supabase';
import {worldMilestoneCatalog,type WorldJourney} from '@/lib/runs-world-progression';
import './runs-world-expansion.css';

type Receipt={id:string;run_id:string;court_slug:string|null;court_name:string|null;verified_at:string;game_format:string;won:boolean;xp:number;first_court:boolean;rep:number;badges:string[];territory:string|null;crown:string|null};
type Reward={code:string;title:string;price:number;delivery:string};
type Expansion={receipts:Receipt[];arenas:{court_slug:string;court_name:string;games:number;wins:number}[];weekly_courts:number;weekly_teammates:number;weekly_crew_games:number;loadout:{banner?:string|null;reward_goal?:string|null};wallet:number;rewards:Reward[]};
const title=(s:string)=>s.replaceAll('_',' ');

export function RunsWorldExpansion({mode,journey,revision}:{mode:'world'|'battle'|'missions'|'vault'|'player';journey:WorldJourney|null;revision:number}){
 const [data,setData]=useState<Expansion|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState('');
 const [notice,setNotice]=useState('');
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 useEffect(()=>{
  let active=true;
  if(!db){setError('Your game rewards cannot connect right now.');return;}
  setError('');
  void db.rpc('get_rch_world_expansion').then(({data:next,error:failure}:{data:Expansion|null;error:unknown})=>{
   if(!active)return;
   if(failure){setData(null);setError('Your game rewards could not sync. Please retry.');}
   else setData(next);
  }).catch(()=>{if(active){setData(null);setError('Your game rewards could not sync. Please retry.');}});
  return()=>{active=false;};
 },[db,revision,refresh]);
 const save=async(banner:string|null,reward:string|null)=>{
  if(!db||busy)return;
  setBusy(true);setNotice('');
  try{
   const {error:failure}=await db.rpc('set_rch_world_loadout',{p_banner:banner,p_reward:reward});
   if(failure)throw failure;
   setNotice('Saved to your player.');setRefresh(n=>n+1);
  }catch{setNotice('Could not save. Check that the milestone is earned and the reward is available, then retry.');}
  finally{setBusy(false);}
 };
 if(error)return <div className="rwx-panel" role="alert">{error} <button onClick={()=>setRefresh(n=>n+1)}>Retry</button></div>;
 if(!data)return <p className="rwx-loading" role="status">Loading your game rewards…</p>;
 const banner=worldMilestoneCatalog.find(m=>m.key===data.loadout.banner&&journey?.milestones[m.key]);
 const goal=data.rewards.find(r=>r.code===data.loadout.reward_goal);
 const latest=data.receipts.find(r=>r.id===selected)||data.receipts[0];
 const goalCard=<div className="rwx-goal">
  <span className="rwg-kicker">YOUR NEXT UNLOCK</span>
  {goal?<><h3>{goal.title}</h3><p>{data.wallet.toLocaleString()} / {goal.price.toLocaleString()} REP · {Math.max(0,goal.price-data.wallet).toLocaleString()} to go</p>
   <progress aria-label="REP toward selected reward" max={goal.price} value={Math.min(data.wallet,goal.price)}/>
   <Link href="/rep">{data.wallet>=goal.price?'Redeem in REP Exchange':'Explore REP Exchange'} →</Link></>:<><h3>Give your next game a goal.</h3><p>Choose a reward in your Vault and track it here.</p><Link href="/rep">Browse REP rewards →</Link></>}
 </div>;
 return <section className="rwx-panel" aria-label="Connected Runs rewards">
  {notice&&<p role="status">{notice}</p>}
  {(mode==='world'||mode==='player')&&<>
   {banner&&<div className={'rwx-banner banner-'+banner.key}><span aria-hidden="true">{banner.icon}</span><div><small>EQUIPPED WORLD BANNER</small><h3>{banner.name}</h3><p>{banner.description}</p></div></div>}
   {latest?<article className="rwx-recap" key={latest.id}>
    <div className="rwx-head"><span className="rwg-kicker">VERIFIED GAME RECAP</span><button onClick={()=>setRefresh(n=>n+1)}>Refresh results</button></div>
    <h2>{latest.won?'Victory recorded.':'Another game. More progress.'}</h2>
    <p>{latest.court_name||'Court'} · {latest.game_format} · {new Date(latest.verified_at).toLocaleDateString('en-US',{timeZone:'America/New_York'})}</p>
    <div className="rwx-stats"><div><strong>+{latest.xp}</strong><span>World XP</span></div><div><strong>+{latest.rep}</strong><span>Match REP credited</span></div><div><strong>{latest.first_court?'NEW':'✓'}</strong><span>{latest.first_court?'Verified court unlocked':'Verified game'}</span></div></div>
    {latest.badges.length>0&&<p className="rwx-earned">Badges earned: {latest.badges.map(title).join(' · ')}</p>}
    {latest.crown&&<p className="rwx-earned">Crown achievement: {title(latest.crown)}</p>}
    {latest.territory&&<p className="rwx-earned">Territory result: {latest.territory} won the court battle.</p>}
    <p>Weekly progress: {journey?.weekly_verified_games??'—'} verified games · {data.weekly_courts} courts · {data.weekly_teammates} different teammates.</p>
    <Link className="rwg-primary" href={'/runs/'+encodeURIComponent(latest.run_id)}>Open game room →</Link>
    {data.receipts.length>1&&<label className="rwx-history">Replay a verified game<select value={latest.id} onChange={e=>setSelected(e.target.value)}>{data.receipts.map(r=><option key={r.id} value={r.id}>{r.court_name||'Court'} · {new Date(r.verified_at).toLocaleDateString('en-US',{timeZone:'America/New_York'})} · {r.won?'Win':'Played'}</option>)}</select></label>}
    <small>Match REP comes from your wallet receipts, including any credited event bonus. Separately reviewed stat rewards appear in the Exchange ledger.</small>
   </article>:<div className="rwx-goal"><h3>Your first game starts the story.</h3><p>After a verified game, your XP, match REP, badges and court result appear here together.</p><Link href="/runs?view=list#rch-upcoming-runs">Find your next Run →</Link></div>}
   {goalCard}
  </>}
  {mode==='missions'&&<>
   <span className="rwg-kicker">EXPAND YOUR GAME · THIS WEEK</span><h3>New courts. New teammates. Crew battles.</h3>
   <div className="rwx-grid">{[
    {name:'Weekend explorer',count:data.weekly_courts,target:2,detail:'Play verified games at two different courts this week.',href:'/runs/world'},
    {name:'Build your five',count:data.weekly_teammates,target:3,detail:'Play verified games alongside three different teammates this week.',href:'/runs?view=list'},
    {name:'Crew on the court',count:data.weekly_crew_games,target:1,detail:'Participate in a verified, resolved crew territory battle this week.',href:'/crews?intent=mine'}
   ].map(m=><article key={m.name}><h4>{m.name}</h4><p>{m.detail}</p><strong>{Math.min(m.count,m.target)} / {m.target} {m.count>=m.target?'· Complete':''}</strong><progress aria-label={m.name} value={Math.min(m.count,m.target)} max={m.target}/><Link href={m.href}>{m.count>=m.target?'Plan your next game':'Take on mission'} →</Link></article>)}</div>
   <small>Mission progress uses verified games in the current Virginia week. These objectives do not add a separate REP payout.</small>
   <h3 className="rwx-subtitle">Your Court Journeys</h3>
   {data.arenas.length?<div className="rwx-grid">{data.arenas.map(a=><article key={a.court_slug}><h4>{a.court_name}</h4><p>✓ First game · {a.wins>0?'✓ First victory':'Next: first victory'}</p><p>{a.games} verified games · {a.wins} wins</p><Link href={'/runs/courts/'+encodeURIComponent(a.court_slug)}>View ladder and crown challenges →</Link></article>)}</div>:<p>Complete your first verified court game to start a court journey.</p>}
  </>}
  {mode==='vault'&&<>
   <span className="rwg-kicker">EARN IT. EQUIP IT.</span><h3>Milestone Banners</h3><p>Equip an earned banner on your Runs World and My Player screens. Your selection follows your account.</p>
   <div className="rwx-grid">{worldMilestoneCatalog.map(m=>{const earned=Boolean(journey?.milestones[m.key]);return <article key={m.key} className={earned?'rwx-unlocked':''}><span className="rwx-icon" aria-hidden="true">{m.icon}</span><h4>{m.name}</h4><p>{m.description}</p><button disabled={!earned||busy||banner?.key===m.key} onClick={()=>void save(m.key,data.loadout.reward_goal||null)}>{banner?.key===m.key?'Equipped':earned?'Equip banner':'Locked'}</button></article>;})}</div>
   {banner&&<button disabled={busy} onClick={()=>void save(null,data.loadout.reward_goal||null)}>Remove banner</button>}
   <h3 className="rwx-subtitle">Choose your next reward</h3>{goalCard}
   <div className="rwx-grid">{data.rewards.map(r=><article key={r.code}><h4>{r.title}</h4><p>{r.price.toLocaleString()} REP · {r.delivery==='instant'?'Instant activation':'Fulfillment review'}</p><button disabled={busy||goal?.code===r.code} onClick={()=>void save(data.loadout.banner||null,r.code)}>{goal?.code===r.code?'Goal selected':'Set reward goal'}</button><Link href="/rep">Details and redemption →</Link></article>)}</div>
  </>}
 </section>;
}
