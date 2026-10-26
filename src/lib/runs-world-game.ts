import {cityForText, virginiaCoordinates} from './virginia-world';
import type {AtlasPlace} from '@/components/discover/VirginiaInteractiveAtlas';

/** Only sourced venue coordinates earn an exact court pin; city coordinates never
 * masquerade as a court's GPS position. */
export type WorldCourt={
 slug:string;name:string;address:string;locality:string;latitude:number|null;
 longitude:number|null;verification_status:string;access_type:string;venue_type:string;
 source_url:string|null;source_label?:string|null;hours_text:string|null;notes?:string|null;
};
export type WorldRun={
 id:string;title:string;location:string;location_slug:string|null;starts_at:string;
 status:string;game_format:string;run_type:string;
};
export type WorldMapState={ownedCourts?:readonly string[];challengedCourts?:readonly string[];doubleRepRuns?:readonly string[]};
export type WorldMission={
 id:'scout'|'join'|'compete';title:string;detail:string;complete:boolean;href:string;
};
/** Official municipal/county Parks & Recreation basketball site, including
 * indoor basketball gyms and combined recreational centers. A verified
 * facility is NOT confirmation of walk-in access or an active open run. */
export function verifiedParksRecFacility(court:Pick<WorldCourt,'verification_status'|'source_label'|'source_url'|'venue_type'>
 & Partial<Pick<WorldCourt,'name'|'notes'>>):boolean{
 // The Newport News municipal asset inventory includes school-code ES- records.
 // An inventory row isn't proof of a public Parks & Recreation access agreement.
 // One location is explicitly documented as a hoop beside parking, no court.
 if(court.source_label==='City of Newport News Parks GIS'&&
   (/^ES[-_]/i.test(court.name||'')||/\bno court\b|hoop structure only/i.test(court.notes||'')))
   return false;
 return ['official','provider'].includes(court.verification_status)
   && /\b(?:parks?|recreation|prcf|municipal)\b/i.test(court.source_label||'')
   && Boolean(court.source_url?.startsWith('https://'))
   && ['outdoor','indoor','mixed'].includes(court.venue_type);
}

/** Open-air public court candidate, not a real-time availability statement. */
export function playableCourt(court:WorldCourt):boolean{
 return verifiedParksRecFacility(court)
   &&court.access_type==='public'&&court.venue_type==='outdoor';
}
export function buildCourtMapPins(courts:readonly WorldCourt[],runs:readonly WorldRun[],state:WorldMapState={}):AtlasPlace[]{
 const activeRuns=runs.filter(run=>(run.status==='open'||run.status==='full')&&Date.parse(run.starts_at)>Date.now());
 const active=new Set(activeRuns.map(run=>run.location_slug));
 const owned=new Set(state.ownedCourts||[]);
 const challenged=new Set(state.challengedCourts||[]);
 const bonus=new Set(activeRuns.filter(run=>(state.doubleRepRuns||[]).includes(run.id)).map(run=>run.location_slug));
 return courts.filter(court=>playableCourt(court)&&virginiaCoordinates(court.latitude,court.longitude))
   .map(court=>{
    const gameState=challenged.has(court.slug)?'battle' as const:owned.has(court.slug)?'crown' as const:bonus.has(court.slug)?'double-rep' as const:null;
    return {
     id:'court:'+court.slug,title:court.name,city:court.locality,
     kind:active.has(court.slug)?'run' as const:'court' as const,
     lat:court.latitude as number,lon:court.longitude as number,
     href:'/runs/courts/'+encodeURIComponent(court.slug),
     precision:'venue' as const,
     ...(gameState?{gameState}:{})
    };
   });
}
export function getWorldMissions(input:{
 city:string|null;scouted:boolean;upcomingJoined:number;recentVerified:number;
}):WorldMission[]{
 const cityName=input.city||'a Virginia city';
 return [
  {id:'scout',title:'Scout your next court',detail:'Explore a real court arena in '+cityName+'.',complete:input.scouted,href:'/runs/world#court-mission'},
  {id:'join',title:'Get in the game',detail:'Register for an upcoming Run. No attendance or REP is assumed.',complete:input.upcomingJoined>0,href:'/runs?view=list#rch-upcoming-runs'},
  {id:'compete',title:'Prove it on the hardwood',detail:'Record a confirmed competitive result in the last 7 days.',complete:input.recentVerified>0,href:'/runs?view=list#rch-competition'}
 ];
}
/** Only one player's already verified result count can complete a competition mission. */
export function recentVerifiedResults(results:readonly {verified_at:string}[],now=Date.now()):number{
 const ago=now-7*86400000;
 return results.filter(result=>{
  const time=Date.parse(result.verified_at);
  return Number.isFinite(time)&&time>=ago&&time<=now;
 }).length;
}
export function localRunsForCity(runs:readonly WorldRun[],city:string):WorldRun[]{
 return runs.filter(run=>run.status!=='cancelled'
   &&Date.parse(run.starts_at)>Date.now()
   &&cityForText(run.location)?.name.toLowerCase()===city.toLowerCase())
  .sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
}
/** This visual world is a discovery layer: real awards and rankings remain on
 * existing verified server-controlled APIs, never generated client-side. */

/** Fetch a complete bounded near-term Run index without silently truncating the
 * first 100 listings. Both the World city panel and classic listing reuse it. */
export async function readPagedUpcomingRuns<T>(
 page:(from:number,to:number)=>Promise<{data:T[]|null;error:{message:string}|null}>,
 size=200,maximum=2000
):Promise<{data:T[];error:{message:string}|null;truncated:boolean}>{
 const all:T[]=[];
 for(let from=0;from<maximum;from+=size){
  const result=await page(from,Math.min(maximum-1,from+size-1));
  if(result.error)return {data:[],error:result.error,truncated:false};
  const rows=result.data||[];
  all.push(...rows);
  if(rows.length<size)return {data:all,error:null,truncated:false};
 }
 return {data:all,error:null,truncated:true};
}
