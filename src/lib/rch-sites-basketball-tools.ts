/**
 * RCH Sites basketball toolkit catalog. Presentation only: feature inclusion
 * is not a grant of authorization or proof a module has shipped.
 * The authenticated API + RLS must separately enforce each capability.
 */
import {RCH_SITE_PLANS,RCH_SITE_RELEASED_FEATURES,
  type RchSiteFeature,type RchSitePlanTier} from '@/lib/rch-sites-plans';
import {rchSiteSectionsFor,type RchSiteType} from '@/lib/rch-site-builder';

export type BasketballTool={
  id:string;name:string;description:string;feature:RchSiteFeature;
  firstPlan:RchSitePlanTier;href:string|null;
  audiences:readonly RchSiteType[];
};
export type BasketballToolAccess='available'|'planned'|'planned_higher_plan'|'upgrade'|'inactive_subscription';
export type BasketballToolView=BasketballTool&{access:BasketballToolAccess};

const ALL=['trainer','coach','aau','organizer'] as const satisfies readonly RchSiteType[];
const COACHING=['trainer','coach'] as const satisfies readonly RchSiteType[];
const TEAM=['coach','aau'] as const satisfies readonly RchSiteType[];
const COMPETITION=['aau','organizer'] as const satisfies readonly RchSiteType[];

export const RCH_BASKETBALL_TOOLS:readonly BasketballTool[]=[
  {id:'bookings',name:'Training bookings',description:'Offer time slots for workouts, lessons and evaluations.',feature:'booking.basic',firstPlan:'free',href:'/network/dashboard/sites/appointments',audiences:ALL},
  {id:'inquiries',name:'Player inquiries',description:'Receive and follow up with prospective players or clients.',feature:'communications.inquiries',firstPlan:'free',href:'/network/dashboard/sites/people',audiences:ALL},
  {id:'events',name:'Basketball events',description:'Post open gyms, tryouts and upcoming games.',feature:'events.public',firstPlan:'free',href:null,audiences:ALL},
  {id:'groups',name:'Group workouts',description:'Manage multiple athletes in a training session.',feature:'booking.group',firstPlan:'amateur',href:null,audiences:COACHING},
  {id:'registrations',name:'Program registration',description:'Collect adult program and tryout registrations.',feature:'registration.adult',firstPlan:'amateur',href:null,audiences:ALL},
  {id:'rosters',name:'Team rosters',description:'Organize team information and player lists.',feature:'events.rosters',firstPlan:'amateur',href:null,audiences:TEAM},
  {id:'media',name:'Team & training media',description:'Showcase basketball photography and approved media.',feature:'media.library',firstPlan:'amateur',href:null,audiences:ALL},
  {id:'marketing',name:'Program outreach',description:'Send consent-based program announcements.',feature:'communications.marketing',firstPlan:'amateur',href:null,audiences:ALL},
  {id:'staff',name:'Multi-coach scheduling',description:'Coordinate coaches across sessions.',feature:'booking.multi_staff',firstPlan:'amateur',href:null,audiences:COACHING},
  {id:'brackets',name:'Tournament brackets',description:'Run organized matchups and advance teams by result.',feature:'events.brackets',firstPlan:'professional',href:null,audiences:COMPETITION},
  {id:'divisions',name:'League divisions',description:'Manage multiple divisions within a competition.',feature:'events.multi_division',firstPlan:'professional',href:null,audiences:COMPETITION},
  {id:'venues',name:'Court & resource calendar',description:'Schedule facilities and prevent resource conflicts.',feature:'booking.resources',firstPlan:'professional',href:null,audiences:ALL},
  {id:'automations',name:'Basketball communications',description:'Plan follow-up campaigns and reminders.',feature:'communications.automation',firstPlan:'professional',href:null,audiences:ALL},
  {id:'domains',name:'Custom website domain',description:'Connect a verified organization-owned domain.',feature:'seo.custom_domain',firstPlan:'professional',href:null,audiences:ALL},
];

export const RCH_BASKETBALL_TEMPLATES:Readonly<Record<RchSiteType,{
  label:string;summary:string;headline:string;about:string;callToAction:string;
  defaultSections:readonly string[];
}>>={
  trainer:{label:'Trainer',summary:'Workouts, sessions and player development',
    headline:'Get better every session',about:'Basketball skills, training sessions, and development opportunities.',
    callToAction:'Book a session',defaultSections:rchSiteSectionsFor('trainer')},
  coach:{label:'Coach',summary:'Coaching services, teams and tryouts',
    headline:'Develop the next generation',about:'Coaching, player development, and basketball programs.',
    callToAction:'Contact coach',defaultSections:rchSiteSectionsFor('coach')},
  aau:{label:'AAU / Team',summary:'Teams, tryouts and program information',
    headline:'Built for our next generation',about:'Our basketball teams, programs, and upcoming opportunities.',
    callToAction:'Ask about tryouts',defaultSections:rchSiteSectionsFor('aau')},
  organizer:{label:'League / Tournament',summary:'Games, events and competitions',
    headline:'The next game starts here',about:'Basketball events, leagues, tournaments, and community competition.',
    callToAction:'See our events',defaultSections:rchSiteSectionsFor('organizer')},
};

/** Organization records may have broader taxonomy than website design templates. */
export function basketballSiteTypeForOrganization(value:unknown):RchSiteType{
  if(value==='training')return 'trainer';
  if(value==='team')return 'aau';
  if(value==='league'||value==='tournament'||value==='facility')return 'organizer';
  return 'coach';
}

const priorities:Readonly<Record<RchSiteType,readonly string[]>>={
  trainer:['bookings','inquiries','groups','staff','registrations','venues','media','marketing'],
  coach:['bookings','inquiries','rosters','groups','registrations','venues','staff','events'],
  aau:['inquiries','bookings','registrations','rosters','events','brackets','divisions','media'],
  organizer:['inquiries','bookings','events','registrations','brackets','divisions','venues','marketing'],
};

/** UI only. Server-authoritative entitlement check still required on every action. */
export function basketballToolsFor(type:RchSiteType,tier:RchSitePlanTier,
  paidSubscriptionActive=false,maxItems=6):BasketballToolView[]{
  const priority=priorities[type];
  return RCH_BASKETBALL_TOOLS.filter(tool=>tool.audiences.includes(type))
    .sort((a,b)=>{
      const aIndex=priority.indexOf(a.id),bIndex=priority.indexOf(b.id);
      return (aIndex<0?999:aIndex)-(bIndex<0?999:bIndex);
    })
    .map(tool=>{
      const included=RCH_SITE_PLANS[tier].features.includes(tool.feature);
      const released=RCH_SITE_RELEASED_FEATURES.has(tool.feature)&&Boolean(tool.href);
      let access:BasketballToolAccess;
      if(!released)access=included?'planned':'planned_higher_plan';
      else if(!included)access='upgrade';
      else if(tier!=='free'&&!paidSubscriptionActive)access='inactive_subscription';
      else access='available';
      return {...tool,access};
    }).slice(0,maxItems);
}
