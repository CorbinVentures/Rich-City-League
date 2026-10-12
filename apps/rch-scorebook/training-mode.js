/* RCH SCOREBOOK ACADEMY
 * Launchable from the separate Scorebook PWA, even at sign-in.
 * 100% device-local, deliberately no supabase, fetch, or server writes.
 */
(function(){
'use strict';
const E=window.RCHTrainingEngine;
if(!E){console.warn('RCH Training: engine unavailable');return;}
const STORAGE='rch-scorebook-academy-v1';
let state=null,open=false,rosterTeam='blue',showSub=false,subTeam='blue',feedback='',feedbackGood=true,root=null,previousFocus=null,tickTimer=null,overlay=null,renderQueued=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const team=id=>E.TEAMS.find(t=>t.id===id)||E.TEAMS[0];
const p=id=>E.player(id);
const current=()=>state&&state.mode==='guide'?E.LESSON[state.step]:null;
const percentage=(a,b)=>b?Math.round(a/b*100)+'%':'—';
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(s&&s.version===1&&Array.isArray(s.events)&&typeof s.step==='number'&&['guide','free'].includes(s.mode)
   &&s.events.length<3000&&s.events.every(x=>x&&E.ACTIONS.some(a=>a.kind===x.kind)||x&&x.kind==='sub')){
    state=s;state.running=false;
  }
 }catch{state=null;}
}
function save(){try{if(state)localStorage.setItem(STORAGE,JSON.stringify({...state,running:false}));}catch{}}
function launch(){
 if(open)return;
 open=true;previousFocus=document.activeElement;
 if(!root){root=document.createElement('div');root.id='rch-training-root';document.body.append(root);}
 document.body.classList.add('rch-training-open');
 if(!state)load();
 if(state)rosterTeam=state.team;
 overlay=document.createElement('div');overlay.className='tr-overlay';
 root.append(overlay);render();
 try{history.replaceState(history.state,'',location.pathname+location.search+location.hash);}catch{}
 const dismiss=overlay.querySelector('[data-tr="exit"]');dismiss?.focus({preventScroll:true});
}
function exit(){
 if(!open)return;
 open=false;state&&(state.running=false);save();
 document.body.classList.remove('rch-training-open');root?.replaceChildren();overlay=null;
 if(location.search.includes('training=1')){
  try{const u=new URL(location.href);u.searchParams.delete('training');history.replaceState(history.state,'',u.pathname+u.search+u.hash);}catch{}
 }
 previousFocus?.focus?.({preventScroll:true});
}
function run(command){
 if(!state)return;
 const out=E.apply(state,command);
 if(out.ok){state=out.state;save();}
 feedback=out.message;feedbackGood=out.ok;
 if(out.stepComplete&&state.mode==='guide'&&state.step===7)rosterTeam='gold';
 if(out.stepComplete&&state.mode==='guide'&&state.step===10)rosterTeam='blue';
 if(out.ok&&command.type==='sub')showSub=false;
 render();
}
function initial(){
 const done=localStorageSafe('rch-scorebook-academy-completed-v1')==='yes';
 return '<section class="tr-welcome"><div class="tr-welcome-top"><span class="tr-eyebrow">RCH · TRAINING ACADEMY</span><span class="tr-pill">100% PRACTICE · 0 OFFICIAL WRITES</span></div>'+
  '<h1>LEARN THE GAME.<br><em>RUN THE TABLE.</em></h1>'+
  '<p class="tr-lede">A dedicated practice arena for game scorers. Learn the workflow on fictional teams, experiment with the stat pads, and build confidence before the opening tip.</p>'+
  '<div class="tr-welcome-cards">'+
  '<button type="button" data-tr="start" data-mode="guide" class="tr-mode-card tr-guide-card"><span class="tr-mode-glyph">01</span><span class="tr-mode-flag">RECOMMENDED · 5–10 MIN</span><strong>GUIDED TRAINING</strong><span>13 interactive lessons: select players, score, credit assists, correct mistakes, substitute, and verify the box score.</span><span class="tr-mode-cta">START LESSON →</span></button>'+
  '<button type="button" data-tr="start" data-mode="free" class="tr-mode-card tr-free-card"><span class="tr-mode-glyph">∞</span><span class="tr-mode-flag">NO TIME LIMIT</span><strong>FREE PRACTICE</strong><span>Take over a fictional matchup. Enter every stat, run the clock, change lineups, and undo as much as you want.</span><span class="tr-mode-cta">OPEN SANDBOX →</span></button></div>'+
  '<div class="tr-welcome-footer"><span>✓ DEMO TEAMS</span><span>✓ DEVICE-ONLY SAVING</span><span>✓ NO LIVE GAMES CHANGED</span>'+(done?'<span>★ YOU COMPLETED GUIDED TRAINING</span>':'')+'</div></section>';
}
function localStorageSafe(k){try{return localStorage.getItem(k)}catch{return null}}
function banner(){
 const a=E.project(state);const progress=state.mode==='guide'?Math.min(state.step,E.LESSON.length):0;
 return '<section class="tr-broadcast" aria-label="Practice scoreboard">'+
 '<div class="tr-broadcast-top"><span class="tr-blip"></span><strong>GAME CONTROL · ACADEMY</strong><span>SIMULATED MATCHUP / NO OFFICIAL DATA</span></div>'+
 '<div class="tr-broadcast-middle">'+
 teamScore('blue',a.score.blue)+
 '<div class="tr-time"><span>TRAINING CLOCK</span><strong class="tr-clockval">'+E.formatTime(state.seconds)+'</strong><span>PERIOD '+state.period+'</span><div class="tr-time-controls"><button type="button" data-tr="clock" '+(state.completed?'disabled':'')+'>'+ (state.running?'PAUSE':'START')+'</button><button type="button" data-tr="resetclock">RESET</button><button type="button" data-tr="period" '+(state.mode==='guide'?'disabled title="Complete the lesson to edit periods"':'')+'>Q +</button></div></div>'+
 teamScore('gold',a.score.gold)+'</div>'+
 '<div class="tr-broadcast-footer"><span>DEMO SCOREBOARD</span><span>SIMULATION ONLY · NEVER PUBLISHED TO RCH</span></div></section>'+
 (state.mode==='guide'?'<div class="tr-lesson-progress"><div><strong>GUIDED TRAINING</strong><span>STEP '+Math.min(state.step+1,E.LESSON.length)+' OF '+E.LESSON.length+'</span></div><div class="tr-progress-track"><i style="width:'+Math.round(progress/E.LESSON.length*100)+'%"></i></div></div>':'<div class="tr-freebar"><span>FREE PRACTICE · EXPERIMENT WITHOUT CONSEQUENCES</span><span>'+state.events.length+' LOCAL EVENTS</span></div>');
}
function teamScore(id,v){let t=team(id);return '<div class="tr-side tr-'+id+'"><span>'+t.side+' · '+t.short+'</span><strong>'+Number(v)+'</strong><small>'+t.name+'</small></div>';}
function roster(){
 const rows=team(rosterTeam).players;const court=E.lineup(state)[rosterTeam];const t=team(rosterTeam);
 return '<section class="tr-panel tr-roster"><div class="tr-panel-heading"><div><span>01 / ROSTER COMMAND</span><h2>PICK THE PLAYER</h2></div><span class="tr-smallcaps">TAP JERSEY</span></div>'+
 '<div class="tr-team-tabs">'+E.TEAMS.map(x=>'<button type="button" data-tr="roster" data-team="'+x.id+'" class="'+(rosterTeam===x.id?'selected':'')+'">'+x.short+'</button>').join('')+'</div>'+
 '<div class="tr-lineup-label">ON COURT · 5 PLAYERS</div>'+
 '<div class="tr-playergrid">'+rows.filter(x=>court.includes(x.id)).map(x=>playerCard(x,true)).join('')+'</div>'+
 '<div class="tr-lineup-label">BENCH</div><div class="tr-playergrid">'+rows.filter(x=>!court.includes(x.id)).map(x=>playerCard(x,false)).join('')+'</div>'+
 '<div class="tr-panel-foot">Fictional '+esc(t.name)+' lineup · Practice only</div></section>';
}
function playerCard(x,on){
 const active=state.player===x.id;
 const stats=E.project(state).stats[x.id];
 const exp=current();const target=exp?.kind==='select'&&exp.player===x.id;
 return '<button type="button" class="tr-player'+(active?' selected':'')+(target?' tr-guide-target':'')+'" data-tr="select" data-team="'+rosterTeam+'" data-player="'+x.id+'"><span class="tr-jersey">#'+x.n+'</span><span class="tr-player-info"><strong>'+esc(x.name)+'</strong><small>'+stats.pts+' PTS · '+stats.reb+' REB · '+stats.pf+' PF</small></span><span class="tr-player-status">'+(on?'●':'○')+'</span></button>';
}
function statPads(){
 const chosen=p(state.player);const summary=chosen?('#'+chosen.n+' '+chosen.name):'SELECT A PLAYER';
 const st=chosen?E.project(state).stats[chosen.id]:null;
 const exp=current();const groups=['SCORING','MISSED SHOTS','REBOUNDS','PLAYMAKING','DISCIPLINE'];
 const pads=groups.map(g=>{
  const action=E.ACTIONS.filter(a=>a.group===g);
  return '<div class="tr-stat-group"><div class="tr-stat-group-title">'+g+'</div><div class="tr-stat-grid">'+
   action.map(a=>'<button type="button" data-tr="stat" data-kind="'+a.kind+'" class="tr-stat '+(a.kind.startsWith('made')?'made ':a.kind.startsWith('miss')?'miss ':'')+(exp?.kind==='event'&&exp.event===a.kind?' tr-guide-target':'')+'"><strong>'+a.label+'</strong><small>'+actionHint(a.kind)+'</small></button>').join('')+'</div></div>';
 }).join('');
 return '<section class="tr-panel tr-actions"><div class="tr-panel-heading"><div><span>02 / ACTION ENGINE</span><h2>RECORD THE PLAY</h2></div><span class="tr-smallcaps">TOUCH-FIRST</span></div>'+
 '<div class="tr-selected"><span class="tr-selected-label">ACTIVE PLAYER · '+esc(chosen?team(chosen.team).short:'NOT SET')+'</span><div class="tr-selected-name">'+esc(summary)+'</div><p>'+(st?st.pts+' PTS <b>·</b> '+st.reb+' REB <b>·</b> '+st.ast+' AST <b>·</b> '+st.pf+' PF':'Choose a player from either roster to begin scoring.')+'</p></div>'+
 '<div class="tr-actions-tools"><button type="button" data-tr="undo" class="'+(exp?.kind==='undo'?'tr-guide-target':'')+'">↶ UNDO LAST PLAY</button><button type="button" data-tr="sub-open" class="'+(exp?.kind==='sub'?'tr-guide-target':'')+'">⇄ SUBSTITUTION</button></div>'+
 pads+'</section>';
}
function actionHint(kind){
 const map={made2:'FIELD GOAL',made3:'BEYOND ARC',madeFT:'FREE THROW',miss2:'NO POINTS',miss3:'NO POINTS',missFT:'NO POINTS',oreb:'OFFENSIVE',dreb:'DEFENSIVE',assist:'PASSER',steal:'DEFENSE',block:'DEFENSE',turnover:'POSSESSION',foul:'PERSONAL'};
 return map[kind]||'OFFICIAL STAT';
}
function side(){
 const exp=current();const lesson=state.mode==='guide'?
  '<div class="tr-coach"><span class="tr-coach-tag">TRAINING COACH · STEP '+Math.min(state.step+1,E.LESSON.length)+'</span>'+
  '<h2>'+esc(exp?.title||'Training complete')+'</h2><p class="tr-coach-action">'+esc(exp?.instruction||'You finished all lessons.')+'</p><p class="tr-coach-why"><strong>WHY IT MATTERS</strong>'+esc(exp?.why||'')+'</p>'+
  (exp?.kind==='finish'?'<button type="button" class="tr-finish tr-guide-target" data-tr="finish">COMPLETE TRAINING ✓</button>':'')+
  '</div>':
  '<div class="tr-coach"><span class="tr-coach-tag">SANDBOX · FREE PLAY</span><h2>YOU CONTROL THE GAME.</h2><p class="tr-coach-action">Try any stat or substitution, track the results, and use Undo to practice corrections.</p><p class="tr-coach-why"><strong>LOCAL PRACTICE</strong>Nothing here reaches RCH official statistics.</p></div>';
 const tabs=['plays','box','lineups'].map(v=>'<button type="button" data-tr="view" data-view="'+v+'" class="'+(state.view===v?'selected ':'')+(exp?.kind==='view'&&exp.view===v?'tr-guide-target':'')+'">'+(v==='plays'?'PLAY LOG':v==='box'?'BOX SCORE':'LINEUP')+'</button>').join('');
 return '<aside class="tr-right">'+lesson+
 '<section class="tr-panel tr-review"><div class="tr-panel-heading"><div><span>03 / GAME IQ</span><h2>LIVE PRACTICE REVIEW</h2></div></div>'+
 '<nav class="tr-viewtabs">'+tabs+'</nav>'+
 '<div class="tr-review-inner">'+(state.view==='plays'?playLog():state.view==='box'?boxScore():lineupView())+'</div></section>'+
 '<div class="tr-local-notice"><strong>ISOLATED SANDBOX</strong><span>Stats, scores and progress live only in this iPad/browser. Official games are never affected.</span></div></aside>';
}
function playLog(){
 if(!state.events.length)return '<div class="tr-empty"><span>◎</span><strong>NO PLAYS YET</strong><p>Your training events appear here immediately.</p></div>';
 return '<div class="tr-event-list">'+state.events.slice().reverse().slice(0,32).map(e=>{
  return '<div class="tr-event"><span class="tr-event-dot '+(e.kind.startsWith('made')?'positive':e.kind.startsWith('miss')?'negative':'')+'"></span>'+
   '<div><strong>'+esc(E.describe(e))+'</strong><small>'+team(e.team).short+' · Q'+e.period+' · '+E.formatTime(e.seconds)+'</small></div></div>';
 }).join('')+'</div><div class="tr-mini-note">'+state.events.length+' training events locally recorded</div>';
}
function boxScore(){
 const pr=E.project(state);
 return '<div class="tr-box-scroll">'+E.TEAMS.map(t=>{
  return '<div class="tr-box-team"><h3>'+esc(t.name)+' <small>'+pr.score[t.id]+' PTS</small></h3>'+
   '<table class="tr-table"><thead><tr><th>PLAYER</th><th>PTS</th><th>REB</th><th>AST</th><th>FG</th><th>PF</th></tr></thead><tbody>'+
   t.players.map(x=>{const s=pr.stats[x.id];return '<tr><td>#'+x.n+' '+esc(x.name)+'</td><td>'+s.pts+'</td><td>'+s.reb+'</td><td>'+s.ast+'</td><td>'+s.fgm+'/'+s.fga+'</td><td>'+s.pf+'</td></tr>';}).join('')+
   '</tbody></table><div class="tr-team-accuracy">FG '+percentage(pr.teams[t.id].fgm,pr.teams[t.id].fga)+' · 3PT '+pr.teams[t.id].threem+'/'+pr.teams[t.id].threea+' · FT '+pr.teams[t.id].ftm+'/'+pr.teams[t.id].fta+'</div></div>';
 }).join('')+'</div>';
}
function lineupView(){
 const court=E.lineup(state);
 return E.TEAMS.map(t=>'<div class="tr-lineup"><h3>'+esc(t.name)+'</h3><div class="tr-lineup-players">'+
  court[t.id].map(id=>{const q=p(id);return '<span>#'+q.n+' '+esc(q.name)+'</span>'}).join('')+'</div></div>').join('')+
  '<p class="tr-mini-note">Lineups update when you confirm a practice substitution.</p>';
}
function trainingRoom(){
 return banner()+
 '<div class="tr-workspace">'+roster()+statPads()+side()+'</div>'+
 '<div class="tr-bottom-controls"><button type="button" data-tr="restart">↺ RESTART '+(state.mode==='guide'?'LESSON':'PRACTICE')+'</button><span>TRAINING MODE · NO OFFICIAL RECORDS</span></div>'+
 (state.completed?'<div class="tr-complete"><span>★ LESSON COMPLETE</span><h2>YOU KNOW THE CONTROLS.</h2><p>You practiced official-stat concepts in a protected simulation. Real game access and production readiness require separate authorization and verification.</p><button type="button" data-tr="start" data-mode="free">START FREE PRACTICE →</button></div>':'');
}
function substitution(){
 const lin=E.lineup(state)[subTeam],t=team(subTeam);
 return '<div class="tr-sub-backdrop"><section class="tr-sub-box" role="dialog" aria-modal="true" aria-labelledby="tr-sub-title">'+
 '<div class="tr-sub-top"><div><span class="tr-eyebrow">PRACTICE · LINEUP MANAGEMENT</span><h2 id="tr-sub-title">Make a substitution</h2></div><button type="button" data-tr="sub-close" aria-label="Close substitution">×</button></div>'+
 '<p>Select the player leaving the court and the bench player entering. The original player’s recorded stats stay intact.</p>'+
 '<div class="tr-sub-select"><label>TEAM<select id="tr-sub-team">'+E.TEAMS.map(x=>'<option value="'+x.id+'" '+(subTeam===x.id?'selected':'')+'>'+x.name+'</option>').join('')+'</select></label>'+
 '<label>PLAYER OUT<select id="tr-sub-out"><option value="">Choose starter…</option>'+lin.map(id=>{const q=p(id);return '<option value="'+id+'">#'+q.n+' '+esc(q.name)+'</option>'}).join('')+'</select></label>'+
 '<label>PLAYER IN<select id="tr-sub-in"><option value="">Choose bench…</option>'+t.players.filter(x=>!lin.includes(x.id)).map(x=>'<option value="'+x.id+'">#'+x.n+' '+esc(x.name)+'</option>').join('')+'</select></label></div>'+
 '<div class="tr-sub-actions"><button type="button" data-tr="sub-close">CANCEL</button><button type="button" data-tr="sub-apply">CONFIRM PRACTICE SUB →</button></div></section></div>';
}
function render(){
 if(!open||!overlay)return;
 const s=state;
 overlay.innerHTML='<div class="tr-app"><header class="tr-header">'+
  '<div class="tr-wordmark"><div class="tr-r">R</div><div><span>RICH CITY HOOPS</span><strong>SCOREBOOK <em>ACADEMY</em></strong></div></div>'+
  '<div class="tr-header-label"><i></i>TRAINING ENVIRONMENT <span>· NOT LIVE</span></div>'+
  '<div class="tr-header-actions">'+(s?'<button type="button" data-tr="home">CHANGE MODE</button>':'')+'<button type="button" data-tr="exit" class="tr-exit">EXIT TRAINING ✕</button></div>'+
  '</header><main class="tr-main">'+(s?trainingRoom():initial())+'</main>'+
  '<div class="tr-feedback '+(feedbackGood?'good':'error')+'" aria-live="polite">'+(feedback?esc(feedback):'DEMO MODE · DATA NEVER REACHES THE OFFICIAL SCOREBOOK')+'</div>'+
  (showSub&&s?substitution():'')+'</div>';
}
function openMode(mode){state=E.seed(mode);feedback='';feedbackGood=true;rosterTeam='blue';showSub=false;save();render();}
function createEntry(){
 if(!document.getElementById('rch-training-entry')){
  const button=document.createElement('button');button.id='rch-training-entry';button.type='button';button.textContent='✦ TEST / TRAINING';button.className='tr-entry';
  button.addEventListener('click',launch);
  const header=document.querySelector('.header .nav')||document.querySelector('.header');
  const auth=document.querySelector('.authbox');
  const target=header||auth;
  if(target)target.append(button);
  else document.body.append(button);
 }
 const currentButton=document.getElementById('rch-training-entry');
 const header=document.querySelector('.header .nav')||document.querySelector('.header');
 const auth=document.querySelector('.authbox');
 const desired=header||auth||document.body;
 if(currentButton?.parentElement!==desired)desired.append(currentButton);
 currentButton?.classList.toggle('tr-entry-float',desired===document.body);
}
function boot(){
 load();createEntry();
 const site=document.getElementById('app');
 if(site){
  let pending=false;
  new MutationObserver(()=>{
   if(pending)return;pending=true;
   requestAnimationFrame(()=>{pending=false;createEntry()});
  }).observe(site,{childList:true,subtree:true});
 }
 if(new URLSearchParams(location.search).get('training')==='1')launch();
}
document.addEventListener('click',event=>{
 if(!open||!overlay||!overlay.contains(event.target))return;
 const btn=event.target.closest('button[data-tr]');if(!btn)return;
 const action=btn.dataset.tr;
 if(action==='exit'){exit();return;}
 if(action==='home'){state=null;showSub=false;feedback='';render();return;}
 if(action==='start'){openMode(btn.dataset.mode);return;}
 if(action==='roster'){rosterTeam=btn.dataset.team;render();return;}
 if(action==='select'){run({type:'select',team:btn.dataset.team,player:btn.dataset.player});return;}
 if(action==='stat'){run({type:'event',kind:btn.dataset.kind});return;}
 if(action==='undo'){run({type:'undo'});return;}
 if(action==='view'){run({type:'view',view:btn.dataset.view});return;}
 if(action==='clock'){run({type:'toggleClock'});return;}
 if(action==='resetclock'){run({type:'resetClock'});return;}
 if(action==='period'){run({type:'period',value:state.period+1});return;}
 if(action==='finish'){run({type:'finish'});if(state?.completed)try{localStorage.setItem('rch-scorebook-academy-completed-v1','yes')}catch{};return;}
 if(action==='restart'){run({type:'restart'});return;}
 if(action==='sub-open'){showSub=true;subTeam=state.mode==='guide'?'blue':state.team;render();return;}
 if(action==='sub-close'){showSub=false;render();return;}
 if(action==='sub-apply'){
  run({type:'sub',team:document.getElementById('tr-sub-team')?.value,
    out:document.getElementById('tr-sub-out')?.value,incoming:document.getElementById('tr-sub-in')?.value});return;
 }
});
document.addEventListener('change',event=>{
 if(!open||!showSub||event.target?.id!=='tr-sub-team')return;
 subTeam=event.target.value;render();
});
document.addEventListener('keydown',event=>{
 if(!open)return;
 if(event.key==='Escape'){if(showSub){showSub=false;render()}else exit();}
});
tickTimer=setInterval(()=>{
 if(!open||!state?.running)return;
 const out=E.apply(state,{type:'tick'});state=out.state;
 const n=overlay?.querySelector('.tr-clockval');if(n)n.textContent=E.formatTime(state.seconds);
 if(!state.seconds){save();render();}
},1000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
