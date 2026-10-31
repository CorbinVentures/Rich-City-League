import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { gravityCityFromId } from '@/lib/rch-gravity-location';
import { cityForText } from '@/lib/virginia-world';
import { groupSharedCities } from '@/lib/command/intelligence-market';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, any>;
type DayWindow = 7 | 30 | 90;
const DAY_MS = 86400000;
const safeDays = (value: string | null): DayWindow => value === '7' ? 7 : value === '90' ? 90 : 30;
const time = (value: unknown) => value ? new Date(String(value)).getTime() : NaN;
const unique = (rows: Row[], field: string) => new Set(rows.map(row => row[field]).filter(Boolean)).size;
const totalsByDay = (rows: Row[], field: string) => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = row[field];
    if (!date) continue;
    const key = String(date).slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};
function when(row: Row, field: string, since: number) {
  const value = time(row[field]);
  return Number.isFinite(value) && value >= since;
}

/** Exact bounded pagination; never silently turn a 1,000-row REST page into a total. */
async function allRows(db: any, table: string, columns: string, orderColumn: string, after?: [string, string], maxRows = 20000): Promise<Row[]> {
  const rows: Row[] = [], pageSize = 500;
  for (let start = 0; start <= maxRows; start += pageSize) {
    let query = db.from(table).select(columns).order(orderColumn, {ascending:true}).range(start, start + pageSize - 1);
    if (after) query = query.gte(after[0], after[1]);
    const {data,error} = await query;
    if (error) throw new Error('Data source unavailable: ' + table);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
    if (start + pageSize >= maxRows) throw new Error('Source ' + table + ' exceeds the analytics safe read limit; no incomplete totals were shown.');
  }
  return rows;
}

function retention(cohort: Row[], visits: Row[], start: number, end: number, now: number) {
  const matured = cohort.filter(profile => {
    const registered = time(profile.created_at);
    return registered >= now - 60 * DAY_MS && registered <= now - end * DAY_MS;
  });
  const returned = matured.filter(profile => visits.some(visit => visit.member_id === profile.id
    && time(visit.first_seen_at) >= time(profile.created_at) + start * DAY_MS
    && time(visit.first_seen_at) < time(profile.created_at) + end * DAY_MS));
  return {eligible:matured.length, returned:returned.length, percentage:matured.length ? Math.round(1000 * returned.length / matured.length) / 10 : null};
}

function vendor(name: string, configured: boolean, purpose: string, url: string) {
  return {name, configured, purpose, url};
}

