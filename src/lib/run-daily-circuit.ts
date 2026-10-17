import { gravityLocalRelevance } from './rch-gravity-location';
import { cityForText } from './virginia-world';

/**
 * RCH Runs Daily Circuit v1 — deterministic, transparent ranking.
 * Eligibility and privacy are resolved by source queries / RLS before this
 * function runs. Never use this score for competitive ratings or REP.
 */
export type RunFormat='all'|'1v1'|'2v2'|'3v3'|'4v4'|'5v5';
export type RunPlayType='all'|'competitive'|'social'|'training';
export type DailyCircuitCandidate={
 id:string;
 title:string;
 host_id:string;
 location:string;
 location_slug:string|null;
 city:string|null;
 starts_at:string;
 run_type:string;
 game_format:string;
 max_players:number;
 player_count:number;
 status:string;
 verified_host?:boolean;
 independently_verified?:boolean;
 joined?:boolean;
 partner_slug?:string|null;
};
export type DailyCircuitContext={
 now?:number;
 userId?:string|null;
 cityId?:string|null;
 radiusMiles?:25|50|100;
 preferredFormat?:RunFormat;
 preferredType?:RunPlayType;
 watchedCourts?:readonly string[];
 playedCourts?:readonly string[];
 hideIds?:readonly string[];
};
export type DailyCircuitScore={value:number;reasons:string[];isJoinable:boolean};
const DAY=86_400_000;
function inRange(n:number,min:number,max:number){return Math.max(min,Math.min(max,n));}
function hashFraction(value:string){
 let h=2166136261;
 for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0)/4294967295;
}
/** Virginia local date; the rotation does not change at midnight UTC. */
export function virginiaCircuitDay(now:number){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 const part=(type:string)=>parts.find(p=>p.type===type)?.value||'00';
 return [part('year'),part('month'),part('day')].join('-');
}
export function dailyRunEligible(run:DailyCircuitCandidate, now:number){
 return isFutureRun(run,now)&&dailyRunJoinable(run,now);
}
/** Full sessions remain in the unpersonalized list, but cannot take a Daily pick. */
export function dailyRunJoinable(run:DailyCircuitCandidate,now:number){
 const start=Date.parse(run.starts_at);
 return run.status==='open'&&Number.isFinite(start)&&start>=now&&
  run.player_count<run.max_players && run.max_players>=2;
}
function isFutureRun(run:DailyCircuitCandidate,now:number){
 const start=Date.parse(run.starts_at);
 return !!run.id&&!!run.host_id&&Number.isFinite(start)&&start>=now
  &&start<=now+45*DAY&&run.status!=='cancelled'&&run.status!=='completed';
}
function area(run:DailyCircuitCandidate){return run.city||cityForText(run.location)?.name||null;}

export function scoreDailyRun(run:DailyCircuitCandidate,ctx:DailyCircuitContext={}):DailyCircuitScore{
 const now=ctx.now??Date.now();
 if(!isFutureRun(run,now)||ctx.hideIds?.includes(run.id)){
  return {value:-1,reasons:[],isJoinable:false};
 }
 const joinable=dailyRunJoinable(run,now);
 const hours=(Date.parse(run.starts_at)-now)/3_600_000;
 const local=gravityLocalRelevance(ctx.cityId||null,area(run),ctx.radiusMiles??50);
 const preferredFormat=ctx.preferredFormat||'all';
 const preferredType=ctx.preferredType||'all';
 const matchingFormat=preferredFormat!=='all'&&run.game_format===preferredFormat;
 const matchingType=preferredType!=='all'&&run.run_type===preferredType;
 const watched=!!run.location_slug&&!!ctx.watchedCourts?.includes(run.location_slug);
 const familiar=!!run.location_slug&&!!ctx.playedCourts?.includes(run.location_slug);
 const joined=Boolean(run.joined);
 const timing=hours<=24?1:hours<=72?0.9:hours<=168?0.75:hours<=336?0.55:0.3;
 const fit=preferredFormat==='all'?0.55:matchingFormat?1:0.2;
 const style=preferredType==='all'?0.6:matchingType?1:0.2;
 // Seeded daily exploration is small: never outweighs real relevance, availability or proximity.
 const explore=hashFraction((ctx.userId||'visitor')+':'+virginiaCircuitDay(now)+':'+run.id);
 const value=
   28*local+17*fit+11*style+15*timing+
   (joinable?12:0)+(watched?8:familiar?4:0)+
   (joined?4:0)+(run.independently_verified?3:run.verified_host?1.5:0)+
   2*explore;
 const reasons:string[]=[];
 if(watched)reasons.push('At a court you watch');
 else if(ctx.cityId&&local>=0.8)reasons.push('Around your selected city');
 else if(ctx.cityId&&local>=0.5)reasons.push('In your basketball area');
 if(joined)reasons.push('You are on the roster');
 if(matchingFormat)reasons.push(run.game_format+' fits your game');
 if(matchingType)reasons.push('Matches your play style');
 if(hours<=24)reasons.push('Starts within 24 hours');
 else if(hours<=72)reasons.push('Coming up this week');
 if(run.independently_verified)reasons.push('Independently verified Run');
 else if(run.verified_host)reasons.push('RCH verified host');
 if(joinable)reasons.push('Registration open');
 else reasons.push('Full — view details');
 return {value:inRange(value,0,100),reasons:reasons.slice(0,3),isJoinable:joinable};
}
export function rankDailyRuns<T extends DailyCircuitCandidate>(items:readonly T[],ctx:DailyCircuitContext={}):T[]{
 const now=ctx.now??Date.now();
 const ranked=items.map((run,index)=>({run,index,score:scoreDailyRun(run,ctx)}))
  .filter(x=>x.score.value>=0)
  .sort((a,b)=>Number(b.score.isJoinable)-Number(a.score.isJoinable)
     ||b.score.value-a.score.value||a.index-b.index);
 // Give multiple local hosts and courts a chance near the top when available.
 const primary:typeof ranked=[];
 const remaining=[...ranked];
 const hostCounts=new Map<string,number>();
 const courtCounts=new Map<string,number>();
 while(remaining.length&&primary.length<6){
  let index=remaining.findIndex(({run})=>
   (hostCounts.get(run.host_id)||0)<2&&
   (!run.location_slug||(courtCounts.get(run.location_slug)||0)<2));
  if(index<0)index=0;
  const [next]=remaining.splice(index,1);
  primary.push(next);
  hostCounts.set(next.run.host_id,(hostCounts.get(next.run.host_id)||0)+1);
  if(next.run.location_slug)courtCounts.set(next.run.location_slug,(courtCounts.get(next.run.location_slug)||0)+1);
 }
 return [...primary,...remaining].map(x=>x.run);
}
export function buildDailyCircuitPicks<T extends DailyCircuitCandidate>(
 runs:readonly T[],ctx:DailyCircuitContext={}
):{next:T|null;explore:T|null;week:T|null}{
 const now=ctx.now??Date.now();
 const ranked=rankDailyRuns(runs,ctx).filter(r=>dailyRunJoinable(r,now));
 const next=ranked[0]||null;
 const others=ranked.filter(r=>r.id!==next?.id);
 // Exploration deliberately chooses an unfamiliar host or court when possible.
 const explore=others.find(r=>r.host_id!==next?.host_id&&r.location_slug!==next?.location_slug)||
  others.find(r=>r.host_id!==next?.host_id)||others[0]||null;
 const week=others.find(r=>r.id!==explore?.id&&Date.parse(r.starts_at)<=now+7*DAY)||
  others.find(r=>r.id!==explore?.id)||null;
 return {next,explore,week};
}
