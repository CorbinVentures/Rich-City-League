/* RCH SCOREBOOK · COMMAND MODE 1.0
 * Progressive visual enhancement only.
 * No Supabase client, scoring RPC, synthetic stats, or event write.
 * Reuses the official scoring desk and DOM-delegated actions.
 */
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
const root=document.getElementById('app');if(!root)return;
const mq=window.matchMedia('(min-width:740px) and (pointer:coarse)');
const isIPad=()=>/iPad/i.test(navigator.userAgent)||
 (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const eligible=()=>mq.matches||(isIPad()&&innerWidth>=740);
let queued=false;
let lastGameKey='',lastScores=null;
function elem(tag,cls,txt){
 const v=document.createElement(tag);
 if(cls)v.className=cls;
 if(txt!==undefined)v.textContent=txt;
 return v;
}
function getOfficialScoreNodes(scorebar){
 return [...scorebar.querySelectorAll(':scope > .teamscore b')];
}
function addBroadcastIdentity(scorebar){
 if(scorebar.classList.contains('rch-command-scorebar'))return;
 scorebar.classList.add('rch-command-scorebar');
 const top=elem('div','rch-broadcast-top');
 const kick=elem('div','rch-broadcast-kicker');
 kick.append(elem('i','rhombus'),elem('span','','RCH / GAME CONTROL'));
 const state=elem('div','rch-broadcast-state');
 state.append(elem('i','node'),elem('span','',navigator.onLine?'NETWORK AVAILABLE':'OFFLINE VIEW'));
 top.append(kick,state);
 const bottom=elem('div','rch-broadcast-bottom');
 bottom.append(
  elem('span','','OFFICIAL SCOREKEEPING'),
  elem('span','','COURTSIDE COMMAND MODE  /  GAME IQ')
 );
 scorebar.prepend(top);scorebar.append(bottom);
 // Animate only values actually changed by an official Scorebook rerender.
 // An initial render is not interpreted as a scoring event.
 const key=document.querySelector('#gameSelector')?.value||'';
 const scores=getOfficialScoreNodes(scorebar).map(x=>Number(x.textContent.trim()));
 if(key&&scores.length===2&&scores.every(Number.isFinite)){
  if(key===lastGameKey&&lastScores){
   getOfficialScoreNodes(scorebar).forEach((node,i)=>{
    if(scores[i]!==lastScores[i]){
     node.classList.remove('rch-score-burst');
     void node.offsetWidth;node.classList.add('rch-score-burst');
    }
   });
  }
  lastGameKey=key;lastScores=scores;
 }
}
function organizeStatPads(desk){
 const grid=desk.querySelector('.actiongrid');
 if(!grid||grid.classList.contains('rch-stat-groups'))return;
 const pad=[...grid.children].filter(x=>x.matches('.act[data-arg]'));
 if(!pad.length)return;
 const categories=[
  {label:'FINISH THE PLAY',number:'01 · SCORING',keys:['2make','3make','ftmake']},
  {label:'SHOT OUTCOMES',number:'02 · MISSES',keys:['2miss','3miss','ftmiss']},
  {label:'OWN THE GLASS',number:'03 · REBOUNDS',keys:['rebound_off','rebound_def']},
  {label:'DEFENSE & DISCIPLINE',number:'04 · OTHER STATS',keys:['steal','block','turnover','foul']}
 ];
 const byAction=new Map(pad.map(p=>[p.dataset.arg,p]));
 grid.classList.add('rch-stat-groups');
 grid.replaceChildren();
 for(const category of categories){
  const buttons=category.keys.map(x=>byAction.get(x)).filter(Boolean);
  if(!buttons.length)continue;
  const group=elem('section','rch-stat-group');
  const heading=elem('div','rch-stat-label');
  heading.append(elem('strong','',category.label),elem('span','rch-stat-count',category.number));
  const cells=elem('div','rch-stat-grid');
  cells.append(...buttons);
  group.append(heading,cells);
  grid.append(group);
 }
 // Forward-compatibility: actions added by the official Scorebook renderer
 // must not silently disappear when a newer game-stat event is introduced.
 const extras=pad.filter(p=>!p.closest('.rch-stat-group'));
 if(extras.length){
  const other=elem('section','rch-stat-group');
  other.append(elem('div','rch-stat-label','ADDITIONAL ACTIONS'));
  const more=elem('div','rch-stat-grid');more.append(...extras);
  other.append(more);grid.append(other);
 }
}
function addLastEventInfo(desk){
 const rail=desk.querySelector('.rch-ipad-live');
 if(!rail)return;
 const panel=rail.querySelector(':scope > .panel');
 if(!panel||panel.querySelector('.rch-command-event-summary'))return;
 const feed=[...panel.querySelectorAll('.play')];
 // Tab content that isn't play-by-play should remain untouched.
 if(!panel.querySelector('.timeline'))return;
 const summary=elem('div','rch-command-event-summary'+(!feed.length?' empty':''));
 summary.append(elem('div','overline',feed.length?'MOST RECENT OFFICIAL EVENT':'PLAY-BY-PLAY READY'));
 if(feed.length){
  const last=feed[0];const player=last.querySelector('b')?.textContent?.trim()||'Player';
  const event=last.querySelector('.small.muted')?.textContent?.trim()||'Recorded action';
  const period=last.querySelector('.when')?.textContent?.replace(/\s+/g,' ').trim()||'';
  summary.append(elem('div','headline',player+' · '+event),elem('div','detail',period));
 }else{
  summary.append(elem('div','headline','Waiting for the first recorded play'),
                 elem('div','detail','Only official events appear here.'));
 }
 const meter=elem('div','rch-play-meter');
 meter.append(elem('div','meter-title','LAST '+Math.min(feed.length,10)+' RECORDED EVENTS'));
 if(feed.length){
  for(const play of feed.slice(0,10).reverse()){
   const info=play.querySelector('.small.muted')?.textContent?.toLowerCase()||'';
   const score=play.querySelector('strong')?.textContent?.trim()||'';
   if(info.includes('shot made')||info.includes('free throw made')||/^\+\d/.test(score))play.classList.add('rch-play-made');
   if(info.includes('miss'))play.classList.add('rch-play-miss');
   const dot=elem('span','meter-dot'+
      ((info.includes('made')||/^\+\d/.test(score))?' scored':info.includes('miss')?' missed':''));
   dot.setAttribute('title',play.textContent?.trim().replace(/\s+/g,' ').slice(0,100)||'Event');
   meter.append(dot);
  }
 }
 const head=panel.querySelector(':scope > .row');
 if(head)head.after(summary,meter);else panel.prepend(summary,meter);
}
function enhance(){
 if(!eligible())return;
 const wrap=root.querySelector('.wrap');if(!wrap)return;
 const scorebar=wrap.querySelector(':scope > .scorebar');
 if(scorebar)addBroadcastIdentity(scorebar);
 const desk=wrap.querySelector('#rch-ipad-score-desk');
 if(!desk||desk.classList.contains('rch-command-desk'))return;
 desk.classList.add('rch-command-desk');
 organizeStatPads(desk);
 addLastEventInfo(desk);
}
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{
  queued=false;
  try{enhance()}catch(error){console.warn('RCH Command Mode visual fallback:',error)}
 });
}
const observer=new MutationObserver(schedule);
observer.observe(root,{childList:true,subtree:true});
function network(){
 const state=root.querySelector('.rch-broadcast-state');
 if(state){
  state.classList.toggle('offline',!navigator.onLine);
  const txt=state.querySelector('span');if(txt)txt.textContent=navigator.onLine?'NETWORK AVAILABLE':'OFFLINE VIEW';
 }
}
window.addEventListener('online',network);
window.addEventListener('offline',network);
window.addEventListener('resize',schedule);
window.addEventListener('orientationchange',schedule);
schedule();
})();
