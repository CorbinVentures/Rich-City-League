/* RCH Scorebook · iPad Game Desk
   Progressive tablet-only presentation. Reuses each original scoring button and
   its official Supabase event RPC. No synthetic score writes or unverified totals.
*/
(function(){
'use strict';
if(typeof window==='undefined'||typeof document==='undefined')return;
const mq=window.matchMedia('(min-width:740px) and (pointer:coarse)');
const userIsIPad=()=>/iPad/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const tablet=()=>mq.matches||(userIsIPad()&&innerWidth>=740);
let observer=null,scheduled=false,playerScroll=0,hasVisitedGame=false;
const root=document.getElementById('app');if(!root)return;
function newTag(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e;}
function savePlayerScroll(e){if(e.target instanceof Element&&e.target.matches('.rch-ipad-desk .playergrid'))playerScroll=e.target.scrollTop;}
document.addEventListener('scroll',savePlayerScroll,true);
function setupHomeSearch(){
 const search=document.getElementById('search');if(!search||search.dataset.rchFilterAttached)return;
 search.dataset.rchFilterAttached='yes';
 const match=()=>{
   const q=search.value.trim().toLowerCase();
   const cards=[...document.querySelectorAll('.gamegrid .game')];
   let count=0;
   cards.forEach(card=>{const show=card.textContent.toLowerCase().includes(q);card.hidden=!show;card.style.display=show?'':'none';if(show)count++});
   let summary=document.querySelector('.rch-ipad-search-count');
   if(!summary){summary=newTag('div','rch-ipad-search-count');search.after(summary);}
   summary.textContent=(q?count+' matching games currently loaded':'Showing '+count+' games')+' · Tap a matchup to score';
 };
 search.addEventListener('input',match);
 match();
}
function mount(){
 if(!tablet()){document.body.classList.remove('rch-score-tablet');return;}
 document.body.classList.add('rch-score-tablet');
 setupHomeSearch();
 const wrap=root.querySelector('.wrap');if(!wrap)return;
 let desk=wrap.querySelector('#rch-ipad-score-desk');
 if(!desk){
  const pair=wrap.querySelector(':scope > .twocol');
  const bar=wrap.querySelector(':scope > .scorebar');
  const tabs=wrap.querySelector(':scope > .tabs');
  const panel=tabs?.nextElementSibling;
  if(!pair||!bar||!tabs||!panel||!panel.classList.contains('panel'))return;
  desk=newTag('div','rch-ipad-desk');desk.id='rch-ipad-score-desk';
  const live=newTag('section','rch-ipad-live');
  live.setAttribute('aria-label','Play review and game tools');
  pair.before(desk);
  desk.append(pair,live);
  live.append(tabs,panel);
  const panels=pair.querySelectorAll(':scope > .panel');
  if(panels.length===2){
    const roster=panels[0],actions=panels[1];
    const header=newTag('div','rch-tablet-context');
    header.id='rch-tablet-selection';
    const team=roster.querySelector('.chips .chip.active')?.textContent?.trim()||'Team';
    const player=roster.querySelector('.player.sel b')?.textContent?.trim();
    const number=roster.querySelector('.player.sel .id')?.textContent?.trim()?.split('·')[0]||'';
    const label=newTag('div','label');label.textContent='ACTIVE SCORER · '+team;
    const selection=newTag('strong','selection');selection.textContent=player?(number+' '+player).trim():'Tap a player to begin';
    const hint=newTag('div','hint');hint.textContent=player?'Tap a stat below. Player stays selected for consecutive plays.':'Select a jersey on the left, then tap the play you need.';
    const controls=newTag('div','rch-ipad-controls');
    const undo=document.createElement('button');undo.type='button';undo.dataset.act='undo';undo.textContent='↶ Undo last play';
    const realUndo=actions.querySelector('button[data-act="undo"]');undo.disabled=!realUndo||realUndo.disabled;
    const shot=document.createElement('button');shot.type='button';shot.dataset.act='tab';shot.dataset.arg='shots';shot.textContent='◎ Shot location';
    const play=document.createElement('button');play.type='button';play.dataset.act='tab';play.dataset.arg='plays';play.textContent='≡ Play log';
    controls.append(undo,shot,play);header.append(label,selection,hint,controls);
    const actionHeading=actions.querySelector(':scope > .row');
    if(actionHeading)actionHeading.after(header);else actions.prepend(header);
    const players=roster.querySelector('.playergrid');if(players){
      const playerRows=[...players.querySelectorAll('.player')];
      // Starting five above the rest; visual sort only, official rosters unchanged.
      playerRows.sort((a,b)=>Number(b.textContent.includes('ON COURT'))-Number(a.textContent.includes('ON COURT')));
      players.replaceChildren(...playerRows);
      players.scrollTop=playerScroll;
    }
    if(!hasVisitedGame){
      hasVisitedGame=true;
      // First tablet session defaults to full stats: missed shots, turnovers
      // and defensive plays stay visible instead of hiding in Quick mode.
      if(localStorage.getItem('rch-scorebook-ipad-fullstats-init')!=='yes'){
        localStorage.setItem('rch-scorebook-ipad-fullstats-init','yes');
        const pro=actions.querySelector('button[data-act="mode"][data-arg="pro"]');
        if(pro&&!pro.classList.contains('active')){
          pro.click();
          return;
        }
      }
    }
  }
 }
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;try{mount()}catch(e){console.warn('RCH iPad desk fallback to standard layout',e)}});}
observer=new MutationObserver(schedule);
observer.observe(root,{subtree:true,childList:true});
window.addEventListener('resize',schedule);
window.addEventListener('orientationchange',schedule);
schedule();
})();
