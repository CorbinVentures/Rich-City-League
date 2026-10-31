/** Authoritative, privacy-safe member cohort analysis.
 * Inputs are server-side records; never feed anonymous tab-session clicks into retention.
 */
export type CohortMember = {id:string;created_at:string;is_system_account:boolean|null};
export type CohortAction = {profile_id:string;created_at:string;type:'post'|'follow'|'checkin'};
export type CohortResult = {eligible:number;returned:number;rate:number|null};
export type ActivationMetrics = {
  members:number; activated7d:CohortResult; repeat7d:CohortResult; repeat30d:CohortResult;
  activeHumanContributors7d:number;
};
const DAY=86_400_000;
const isFiniteDate=(value:string)=>Number.isFinite(Date.parse(value));
function result(eligible:number,returned:number):CohortResult {
  return {eligible,returned,rate:eligible>0?Math.round(returned/eligible*1000)/10:null};
}
export function calculateMemberActivation(members:readonly CohortMember[],actions:readonly CohortAction[],now=Date.now()):ActivationMetrics {
  const real=members.filter(m=>m.id&&!m.is_system_account&&isFiniteDate(m.created_at)&&Date.parse(m.created_at)<=now);
  const byId=new Map(real.map(m=>[m.id,Date.parse(m.created_at)]));
  const actionTimes=new Map<string,number[]>();
  const weeklyContributors=new Set<string>();
  for(const a of actions) {
    if(!byId.has(a.profile_id)||!isFiniteDate(a.created_at))continue;
    const t=Date.parse(a.created_at);
    if(t>now||t<byId.get(a.profile_id)!)continue;
    if(!actionTimes.has(a.profile_id))actionTimes.set(a.profile_id,[]);
    actionTimes.get(a.profile_id)!.push(t);
    if(a.type==='post'&&t>=now-7*DAY)weeklyContributors.add(a.profile_id);
  }
  let eligibleActivated=0,activated=0,eligible7=0,returned7=0,eligible30=0,returned30=0;
  for(const m of real){
    const created=byId.get(m.id)!;
    const age=now-created;
    const activity=actionTimes.get(m.id)??[];
    // Completed first action within the seven days after signing up, only for
    // accounts old enough to have had the full seven-day opportunity.
    if(age>=7*DAY){
      eligibleActivated++;
      if(activity.some(t=>t<=created+7*DAY))activated++;
    }
    if(age>=14*DAY){
      eligible7++;
      if(activity.some(t=>t>=created+7*DAY&&t<created+14*DAY))returned7++;
    }
    if(age>=60*DAY){
      eligible30++;
      if(activity.some(t=>t>=created+30*DAY&&t<created+60*DAY))returned30++;
    }
  }
  return {
    members:real.length,
    activated7d:result(eligibleActivated,activated),
    repeat7d:result(eligible7,returned7),
    repeat30d:result(eligible30,returned30),
    activeHumanContributors7d:weeklyContributors.size,
  };
}
