/** Optional enrichment of the existing RCH profile, never a second account. */
export type RCHCoachIdentity={
 profile_id:string;
 headline:string;
 organization:string;
 city:string;
 years_experience:number|null;
 coaching_level:string;
 specialties:string[];
 availability:'not_listed'|'open_to_opportunities'|'not_available';
 published:boolean;
};
export type CoachIdentityForm=Omit<RCHCoachIdentity,'profile_id'>;

export const COACH_SPECIALTIES=[
 'Player development','Shooting','Ball handling','Defense','Strength & conditioning',
 'Team strategy','Leadership','Skills training','Youth development','Film study',
 'Recruiting','Basketball IQ','Position training','Offense'
] as const;
export const COACH_LEVELS=[
 'Youth / Recreation','Middle school','High school','Travel / AAU','College','Adult / Amateur','Multiple levels'
] as const;
export const emptyCoachIdentity:CoachIdentityForm={
 headline:'',organization:'',city:'',years_experience:null,coaching_level:'',
 specialties:[],availability:'not_listed',published:false,
};
export function coachMilestones(coach:Pick<CoachIdentityForm,'headline'|'specialties'|'organization'|'city'|'published'>){
 // Profile milestones reflect self-described input, not verified certifications.
 const earned=[{id:'coach-network',name:'RCH Coach',description:'Joined the RCH coaches network'}];
 if(coach.headline.trim()&&coach.city.trim())earned.push({id:'identity',name:'Coaching Identity',description:'Added a coaching headline and location'});
 if(coach.specialties.length>=2)earned.push({id:'playbook',name:'Playbook Builder',description:'Shared two or more coaching specialties'});
 if(coach.published)earned.push({id:'discovery',name:'On the Radar',description:'Opted into coach directory discovery'});
 return earned;
}
