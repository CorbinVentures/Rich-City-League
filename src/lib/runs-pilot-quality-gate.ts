/** Evidence-based studio scorecard. A deployment alone cannot certify a physical pilot.
 * No default category score is ever invented. */
export const PILOT_CATEGORIES=[
 'world_and_concept',
 'myplayer_identity',
 'visual_game_feel',
 'first_time_gameplay',
 'progression_rewards',
 'multiplayer_matchmaking',
 'crews_territory',
 'competitive_fairness',
 'replayability_retention'
] as const;
export type PilotCategory=typeof PILOT_CATEGORIES[number];
export type CategoryEvidence={score:number|null;evidence:string[];verifiedBy:string|null};
export type PilotEvidence={
 categories:Partial<Record<PilotCategory,CategoryEvidence>>;
 venuePermission:boolean;weatherPlan:boolean;firstAid:boolean;
 rosterMinimumMet:boolean;independentOfficialAssigned:boolean;
 twoAccountDeviceTest:boolean;checkinAndResultsVerified:boolean;
 consentReviewed:boolean;
};
export const PILOT_REQUIRED_SCORE=8;
export function assessPilot(evidence:PilotEvidence){
 const categoryResults=PILOT_CATEGORIES.map(category=>{
  const entry=evidence.categories[category];
  const score=entry?.score;
  const valid=typeof score==='number'&&Number.isInteger(score)&&score>=0&&score<=10;
  const passed=valid&&score>=PILOT_REQUIRED_SCORE&&Boolean(entry?.verifiedBy?.trim())&&Boolean(entry?.evidence?.some(value=>value.trim()));
  return {category,score:valid?score:null,passed,reason:passed?'Evidenced >=8/10':!valid?'No validated score':score<PILOT_REQUIRED_SCORE?'Below 8/10':'Independent evidence and reviewer required'};
 });
 const safetyChecks={
  venuePermission:evidence.venuePermission,weatherPlan:evidence.weatherPlan,firstAid:evidence.firstAid,
  rosterMinimumMet:evidence.rosterMinimumMet,independentOfficialAssigned:evidence.independentOfficialAssigned,
  twoAccountDeviceTest:evidence.twoAccountDeviceTest,checkinAndResultsVerified:evidence.checkinAndResultsVerified,
  consentReviewed:evidence.consentReviewed
 };
 const blockers=[...categoryResults.filter(x=>!x.passed).map(x=>x.category),
  ...Object.entries(safetyChecks).filter(([,ok])=>!ok).map(([key])=>key)];
 return {cleared:blockers.length===0,categoryResults,blockers};
}
