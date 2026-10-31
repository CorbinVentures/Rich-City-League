import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {calculateMemberActivation,type CohortAction,type CohortMember} from '@/lib/rch-member-activation';

// Server-only aggregates. /admin is protected by middleware and MFA; never
// send the raw rows or member IDs to a browser component.
export async function RchActivationCohorts(){
 const db=getSupabaseAdminClient() as any;
 if(!db)return <p role="status" className="mt-6 text-amber-200">Member cohort analytics unavailable: database not configured.</p>;
 const since=new Date(Date.now()-120*86400000).toISOString();
 const queries=await Promise.all([
  db.from('profiles').select('id,created_at,is_system_account').eq('is_system_account',false).gte('created_at',since).limit(5001),
  db.from('posts').select('author_id,created_at').eq('status','published').eq('is_automated',false).gte('created_at',since).limit(5001),
  db.from('follows').select('follower_id,created_at').gte('created_at',since).limit(5001),
  db.from('run_checkins').select('profile_id,created_at').gte('created_at',since).limit(5001)
 ]);
 if(queries.some(row=>row.error||!Array.isArray(row.data)||row.data.length>5000))
  return <p role="status" className="mt-6 rounded-xl border border-amber-300/25 p-4 text-amber-200">Member cohort analytics unavailable or incomplete. Source query failed or exceeded the 5,000-record safety limit; no retention percentage is shown.</p>;
 const [profiles,posts,follows,checkins]=queries.map(row=>row.data??[]);
 const actions:CohortAction[]=[
  ...posts.map((r:{author_id:string;created_at:string})=>({profile_id:r.author_id,created_at:r.created_at,type:'post' as const})),
  ...follows.map((r:{follower_id:string;created_at:string})=>({profile_id:r.follower_id,created_at:r.created_at,type:'follow' as const})),
  ...checkins.map((r:{profile_id:string;created_at:string})=>({profile_id:r.profile_id,created_at:r.created_at,type:'checkin' as const}))
 ];
 const report=calculateMemberActivation(profiles as CohortMember[],actions);
 const metrics=[
  {label:'First action within 7 days',value:report.activated7d},
  {label:'Activity on days 7–14',value:report.repeat7d},
  {label:'Activity on days 30–60',value:report.repeat30d}
 ];
 return <section className="mt-9 rounded-xl border border-white/15 bg-white/[.035] p-5 sm:p-6" aria-labelledby="rch-cohort-title">
  <h2 id="rch-cohort-title" className="text-2xl font-bold">Verified account-action cohorts</h2>
  <p className="mt-2 text-sm leading-6 text-white/65">Real, non-system profiles created in the last 120 days. Only published human posts, follows and recorded court check-ins count as actions. A check-in record is not independent proof of a completed game. Clicks, bot posts and anonymous page views never count.</p>
  <div className="mt-5 grid gap-3 sm:grid-cols-3">
   {metrics.map(metric=><div key={metric.label} className="rounded-lg border border-white/15 p-4">
    <p className="text-xs font-semibold uppercase text-white/55">{metric.label}</p>
    <p className="mt-2 font-display text-3xl font-black">{metric.value.rate===null?'Insufficient cohort':metric.value.rate.toFixed(1)+'%'}</p>
    <p className="mt-1 text-xs text-white/55">{metric.value.returned} of {metric.value.eligible} eligible profiles</p>
   </div>)}
  </div>
  <p className="mt-4 text-xs text-white/55">{report.members} eligible non-system profile records in sampled signup range · {report.activeHumanContributors7d} distinct human post authors over seven days. Cohort eligibility requires a full measurement window; no estimate is shown for immature cohorts. These are action signals, not evidence of market dominance.</p>
 </section>;
}
