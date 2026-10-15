/**
 * Safe destinations for the administrative RCL staff-role switchboard.
 * URLs are existing pages; viewing a role does not impersonate an employee.
 */
import type {RCLStaffRole} from './rcl-staff-roles';

type StaffAction={title:string;detail:string;href:string};
export const ADMIN_STAFF_TOOLS:Record<RCLStaffRole,readonly StaffAction[]>={
 league_coach:[
  {title:'League and team setup',detail:'Seasons, rosters, competition configuration',href:'/admin/league-setup'},
  {title:'Official league operations',detail:'Requests, tryouts, conduct and eligibility',href:'/admin/operations'},
  {title:'Games and scorebook',detail:'Schedules and game operations',href:'/games'}
 ],
 accountant:[
  {title:'Financial Office',detail:'Budgeting, expenses and revenue reconciliation',href:'/command#finance'},
  {title:'Game Revenue',detail:'Ticket, concession and event reporting',href:'/command#revenue'},
  {title:'Franchise HQ',detail:'Verified franchise financial reporting',href:'/command#franchises'}
 ],
 video_staff:[
  {title:'RCH TV administration',detail:'Production, publishing and programming',href:'/admin/rch-tv'},
  {title:'Live broadcast studio',detail:'Overlays and game or podcast production',href:'/admin/rch-tv/studio'},
  {title:'Storyline Studio',detail:'Editorial stories, scenes and visual storyboard',href:'/command#stories'}
 ],
 cheerleading_coach:[
  {title:'Royaltee Cheerleading HQ',detail:'Organization-scoped events, registration fees and attendance',href:'/league/royaltee/dashboard'},
  {title:'Royaltee Website Manager',detail:'Adult performer approvals and public program information',href:'/league/royaltee/manage'},
  {title:'Game schedule',detail:'Review league events and performance opportunities',href:'/games'}
 ],
 referee:[
  {title:'Game-day Operations',detail:'Assign game staff and monitor readiness',href:'/command#operations'},
  {title:'League operations',detail:'Manage competition requests and disputes',href:'/admin/operations'},
  {title:'League schedule',detail:'Game times and matchup details',href:'/games'}
 ],
 franchise_owner:[
  {title:'Franchise ownership workspace',detail:'View any team in administrator inspection mode',href:'/staff/franchise'},
  {title:'Franchise HQ',detail:'Revenue, attendance, and valuation intelligence',href:'/command#franchises'},
  {title:'Franchise team setup',detail:'Team and season management',href:'/admin/league-setup'}
 ]
};
export function staffDeskHref(role:RCLStaffRole,teamId?:string|null):string{
 return '/staff/desk/'+role+(teamId?'?team='+encodeURIComponent(teamId):'');
}
