/** Read-only battle view models; never invents an outcome or a score. */
export type BattleChallengeRow={
 id:string;court_slug:string;run_id:string;challenger_crew_id:string;defender_crew_id:string;
 winning_crew_id:string|null;status:string;created_at:string;resolved_at:string|null;
};
export type BattleDisplay={
 id:string;court:string;courtSlug:string;challenger:string;defender:string;winner:string|null;
 status:'requested'|'accepted'|'resolved';createdAt:string;resolvedAt:string|null;
 runId:string;runAt:string|null;
};
export const phase={
 requested:{eyebrow:'CHALLENGE ISSUED',description:'The defending crew has not accepted. No basketball result has been recorded.',color:'pending'},
 accepted:{eyebrow:'BATTLE LOCKED',description:'Both crews have agreed. Only the independently confirmed game will decide this court.',color:'accepted'},
 resolved:{eyebrow:'BATTLE DECIDED',description:'A recorded result has resolved this challenge. The court standings remain authoritative.',color:'resolved'}
} as const;

export function buildBattleDisplays(
 challenges:readonly BattleChallengeRow[],courtNames:Readonly<Record<string,string>>,
 crewNames:Readonly<Record<string,string>>,startTimes:Readonly<Record<string,string>>
):BattleDisplay[]{
 return challenges.filter(c=>c.status==='requested'||c.status==='accepted'||c.status==='resolved')
  .map(c=>({id:c.id,court:courtNames[c.court_slug]||'Virginia Court',courtSlug:c.court_slug,
   challenger:crewNames[c.challenger_crew_id]||'Registered challenger',
   defender:crewNames[c.defender_crew_id]||'Defending crew',
   winner:c.status==='resolved'&&c.winning_crew_id?crewNames[c.winning_crew_id]||'Verified winning crew':null,
   status:c.status as BattleDisplay['status'],createdAt:c.created_at,resolvedAt:c.resolved_at,
   runId:c.run_id,runAt:startTimes[c.run_id]||null
  })).sort((a,b)=>(a.status==='resolved'?1:0)-(b.status==='resolved'?1:0)||Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
export function shortBattleDate(date:string|null){
 if(!date)return 'Schedule pending';
 const t=Date.parse(date);
 return Number.isFinite(t)?new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Schedule unavailable';
}

