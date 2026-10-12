/* RCH SCOREBOOK TRAINING ENGINE — LOCAL ONLY, NO NETWORK OR DATABASE WRITES */
(function(root){
'use strict';
const TEAMS=[
 {id:'blue',name:'Northside Aces',short:'ACES',side:'HOME',players:[
  {id:'b1',n:3,name:'J. Carter'},{id:'b2',n:11,name:'M. Reed'},
  {id:'b3',n:8,name:'K. Brooks'},{id:'b4',n:24,name:'D. Ellis'},
  {id:'b5',n:5,name:'T. Hayes'},{id:'b6',n:21,name:'A. Walker'},
  {id:'b7',n:14,name:'C. Price'},{id:'b8',n:33,name:'R. Young'}]},
 {id:'gold',name:'Capital Comets',short:'COMETS',side:'AWAY',players:[
  {id:'g1',n:5,name:'S. Lane'},{id:'g2',n:9,name:'A. Cole'},
  {id:'g3',n:12,name:'M. Ford'},{id:'g4',n:22,name:'P. Rivers'},
  {id:'g5',n:31,name:'E. Blake'},{id:'g6',n:7,name:'N. James'},
  {id:'g7',n:15,name:'K. Hart'},{id:'g8',n:0,name:'D. Ross'}]}
];
const ACTIONS=[
 {kind:'made2',label:'+2 Make',group:'SCORING'},{kind:'made3',label:'+3 Make',group:'SCORING'},
 {kind:'madeFT',label:'+1 FT',group:'SCORING'},
 {kind:'miss2',label:'2PT Miss',group:'MISSED SHOTS'},{kind:'miss3',label:'3PT Miss',group:'MISSED SHOTS'},
 {kind:'missFT',label:'FT Miss',group:'MISSED SHOTS'},
 {kind:'oreb',label:'OFF REB',group:'REBOUNDS'},{kind:'dreb',label:'DEF REB',group:'REBOUNDS'},
 {kind:'assist',label:'Assist',group:'PLAYMAKING'},{kind:'steal',label:'Steal',group:'PLAYMAKING'},
 {kind:'block',label:'Block',group:'PLAYMAKING'},{kind:'turnover',label:'Turnover',group:'PLAYMAKING'},
 {kind:'foul',label:'Personal Foul',group:'DISCIPLINE'}
];
const LESSON=[
 {kind:'select',team:'blue',player:'b1',title:'Select your scorer',instruction:'Tap #3 J. Carter on the Aces roster.',why:'The selected jersey receives the next recorded statistic.'},
 {kind:'event',event:'made2',player:'b1',title:'Record a made 2PT shot',instruction:'Tap +2 Make for J. Carter.',why:'A made basket adds 2 points and increments FGM / FGA.'},
 {kind:'select',team:'blue',player:'b2',title:'Choose the teammate who passed',instruction:'Select #11 M. Reed on the Aces roster.',why:'Assists are assigned to the passer, never the shooter.'},
 {kind:'event',event:'assist',player:'b2',title:'Credit the assist',instruction:'Tap Assist for M. Reed.',why:'In this sandbox, an assist links to the previous made field goal by a teammate.'},
 {kind:'select',team:'blue',player:'b1',title:'Return to your scorer',instruction:'Tap #3 J. Carter again.',why:'Stats always belong to the currently selected player.'},
 {kind:'event',event:'miss3',player:'b1',title:'Record a missed 3PT attempt',instruction:'Tap 3PT Miss.',why:'Missing a shot adds one attempt but never increases the score.'},
 {kind:'event',event:'oreb',player:'b1',title:'Track the offensive rebound',instruction:'Tap OFF REB for J. Carter.',why:'An offensive rebound is distinct from a defensive rebound.'},
 {kind:'select',team:'gold',player:'g1',title:'Switch to the opponent',instruction:'Choose the Comets roster and tap #5 S. Lane.',why:'The roster switch changes which team receives the player stat.'},
 {kind:'event',event:'foul',player:'g1',title:'Record a personal foul',instruction:'Tap Personal Foul.',why:'Fouls belong to the offending player, not the other team.'},
 {kind:'undo',title:'Correct the last event',instruction:'Tap Undo Last Play.',why:'Undo reverses the last event and restores all computed statistics.'},
 {kind:'sub',team:'blue',out:'b1',incoming:'b6',title:'Practice a substitution',instruction:'Open SUB, choose Aces, replace #3 J. Carter with #21 A. Walker, then confirm.',why:'The lineup changes; points and earlier statistics stay with the original player.'},
 {kind:'view',view:'box',title:'Verify the box score',instruction:'Open the BOX SCORE panel on the right.',why:'Check individual and team totals against the actions you entered.'},
 {kind:'finish',title:'Finish the certification drill',instruction:'Tap Complete Training to finish this guided walkthrough.',why:'All records here are fictional, saved on this device only.'}
];
function seed(mode){
 return {version:1,mode:mode==='free'?'free':'guide',step:0,team:'blue',player:null,period:1,seconds:600,running:false,
  lineups:{blue:['b1','b2','b3','b4','b5'],gold:['g1','g2','g3','g4','g5']},
  events:[],nextId:1,view:'plays',completed:false,startedAt:Date.now(),feedback:''};
}
function clone(s){return JSON.parse(JSON.stringify(s));}
function player(playerId){
 for(const t of TEAMS){const p=t.players.find(x=>x.id===playerId);if(p)return {...p,team:t.id,teamName:t.name};}
 return null;
}
function lineup(s){
 const x={blue:['b1','b2','b3','b4','b5'],gold:['g1','g2','g3','g4','g5']};
 for(const e of s.events){
  if(e.kind!=='sub')continue;
  const i=x[e.team].indexOf(e.out);
  if(i>=0&&!x[e.team].includes(e.incoming))x[e.team][i]=e.incoming;
 }
 return x;
}
function counts(){
 return {pts:0,fgm:0,fga:0,threem:0,threea:0,ftm:0,fta:0,oreb:0,dreb:0,reb:0,ast:0,stl:0,blk:0,to:0,pf:0};
}
function project(s){
 const stats={}; const teamStats={blue:counts(),gold:counts()};const score={blue:0,gold:0};
 for(const t of TEAMS)for(const p of t.players)stats[p.id]=counts();
 for(const e of s.events){
  if(e.kind==='sub')continue;
  const p=stats[e.player],team=teamStats[e.team];if(!p||!team)continue;
  const update=(key,num=1)=>{p[key]+=num;team[key]+=num;};
  switch(e.kind){
   case 'made2':update('pts',2);update('fgm');update('fga');score[e.team]+=2;break;
   case 'made3':update('pts',3);update('fgm');update('fga');update('threem');update('threea');score[e.team]+=3;break;
   case 'madeFT':update('pts');update('ftm');update('fta');score[e.team]+=1;break;
   case 'miss2':update('fga');break;
   case 'miss3':update('fga');update('threea');break;
   case 'missFT':update('fta');break;
   case 'oreb':update('oreb');update('reb');break;
   case 'dreb':update('dreb');update('reb');break;
   case 'assist':update('ast');break;
   case 'steal':update('stl');break;
   case 'block':update('blk');break;
   case 'turnover':update('to');break;
   case 'foul':update('pf');break;
  }
 }
 return {score,stats,teams:teamStats};
}
function formatTime(n){let s=Math.max(0,Math.floor(Number(n)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function describe(e){
 if(e.kind==='sub')return (player(e.incoming)?.name||'Player')+' IN · '+(player(e.out)?.name||'Player')+' OUT';
 return (player(e.player)?.name||'Player')+' · '+(ACTIONS.find(x=>x.kind===e.kind)?.label||e.kind);
}
function result(s,ok,message,stepComplete=false){return {state:s,ok,message,stepComplete};}
function apply(input,cmd){
 let s=clone(input), type=cmd?.type;
 if(type==='restart')return result(seed(s.mode),true,'Training restarted.');
 if(type==='mode')return result(seed(cmd.mode),true,cmd.mode==='free'?'Free practice started.':'Guided lesson started.');
 if(type==='tick'){
  if(s.running&&!s.completed&&s.seconds>0){s.seconds=Math.max(0,s.seconds-1);if(!s.seconds)s.running=false;}
  return result(s,true,'');
 }
 if(type==='toggleClock'){s.running=!s.running&&s.seconds>0;return result(s,true,s.running?'Practice clock started.':'Practice clock paused.');}
 if(type==='period'){if(s.mode==='guide')return result(input,false,'Finish the guided lesson before changing periods.');s.period=Math.max(1,Math.min(8,Number(cmd.value)||1));return result(s,true,'Practice period set.');}
 if(type==='resetClock'){s.seconds=600;s.running=false;return result(s,true,'Practice clock reset to 10:00.');}
 if(s.completed)return result(input,false,'Guided lesson completed. Start free practice or restart.');
 const expect=s.mode==='guide'?LESSON[s.step]:null;
 if(expect && type!==expect.kind)return result(input,false,'Next: '+expect.instruction);
 if(type==='select'){
  const p=player(cmd.player);if(!p||p.team!==cmd.team)return result(input,false,'Choose a player from the selected team.');
  if(expect&&(p.id!==expect.player||p.team!==expect.team))return result(input,false,'Next: '+expect.instruction);
  s.team=p.team;s.player=p.id;
 }else if(type==='event'){
  const a=ACTIONS.find(x=>x.kind===cmd.kind);const p=player(s.player);
  if(!a||!p)return result(input,false,'Select a player first.');
  if(expect&&(cmd.kind!==expect.event||p.id!==expect.player))return result(input,false,'Next: '+expect.instruction);
  if(['made2','made3','madeFT','miss2','miss3','missFT','oreb','dreb','assist','steal','block'].includes(cmd.kind)&&!lineup(s)[p.team].includes(p.id)){
   return result(input,false,'Choose an on-court player to record this action.');
  }
  let forEventId=null;
  if(cmd.kind==='assist'){
   const made=s.events.slice().reverse().find(x=>(x.kind==='made2'||x.kind==='made3')&&x.team===p.team&&x.player!==p.id);
   if(!made)return result(input,false,'An assist requires a teammate’s made field goal.');
   if(s.events.some(x=>x.kind==='assist'&&x.forEventId===made.id))return result(input,false,'That basket already has an assist.');
   forEventId=made.id;
  }
  s.events.push({id:s.nextId++,kind:cmd.kind,team:p.team,player:p.id,period:s.period,seconds:s.seconds,forEventId});
 }else if(type==='undo'){
  if(!s.events.length)return result(input,false,'There are no plays to undo.');
  const last=s.events[s.events.length-1];
  if(expect&&last.kind!=='foul')return result(input,false,'Next: '+expect.instruction);
  s.events.pop();
 }else if(type==='sub'){
  const incoming=player(cmd.incoming),out=player(cmd.out);
  if(!incoming||!out||incoming.team!==cmd.team||out.team!==cmd.team)return result(input,false,'Select two players on the same team.');
  const court=lineup(s)[cmd.team];
  if(!court.includes(cmd.out)||court.includes(cmd.incoming))return result(input,false,'Choose an on-court player out and a bench player in.');
  if(expect&&(cmd.team!==expect.team||cmd.out!==expect.out||cmd.incoming!==expect.incoming))return result(input,false,'Next: '+expect.instruction);
  s.events.push({id:s.nextId++,kind:'sub',team:cmd.team,incoming:cmd.incoming,out:cmd.out,period:s.period,seconds:s.seconds});
 }else if(type==='view'){
  if(!['plays','box','lineups'].includes(cmd.view))return result(input,false,'Unknown panel.');
  if(expect&&cmd.view!==expect.view)return result(input,false,'Next: '+expect.instruction);
  s.view=cmd.view;
 }else if(type==='finish'){
  if(!expect||expect.kind!=='finish')return result(input,false,'Finish the remaining training steps first.');
  s.completed=true;s.running=false;
 }else return result(input,false,'Unknown action.');
 if(expect && type===expect.kind)s.step=Math.min(LESSON.length,s.step+1);
 return result(s,true,s.completed?'Training completed! Official records remain untouched.':'Great—practice action recorded locally.',!!expect);
}
root.RCHTrainingEngine=Object.freeze({TEAMS,ACTIONS,LESSON,seed,player,lineup,project,apply,formatTime,describe});
})(typeof window==='undefined'?globalThis:window);
