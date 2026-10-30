/** Only real roster registrations are counted. Neither registration nor a full
 * roster proves physical attendance, venue permission, or verified results. */
export type GameplayRun = {
  id:string;title:string;location:string;starts_at:string;
  game_format:string;run_type:string;skill_level:string;
  max_players:number;status:string;players?:readonly string[]|null;
  isSuggestedCourt?:boolean;
};
export type LobbySnapshot = {
  state:'suggestion'|'unavailable'|'configuration'|'unsupported'|'forming'|'target';
  target:number|null; registered:number; capacity:number; missing:number;
  percentage:number; title:string; guidance:string;
};
export function playerTarget(format:string):number|null{
  const match=/^([1-5])v\1$/i.exec(format.trim());
  return match?2*Number(match[1]):null;
}
export function isRookieFriendly(run:Pick<GameplayRun,'skill_level'|'run_type'>):boolean{
  return run.run_type==='social'||['all','beginner','intermediate'].includes(run.skill_level);
}
export function lobbySnapshot(input:{
  format:string;registered:number;capacity:number;status:string;
  suggested:boolean;past:boolean;
}):LobbySnapshot{
  const capacity=Math.max(0,Math.floor(Number.isFinite(input.capacity)?input.capacity:0));
  const registered=Math.max(0,Math.floor(Number.isFinite(input.registered)?input.registered:0));
  const target=playerTarget(input.format);
  const missing=target===null?0:Math.max(0,target-registered);
  const percentage=target===null?0:Math.round(Math.min(100,registered/target*100));
  const base={target,registered,capacity,missing,percentage};
  if(input.suggested)return {...base,state:'suggestion',title:'Open-court idea, not a game',guidance:'Interest is not a confirmed roster, host or reserved court. Coordinate before traveling.'};
  if(input.past||!['open','full'].includes(input.status))return {...base,state:'unavailable',title:'Registration is not active',guidance:'This event is past, closed or unavailable. Check for another hosted Run.'};
  if(target===null)return {...base,state:'unsupported',title:'Confirm the game format',guidance:'The host should confirm team sizes and the minimum player count before play.'};
  if(capacity<target)return {...base,state:'configuration',title:'Roster capacity needs correction',guidance:`A ${input.format} game needs at least ${target} registered players; this listing allows ${capacity}.`};
  if(registered<target)return {...base,state:'forming',title:`${missing} more ${missing===1?'player':'players'} to roster target`,guidance:'Registered interest only. The host still must confirm players, venue and actual attendance.'};
  return {...base,state:'target',title:'Roster target reached',guidance:'Registrations meet the format minimum—not a confirmed game. Venue, attendance and independent scoring still require checks.'};
}
export function findPlayableRuns<T extends GameplayRun>(runs:readonly T[],now:number=Date.now()):T[]{
  return runs.filter(run=>!run.isSuggestedCourt&&run.status==='open'
    &&Number.isFinite(Date.parse(run.starts_at))&&Date.parse(run.starts_at)>now
    &&(run.players?.length??0)<run.max_players)
   .sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
}
