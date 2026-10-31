/**
 * RCH solo run discovery and share text.
 * Pure presentation/ranking helpers. These NEVER award REP, change skill ratings,
 * confirm player attendance or automatically join a roster.
 */
export type SoloRunCandidate = {
  id:string; status:string; starts_at:string; max_players:number;
  players?:readonly string[];
  skill_level:string; run_type:string; game_format:string;
};
export function isSoloJoinable(run:SoloRunCandidate,now=Date.now()):boolean{
 const start=Date.parse(run.starts_at);
 return run.status==='open'&&Number.isFinite(start)&&start>=now&&
  run.max_players>=2&&(run.players?.length??0)<run.max_players;
}
export function soloRunScore(run:SoloRunCandidate,now=Date.now()):number{
 if(!isSoloJoinable(run,now))return -1;
 const hours=(Date.parse(run.starts_at)-now)/3600000;
 const seats=run.max_players-(run.players?.length??0);
 // Prefer pickup-friendly, mixed-skill rooms with actual open space.
 // All skill levels remain selectable; this is a recommendation, not exclusion.
 return (run.skill_level==='all'?18:run.skill_level==='beginner'?12:0)
  +(run.run_type==='social'?12:run.run_type==='competitive'?6:2)
  +(seats>=2?12:seats===1?8:0)
  +(hours<=72?12:hours<=168?8:3);
}
export function rankSoloRuns<T extends SoloRunCandidate>(runs:readonly T[],now=Date.now()):T[]{
 return runs.filter(run=>isSoloJoinable(run,now))
  .sort((a,b)=>soloRunScore(b,now)-soloRunScore(a,now)
    ||Date.parse(a.starts_at)-Date.parse(b.starts_at)||a.id.localeCompare(b.id));
}
export function runShareText(run:{title:string;location:string;starts_at:string;game_format:string}):string{
 const when=new Date(run.starts_at);
 const date=Number.isFinite(when.getTime())?when.toLocaleString('en-US',{
  timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
 }):'See run details';
 return `${run.title} · ${run.game_format}\n${date} · ${run.location}\nFind your spot on Rich City Hoops. #RCHRuns`;
}