export async function GET(request: NextRequest) {
  const auth = await getServerSupabaseClient();
  if (!auth) return NextResponse.json({error:'Authentication service unavailable'}, {status:503});
  const {data:{user},error:authError} = await auth.auth.getUser();
  if (!user || authError) return NextResponse.json({error:'Sign-in required'}, {status:401});
  const [{data:profile}, {data:assurance}] = await Promise.all([
    auth.from('profiles').select('role,is_active').eq('id',user.id).maybeSingle(),
    auth.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (profile?.role !== 'admin' || profile.is_active === false || assurance?.currentLevel !== 'aal2')
    return NextResponse.json({error:'Administrator MFA required'}, {status:403});

  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({error:'Server-side analytics connection unavailable'}, {status:503});
  const days = safeDays(request.nextUrl.searchParams.get('days'));
  const now = Date.now(), since = now - days * DAY_MS;
  const iso = new Date(since).toISOString();
  const historyIso = new Date(now - 90 * DAY_MS).toISOString();

  try {
    const [
      profiles,siteVisits,conversionEvents,posts,runPlayers,checkins,runs,courts,
      cityConsents,pwa,push,ledger,media,siteSubscriptions,memberSubscriptions
    ] = await Promise.all([
      allRows(db,'profiles','id,created_at,role,is_system_account','id'),
      allRows(db,'rch_site_section_visits','session_id,member_id,section,first_seen_at','first_seen_at',['first_seen_at',historyIso],30000),
      allRows(db,'rch_conversion_events','session_id,event_type,context,created_at','id',['created_at',iso]),
      allRows(db,'posts','id,author_id,created_at,is_automated,status','id',['created_at',iso]),
      allRows(db,'run_players','profile_id,run_id,joined_at','joined_at',['joined_at',iso]),
      allRows(db,'run_checkins','profile_id,run_id,checked_in_at','checked_in_at',['checked_in_at',iso]),
      allRows(db,'runs','id,location_slug,location,starts_at,status','id',['starts_at',iso]),
      allRows(db,'rch_runs_outdoor_courts','slug,locality,verification_status,is_active','slug'),
      allRows(db,'rch_analytics_city_consent','profile_id,city_id','profile_id'),
      allRows(db,'rch_pwa_installations','profile_id,platform,last_seen_at','profile_id'),
      allRows(db,'web_push_subscriptions','profile_id','id'),
      allRows(db,'rcl_command_ledger','direction,category,amount,state,occurred_on','id',['occurred_on',iso.slice(0,10)]),
      allRows(db,'media','id,status,created_at,rch_tv_category','id',['created_at',iso]),
      allRows(db,'rch_site_subscriptions','organization_id,billing_status,tier','organization_id'),
      allRows(db,'member_subscriptions','user_id,status,plan_code','id'),
    ]);
    const members = profiles.filter(p => p.is_system_account !== true);
    const memberIds = new Set(members.map(p=>p.id));
    const currentVisits = siteVisits.filter(r => when(r,'first_seen_at',since));
    const currentMemberVisits = currentVisits.filter(r=>r.member_id && memberIds.has(r.member_id));
    const humanPosts = posts.filter(p=>p.status === 'published' && p.is_automated !== true && memberIds.has(p.author_id));
    const activePwa = pwa.filter(r=>when(r,'last_seen_at',since)&&memberIds.has(r.profile_id));
    const dailyProfiles = totalsByDay(members.filter(p=>when(p,'created_at',since)),'created_at');
    const dailyCheckins = totalsByDay(checkins,'checked_in_at');
    const dailyPosts = totalsByDay(humanPosts,'created_at');
    const dailyVisits = totalsByDay(currentVisits,'first_seen_at');
    const daily = Array.from({length:days},(_,i)=>{
      const date = new Date(now - (days - 1 - i) * DAY_MS).toISOString().slice(0,10);
      return {date,members:dailyProfiles.get(date)??0,recordedCheckins:dailyCheckins.get(date)??0,
        organicPosts:dailyPosts.get(date)??0,observedEntries:dailyVisits.get(date)??0};
    });

    const funnelKeys = ['home_view','join_click','signup_view','signup_submitted','signup_created','first_action_click'];
    const funnel = funnelKeys.map(event=>({
      event, sessions:unique(conversionEvents.filter(r=>r.event_type===event),'session_id')
    }));
    const sources = [...new Set(conversionEvents.filter(r=>r.event_type==='join_click').map(r=>String(r.context??'unknown')))]
      .map(context=>({context,sessions:unique(conversionEvents.filter(r=>r.event_type==='join_click' && r.context===context),'session_id')}))
      .sort((a,b)=>b.sessions-a.sessions).slice(0,12);
    const sections = [...new Set(currentVisits.map(v=>String(v.section??'other')))]
      .map(section=>({section,entries:currentVisits.filter(v=>v.section===section).length,
        sessions:unique(currentVisits.filter(v=>v.section===section),'session_id')}))
      .sort((a,b)=>b.entries-a.entries).slice(0,16);

    const {visible:cityGroups,hiddenGroupCount} = groupSharedCities(cityConsents as {profile_id:string;city_id:string}[],memberIds);
    const courtsBySlug = new Map(courts.filter(c=>c.is_active!==false && c.verification_status==='official').map(c=>[c.slug,c]));
    const runCities = new Map<string,{scheduledRuns:number;locations:Set<string>}>();
    for(const run of runs) {
      const court = courtsBySlug.get(run.location_slug);
      const city = court ? cityForText(court.locality) : null;
      if(!city)continue;
      const current = runCities.get(city.id) ?? {scheduledRuns:0,locations:new Set<string>()};
      current.scheduledRuns++; current.locations.add(run.location_slug);
      runCities.set(city.id,current);
    }
    const courtActivity = [...runCities.entries()].map(([id,a])=>({
      cityId:id,city:gravityCityFromId(id)?.name??id,scheduledRuns:a.scheduledRuns,verifiedCourts:a.locations.size
    })).sort((a,b)=>b.scheduledRuns-a.scheduledRuns);
    const settledLedger = ledger.filter(r=>r.state==='reconciled');
    const revenue = (direction:string,category?:string) => settledLedger
      .filter(r=>r.direction===direction&&(!category||String(r.category??'').toLowerCase().includes(category)))
      .reduce((sum,r)=>sum+Number(r.amount||0),0);

    const observations = {
      membersTotal:members.length,newMembers:members.filter(p=>when(p,'created_at',since)).length,
      activeObservedMembers:unique(currentMemberVisits,'member_id'),
      observedTabSessions:unique(currentVisits,'session_id'),
      runJoins:runPlayers.length, runPlayers:unique(runPlayers,'profile_id'),
      recordedCheckins:checkins.length,recordedAttendees:unique(checkins,'profile_id'),
      organicPosts:humanPosts.length,creators:unique(humanPosts,'author_id'),
      pwaMembers:unique(activePwa,'profile_id'),
      pwaIos:unique(activePwa.filter(p=>p.platform==='ios'),'profile_id'),
      pwaAndroid:unique(activePwa.filter(p=>p.platform==='android'),'profile_id'),
      pushMembers:unique(push,'profile_id'),
      publishedMedia:media.filter(m=>m.status==='published').length,
      paidOrganizationSites:siteSubscriptions.filter(s=>s.billing_status==='active'&&s.tier!=='free').length,
      activeMemberSubscriptions:memberSubscriptions.filter(s=>s.status==='active').length,
      reconciledIncome:revenue('income'),reconciledExpenses:revenue('expense'),
      reconciledSponsorshipIncome:revenue('income','sponsor'),
      optInCityMembers:cityConsents.filter(c=>memberIds.has(c.profile_id)).length,
    };
    const cohorts = {d7:retention(members,siteVisits,7,14,now),d30:retention(members,siteVisits,30,37,now)};
    const integrations = [
      vendor('PostHog',Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),'Funnels, experiments, product behavior','https://posthog.com/docs'),
      vendor('Microsoft Clarity',Boolean(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),'Opt-in public-page heatmaps / replay','https://clarity.microsoft.com/'),
      vendor('Google Search Console',Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL),'Search reach, impressions and indexing','https://search.google.com/search-console'),
      vendor('Vercel Analytics',Boolean(process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID),'Independent traffic and web vitals','https://vercel.com/docs/analytics'),
      vendor('Sentry',Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),'Crashes, exceptions and technical alerts','https://sentry.io/'),
    ];
    const insights: string[] = [];
    if(observations.newMembers>0 && observations.runPlayers===0)insights.push('New memberships are being recorded, but no distinct Run players joined in this window. Review the onboarding path to Runs.');
    if(observations.observedTabSessions>0 && observations.pwaMembers===0)insights.push('Web activity is observed, but no signed-in standalone iOS/Android PWA launches are observed for this window. Review the install invitation.');
    if(cohorts.d7.eligible>=10 && cohorts.d7.percentage!==null && cohorts.d7.percentage<20)insights.push('The measured day-7-to-13 return window is below 20%. Review first-week engagement before drawing a causal conclusion.');
    if(observations.recordedCheckins===0 && observations.runJoins>0)insights.push('Run signups exist without recorded check-ins in this window. Confirm whether events have occurred and check-in workflow usage.');
    if(insights.length===0)insights.push('No rule-based exception triggered. Continue measuring verified member activity, cohorts, and sponsorship outcomes.');
    return NextResponse.json({
      generatedAt:new Date(now).toISOString(),days,observations,daily,sections,funnel,sources,cohorts,
      geography:{consentedTotal:observations.optInCityMembers,reportedCities:cityGroups,
        hiddenCities:hiddenGroupCount,courtActivity,
        basis:'Member cities are explicit opt-ins; only groups of at least three are shown. Court activity is event scheduling at verified listed courts, not member proximity.'},
      integrations,insights,
      measurement:{privacy:'No exact location or member identities returned. Do Not Track and browser session restrictions apply to site observation.',
        retention:'D7 = member had an observed signed-in section entry from day 7 to day 13 after signup; D30 = days 30 to 36. Eligible members have aged past the window. Missing observations are not proof of no engagement.',
        sessions:'Site and funnel sessions refer to random browser-tab sessions, not unique humans or verified cross-session journeys.',
        finance:'Only reconciled ledger entries; may overlap other revenue records. Not audited profit or ad-attribution.',
        active:'Active observed members are those with measured signed-in site entries, not all users.'}
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Intelligence service unavailable'},{status:503,headers:{'Cache-Control':'private, no-store'}});
  }
}
