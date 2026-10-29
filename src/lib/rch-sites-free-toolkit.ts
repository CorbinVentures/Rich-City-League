/** Pure basketball operations contracts shared by Free toolkit server and client.
 * Never confer membership, subscription or publishing rights from these functions.
 */
export type ToolkitPlayer={id:string;name:string;number:string};
export type ToolkitTeam={id:string;name:string;players:ToolkitPlayer[]};
export type ToolkitGame={id:string;homeId:string;awayId:string;date:string;time:string;court:string};
export type ToolkitForm={title:string;open:boolean};
export type ToolkitBudget={gymHours:number;gymRateCents:number;games:number;refsPerGame:number;
  refereeFeeCents:number;uniforms:number;uniformCostCents:number;otherCents:number;
  teams:number;entryFeeCents:number};
export const EMPTY_BUDGET:ToolkitBudget={gymHours:0,gymRateCents:0,games:0,refsPerGame:2,
  refereeFeeCents:0,uniforms:0,uniformCostCents:0,otherCents:0,teams:0,entryFeeCents:0};
export const TOOLKIT_FREE_LIMITS={teamNames:8,managedRosters:1,players:20,
  scheduleGames:60,registrationsMonthly:100} as const;
const idPattern=/^[a-zA-Z0-9_-]{1,64}$/;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function cleanLabel(value:unknown,max=90):string{
  return typeof value==='string'?value.replace(/[<>\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
}
function obj(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid object');
  return value as Record<string,unknown>;
}
function safeId(value:unknown):value is string{return typeof value==='string'&&idPattern.test(value);}
export function parseToolkitTeams(value:unknown,limit=TOOLKIT_FREE_LIMITS.teamNames,
  maxManaged=TOOLKIT_FREE_LIMITS.managedRosters,maxPlayers=TOOLKIT_FREE_LIMITS.players):ToolkitTeam[]{
  if(!Array.isArray(value)||value.length>limit)throw Error('Team limit exceeded');
  const seen=new Set<string>(),names=new Set<string>(),players=new Set<string>();
  let managed=0,total=0;
  return value.map(item=>{
    const r=obj(item),name=cleanLabel(r.name);
    if(!safeId(r.id)||seen.has(r.id)||name.length<2||name.length>60||names.has(name.toLowerCase()))
      throw Error('Team names and IDs must be unique');
    seen.add(r.id);names.add(name.toLowerCase());
    if(!Array.isArray(r.players)||r.players.length>maxPlayers)throw Error('Invalid roster');
    if(r.players.length)managed++;
    total+=r.players.length;
    const parsed=r.players.map(person=>{
      const p=obj(person),playerName=cleanLabel(p.name);
      const number=typeof p.number==='string'?p.number.trim():'';
      if(!safeId(p.id)||players.has(p.id)||playerName.length<2||playerName.length>70||!/^(?:\d{0,2})$/.test(number))
        throw Error('Invalid player');
      players.add(p.id);
      return {id:p.id,name:playerName,number};
    });
    return {id:r.id,name,players:parsed};
  }).map(t=>{if(managed>maxManaged||total>maxPlayers)throw Error('Roster allowance exceeded');return t;});
}
export function validDate(value:string):boolean{
  if(!datePattern.test(value))return false;
  const time=Date.parse(value+'T12:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
}
export function parseToolkitGames(value:unknown,teams:readonly ToolkitTeam[],
  maxGames=TOOLKIT_FREE_LIMITS.scheduleGames):ToolkitGame[]{
  if(!Array.isArray(value)||value.length>maxGames)throw Error('Schedule limit exceeded');
  const teamIds=new Set(teams.map(t=>t.id)),gameIds=new Set<string>();
  const games=value.map(item=>{
    const g=obj(item);
    if(!safeId(g.id)||gameIds.has(g.id)||!teamIds.has(String(g.homeId))||
      !teamIds.has(String(g.awayId))||g.homeId===g.awayId||
      typeof g.date!=='string'||!validDate(g.date)||
      typeof g.time!=='string'||!timePattern.test(g.time)||
      typeof g.court!=='string'||!cleanLabel(g.court,60))
      throw Error('Invalid scheduled game');
    gameIds.add(g.id);
    return {id:g.id,homeId:g.homeId as string,awayId:g.awayId as string,
      date:g.date,time:g.time,court:cleanLabel(g.court,60)};
  });
  const occupied=new Map<string,Array<{start:number;end:number}>>(),pairings=new Set<string>();
  for(const g of games){
    // Free Schedule Studio has fixed 60-minute games. Compare full intervals,
    // not just identical start times, when an organizer manually edits a game.
    const start=Number(g.time.slice(0,2))*60+Number(g.time.slice(3));
    const end=start+60;
    if(end>1440)throw Error('Games cannot extend past midnight');
    for(const resource of ['court:'+g.court.toLowerCase(),'team:'+g.homeId,'team:'+g.awayId]){
      const key=g.date+'|'+resource,slots=occupied.get(key)??[];
      if(slots.some(s=>start<s.end&&s.start<end))
        throw Error('Two games overlap on one court or team');
      slots.push({start,end});occupied.set(key,slots);
    }
    const pair=[g.homeId,g.awayId].sort().join('|');
    // Multiple round-robin seasons are separate schedules; Free permits one.
    if(pairings.has(pair))throw Error('Duplicate opponent pairing');
    pairings.add(pair);
  }
  return games;
}
export function generateRoundRobin(input:{teams:readonly ToolkitTeam[];startDate:string;
  weekdays:readonly number[];tipoff:string;gamesPerDay:number;slotMinutes:number;court:string}):ToolkitGame[]{
  const {teams,startDate,weekdays,tipoff,gamesPerDay,slotMinutes}=input;
  if(teams.length<2||teams.length>8||!validDate(startDate)||!timePattern.test(tipoff)||
    !Number.isInteger(gamesPerDay)||gamesPerDay<1||gamesPerDay>4||
    !Number.isInteger(slotMinutes)||slotMinutes<30||slotMinutes>180||
    weekdays.length===0||weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||
    !cleanLabel(input.court,60))throw Error('Check team names, dates, times and schedule settings');
  const working:(string|null)[]=teams.map(t=>t.id);
  if(working.length%2)working.push(null);
  const rounds=working.length-1;
  const pairs:Array<[string,string]>[]=[];
  for(let round=0;round<rounds;round++){
    const matching:Array<[string,string]>=[];
    for(let index=0;index<working.length/2;index++){
      const left=working[index],right=working[working.length-1-index];
      if(left&&right)matching.push(round%2?[right,left]:[left,right]);
    }
    pairs.push(matching);
    working.splice(1,0,working.pop()!);
  }
  const games:ToolkitGame[]=[];
  let day=new Date(startDate+'T12:00:00Z');
  const at=(d:Date)=>d.toISOString().slice(0,10);
  const allowed=new Set(weekdays);
  const clock=Number(tipoff.slice(0,2))*60+Number(tipoff.slice(3));
  for(let round=0;round<pairs.length;round++){
    const matches=pairs[round];
    for(let i=0;i<matches.length;i+=gamesPerDay){
      let safety=0;
      while(!allowed.has(day.getUTCDay())){
        day.setUTCDate(day.getUTCDate()+1);
        if(++safety>8)throw Error('No schedule dates available');
      }
      const count=Math.min(gamesPerDay,matches.length-i);
      if(clock+(count-1)*slotMinutes>1439)throw Error('Not enough time remaining on game day');
      for(let j=0;j<count;j++){
        const minute=clock+j*slotMinutes;
        const [homeId,awayId]=matches[i+j];
        games.push({id:'r'+round+'g'+(i+j),homeId,awayId,date:at(day),
          time:String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),
          court:cleanLabel(input.court,60)});
      }
      day.setUTCDate(day.getUTCDate()+1);
    }
  }
  return parseToolkitGames(games,[...teams]);
}
const budgetKeys=['gymHours','gymRateCents','games','refsPerGame','refereeFeeCents',
  'uniforms','uniformCostCents','otherCents','teams','entryFeeCents'] as const;
export function parseToolkitBudget(value:unknown):ToolkitBudget{
  const raw=obj(value),budget={...EMPTY_BUDGET};
  for(const key of budgetKeys){
    const v=raw[key];
    if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>10000000)
      throw Error('Budget inputs must be nonnegative whole numbers');
    budget[key]=v;
  }
  return budget;
}
export function calculateToolkitBudget(b:ToolkitBudget){
  const gym=b.gymHours*b.gymRateCents;
  const refs=b.games*b.refsPerGame*b.refereeFeeCents;
  const uniforms=b.uniforms*b.uniformCostCents;
  const cost=gym+refs+uniforms+b.otherCents;
  const revenue=b.teams*b.entryFeeCents;
  if(!Number.isSafeInteger(cost)||!Number.isSafeInteger(revenue))throw Error('Budget exceeds supported range');
  return {gym,refs,uniforms,cost,revenue,profit:revenue-cost,
    breakEvenTeams:b.entryFeeCents>0?Math.ceil(cost/b.entryFeeCents):null};
}
export function parseToolkitForm(value:unknown):ToolkitForm{
  const data=obj(value),title=cleanLabel(data.title,80);
  if(title.length<3||typeof data.open!=='boolean')throw Error('Invalid registration form');
  return {title,open:data.open};
}
export function buildGameDayPack(teams:ToolkitTeam[],games:ToolkitGame[],date:string){
  if(!validDate(date))throw Error('Select a valid game date');
  const names=new Map(teams.map(t=>[t.id,t.name]));
  return games.filter(g=>g.date===date).sort((a,b)=>a.time.localeCompare(b.time))
    .map(game=>({time:game.time,court:game.court,home:names.get(game.homeId)||'Unknown',
      away:names.get(game.awayId)||'Unknown',homePlayers:teams.find(t=>t.id===game.homeId)?.players??[],
      awayPlayers:teams.find(t=>t.id===game.awayId)?.players??[]}));
}
