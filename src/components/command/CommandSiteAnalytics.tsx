'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { VisualArea, VisualDonut, VisualRails, VisualHeatmap, VisualComparison } from './CommandVisuals';
const CommandLiveAnalytics = dynamic(() => import('./CommandLiveAnalytics').then(m => m.CommandLiveAnalytics), {loading:()=> <p className="rounded-xl border border-[#355777] bg-[#0c2035] p-5">Connecting live Command Center analytics…</p>});
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaArrowTrendUp, FaArrowUpRightFromSquare, FaBasketball, FaChartLine,
  FaCircleExclamation, FaClock, FaDownload, FaEye, FaRotate,
  FaShieldHalved, FaUsers, FaWallet, FaChartColumn, FaWaveSquare,
} from 'react-icons/fa6';

type Period = 7 | 30 | 90 | 365;
type Section = 'live' | 'overview' | 'audience' | 'social' | 'basketball' | 'business';
type NumericSummary = Record<string, number>;
type DailyRow = {day: string; members: number; visits: number; sessions: number; posts: number; content_views: number};
type TrafficRow = {section: string; visits: number; sessions: number; members: number};
type RoleRow = {role: string; members: number};
type ContentRow = {id: string; preview: string; views: number; reactions: number; comments: number};
type ExecutiveAnalytics = {
  generated_at: string;
  data_since: string | null;
  days: number;
  summary: NumericSummary;
  daily: DailyRow[];
  sections: TrafficRow[];
  membership_growth: RoleRow[];
  top_content: ContentRow[];
};

const reports: {id: Section; title: string}[] = [
  {id:'live',title:'Live Command'},
  {id:'overview',title:'Executive overview'},
  {id:'audience',title:'Audience & reach'},
  {id:'social',title:'Social & content'},
  {id:'basketball',title:'Basketball ecosystem'},
  {id:'business',title:'Revenue & operations'},
];
const formatter = new Intl.NumberFormat('en-US');
const money = (amount: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(amount);
const n = (data: ExecutiveAnalytics, key: string) => Number(data.summary[key] ?? 0);
const nSafe = (data: ExecutiveAnalytics|null, key: string) => data ? n(data,key) : 0;
const labelSection = (section: string) => ({home:'Home',social:'RCH Pulse',discover:'Discover',runs:'Runs',crews:'Crews',commonwealth:'Commonwealth Cup',league:'Rich City League',players:'Players',teams:'Teams',media:'RCH TV & Clips',news:'News',communities:'Communities',organizations:'Organization Network',shop:'Shop',professional:'Professional Dashboard',other:'Other'} as Record<string,string>)[section] ?? section;

function KPI({label,value,detail}: {label:string;value:string|number;detail:string}) {
  return <article className="rounded-2xl border border-[#355777] bg-[linear-gradient(145deg,#102a43,#0a192b)] p-4 sm:p-5">
    <p className="text-xs font-bold uppercase tracking-[.12em] text-[#a4c7e5]">{label}</p>
    <strong className="mt-2 block break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{value}</strong>
    <p className="mt-2 text-xs leading-5 text-[#b7cde0]">{detail}</p>
  </article>;
}

function Heading({eyebrow,title,description}: {eyebrow:string;title:string;description:string}) {
  return <header className="mb-4">
    <p className="text-xs font-black uppercase tracking-[.2em] text-[#72bafe]">{eyebrow}</p>
    <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
    <p className="mt-1 max-w-3xl text-sm leading-6 text-[#bdd4e7]">{description}</p>
  </header>;
}

function downloadReport(data: ExecutiveAnalytics) {
  const fields=Object.keys(data.summary).sort();
  const rows: Array<Array<string|number>>=[
    ['metric','value'],
    ['report_period_days',data.days],['generated_at_utc',data.generated_at],
    ...fields.map(key=>[key,data.summary[key]] as Array<string|number>),
    [],['utc_day','new_members','observed_visits','observed_sessions','published_posts','recorded_post_views'],
    ...data.daily.map(d=>[d.day,d.members,d.visits,d.sessions,d.posts,d.content_views]),
    [],['section','observed_visits','observed_sessions','observed_members'],
    ...data.sections.map(s=>[s.section,s.visits,s.sessions,s.members]),
  ];
  const cell=(value:string|number)=>`"${String(value??'').replace(/"/g,'""')}"`;
  const csv=rows.map(row=>row.map(cell).join(',')).join('\r\n');
  const file=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');
  a.href=url;a.download=`RCH-executive-analytics-${data.days}d.csv`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

export function CommandSiteAnalytics() {
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [period,setPeriod]=useState<Period>(30);
  const [section,setSection]=useState<Section>('live');
  const [data,setData]=useState<ExecutiveAnalytics|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [version,setVersion]=useState(0);

  useEffect(()=>{
    if(!db){setLoading(false);setError('Analytics database is not configured.');return;}
    let live=true;
    setLoading(true);setError('');
    void db.rpc('get_rch_executive_analytics',{p_days:period}).then(
      ({data:response,error:failure}: {data:ExecutiveAnalytics|null;error:{message:string}|null})=>{
        if(!live)return;
        if(failure)throw new Error(failure.message);
        if(!response?.summary||!Array.isArray(response.daily))throw new Error('The analytics service returned an incomplete report.');
        setData(response);
      },
    ).catch((reason:Error)=>{if(live){setData(null);setError(reason.message||'Unable to load executive analytics.');}})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[db,period,version]);

  const reload=useCallback(()=>setVersion(v=>v+1),[]);
  const panel='rounded-2xl border border-[#355777] bg-[#0c2035] p-5';
  const since=data?.data_since ? new Date(data.data_since).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : null;
  const trafficReady=Boolean(since);
  const palette=['#65d1ff','#a7a8ff','#60e4c9','#f7af62','#e5a4fb','#5c94e7','#e7d18a','#8cc1fc'];
  const sectionParts=(data?.sections??[]).slice(0,5).map((row,i)=>({
    label:labelSection(row.section),value:row.visits,color:palette[i],
  }));
  const otherVisits=(data?.sections??[]).slice(5).reduce((sum,row)=>sum+row.visits,0);
  if(otherVisits>0)sectionParts.push({label:'Other sections',value:otherVisits,color:palette[5]});
  const roleParts=(data?.membership_growth??[]).slice(0,7).map((row,i)=>({
    label:row.role.replace(/_/g,' '),value:row.members,color:palette[i],
  }));
  const totalVisibleRoles=(data?.membership_growth??[]).slice(7).reduce((sum,row)=>sum+row.members,0);
  if(totalVisibleRoles>0)roleParts.push({label:'Other roles',value:totalVisibleRoles,color:palette[7]});
  const overallSignals=[
    {label:'Run joins',value:nSafe(data,'run_signups'),color:'#62d5ff'},
    {label:'Community joins',value:nSafe(data,'community_joins'),color:'#7be1bb'},
    {label:'New crews',value:nSafe(data,'crews_created'),color:'#ada5ff'},
    {label:'League registrations',value:nSafe(data,'player_registrations'),color:'#f3c77a'},
  ];
  const growthSeries=[
    {key:'members' as const,label:'New members',color:'#61cbff'},
    {key:'visits' as const,label:'Section visits',color:'#9c9bff'},
    {key:'posts' as const,label:'Published posts',color:'#6ee2b8'},
  ];
  const audienceSeries=[
    {key:'members' as const,label:'Registrations',color:'#63cdff'},
    {key:'sessions' as const,label:'Observed sessions',color:'#a3a4ff'},
    {key:'visits' as const,label:'Section visits',color:'#6ce3c3'},
  ];
  const contentSeries=[
    {key:'posts' as const,label:'Published posts',color:'#6cceff'},
    {key:'content_views' as const,label:'Recorded post views',color:'#b1a1ff'},
  ];
  return <main className="min-h-[70vh] bg-[#061323] px-3 py-5 text-white sm:px-6 sm:py-8" aria-label="RCH Sitewide Executive Analytics">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#2a4e70] pb-6">
      <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#81c3fb]"><FaChartLine/> RCH intelligence / Executive Command</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sitewide <span className="text-[#82c6fc]">Analytics</span></h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c3d7e7]">One view of the entire Rich City Hoops ecosystem: live activity, audience, discovery, creator engagement, competitions, growth, and recorded business results.</p>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={reload} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#4c7395] px-4 text-sm font-semibold text-white disabled:opacity-50"><FaRotate/> Refresh</button>
        <button type="button" disabled={!data||loading} onClick={()=>{if(data)downloadReport(data)}} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#8ccdfc] px-4 text-sm font-black text-[#071c30] disabled:opacity-50"><FaDownload/> Export CSV</button></div>
    </header>

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reporting period">
        {([7,30,90,365] as const).map(days=><button key={days} type="button" aria-pressed={period===days} onClick={()=>setPeriod(days)}
          className={`min-h-10 rounded-lg px-4 text-xs font-black ${period===days?'bg-[#7bc5fa] text-[#082039]':'border border-[#456987] text-[#d8ebfb]'}`}>{days} days</button>)}
      </div>
      {data&&<p className="text-xs text-[#b9d2e6]">Generated {new Date(data.generated_at).toLocaleString()} · Daily dates in UTC</p>}
    </div>
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-2" aria-label="Analytics reports">{reports.map(tab=><button key={tab.id} type="button" onClick={()=>setSection(tab.id)} aria-pressed={section===tab.id}
      className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-bold ${section===tab.id?'border border-[#86caff] bg-[#153c60] text-white':'border border-[#2d516f] text-[#bfd9ed]'}`}>{tab.title}</button>)}</nav>

    <section className="rch-viz-stage" aria-label="RCH visual intelligence">
      <div className="rch-viz-stage-eyebrow"><FaWaveSquare aria-hidden="true"/> RCH / VIRGINIA INTELLIGENCE</div>
      <h2>THE NUMBERS. <em>THE MOVEMENT.</em></h2>
      <p>Explore the pulse of Rich City Hoops through interactive data graphics. Every chart is powered by actual platform records, with separate accounting for observed website traffic and registered basketball activity.</p>
      <div className="rch-viz-stage-rail">
        <span><i/> {section==='live'?'Near real-time signals':'Recorded platform data'}</span>
        <span><FaChartColumn aria-hidden="true"/> {section==='live'?'30-second snapshots':`${period}-day analysis`}</span>
        <span><FaShieldHalved aria-hidden="true"/> Private executive access</span>
      </div>
    </section>
    {section==='live'?<CommandLiveAnalytics/>:loading?<section role="status" className={panel}>Loading verified sitewide analytics…</section>:
      error?<section role="alert" className={panel}><div className="flex items-center gap-2 text-lg font-bold text-white"><FaCircleExclamation/> Report unavailable</div><p className="mt-2 text-sm text-[#d0dfef]">{error}</p><button type="button" onClick={reload} className="mt-4 rounded-lg bg-[#84c7f8] px-5 py-3 text-sm font-bold text-[#0a1b2a]">Retry report</button></section>:
      data?<div className="space-y-6">
        {!trafficReady&&<aside className="rounded-xl border border-[#426c92] bg-[#12304d] p-4 text-sm leading-6 text-[#e1f0fb]">Traffic history begins when the new screen-visit measurement starts receiving activity. We do not backfill or estimate past visitors. Other historical figures come from existing platform records.</aside>}
        {section==='overview'&&<>
          <Heading eyebrow="Boardroom / At a glance" title="Platform performance" description="Recorded platform totals and activity during the selected reporting period. New member counts exclude system accounts."/>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI label="Total registered members" value={formatter.format(n(data,'members_total'))} detail="Non-system member accounts, all time"/>
            <KPI label="New members" value={formatter.format(n(data,'new_members'))} detail={`Registered within ${period} days`}/>
            <KPI label="Observed visit sessions" value={trafficReady?formatter.format(n(data,'sessions_observed')):'Collecting'} detail="Distinct browser-tab sessions; not unique people"/>
            <KPI label="Recorded content views" value={formatter.format(n(data,'content_views'))} detail="Signed-in views of eligible social posts"/>
            <KPI label="Organic social posts" value={formatter.format(n(data,'organic_posts'))} detail="Member-created published posts, excluding automation"/>
            <KPI label="Run registrations" value={formatter.format(n(data,'run_signups'))} detail="Joined basketball runs"/>
            <KPI label="New organizations" value={formatter.format(n(data,'organizations_added'))} detail="Basketball organizations in the network"/>
            <KPI label="Paid shop orders" value={formatter.format(n(data,'paid_orders'))} detail="Orders with a recorded paid status"/>
          </div>

          <div className="rch-viz-grid">
            <div className="rch-viz-wide"><VisualArea rows={data.daily} title="RCH performance velocity" detail="Switch metrics to explore the daily trend without changing the reporting window." series={growthSeries} initialMetric="members"/></div>
            <VisualDonut title="Where the audience moves" detail="Share of recorded broad-section visits. Not unique people or geographic location." items={sectionParts} centerLabel="section visits"/>
            <VisualRails title="Top product destinations" detail="Observed section visits. Tab sessions shown for context." items={data.sections.map(row=>({label:labelSection(row.section),value:row.visits,detail:`${formatter.format(row.sessions)} observed tab sessions`}))}/>
            <div className="rch-viz-wide"><VisualHeatmap rows={data.daily} metric={trafficReady?'visits':'members'} title="Platform activity calendar" detail={trafficReady?'Daily observed site-section visits across the reporting window.':'Daily registrations while first-party traffic collection begins.'}/></div>
          </div>
        </>}
        {section==='audience'&&<>
          <Heading eyebrow="Audience intelligence" title="Membership and discovery" description="Registration trends, reported platform activity, and the most visited product areas. Traffic metrics are observational, not a census of everyone online."/>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI label="Registered members" value={formatter.format(n(data,'members_total'))} detail="Non-system accounts"/>
            <KPI label="New registrations" value={formatter.format(n(data,'new_members'))} detail="New accounts in selected window"/>
            <KPI label="Active signed-in members" value={trafficReady?formatter.format(n(data,'active_members_observed')):'Collecting'} detail="Members with recorded section visits, not all activity"/>
            <KPI label="Observed sessions" value={trafficReady?formatter.format(n(data,'sessions_observed')):'Collecting'} detail="Unique tab sessions in observed traffic"/>
          </div>
          
          <div className="rch-viz-grid">
            <div className="rch-viz-wide"><VisualArea rows={data.daily} title="Audience growth monitor" detail="Registration and visitor-session trends, using their original units." series={audienceSeries} initialMetric="members"/></div>
            <VisualDonut title="Who makes up RCH" detail="Breakdown by current active, non-system member role; not a count of daily visitors." items={roleParts} centerLabel="members"/>
            <VisualRails title="Discovery leaderboard" detail="Measured site sections only; traffic may be blocked or opted out." items={data.sections.map(s=>({label:labelSection(s.section),value:s.visits,detail:`${s.members} observed signed-in members`}))}/>
            <div className="rch-viz-wide"><VisualHeatmap rows={data.daily} metric="sessions" title="Returning attention calendar" detail="Daily observed browser-tab sessions (not individual returning visitors)."/></div>
          </div>
        </>}
        {section==='social'&&<>
          <Heading eyebrow="Content intelligence" title="Pulse, creators and conversation" description="Actual platform activity from the post, reaction, follow, messaging and observed post-view records."/>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ['Published posts','published_posts','Includes automated content'],
              ['Organic posts','organic_posts','Published by people'],
              ['Post views','content_views','Observed signed-in views'],
              ['Reactions','reactions','Engagement actions'],
              ['Comments','comments','Replies to posts'],
              ['Reposts','reposts','Shared posts'],
              ['Saves','saves','Saved content'],
              ['New follows','new_follows','Audience connections'],
              ['Messages','messages_sent','Non-deleted messages'],
              ['New friendships','new_friends','Accepted friendship records created in period'],
              ['Referrals','new_referrals','Invites attributed to members'],
              ['Qualified referrals','qualified_referrals','Verified referral outcomes'],
            ] as const).map(([label,key,detail])=><KPI key={key} label={label} value={formatter.format(n(data,key))} detail={detail}/>)}
          </div>
          
          <div className="rch-viz-grid">
            <div className="rch-viz-wide"><VisualArea rows={data.daily} title="Content momentum" detail="Published posts versus measured post views. Switch between event types." series={contentSeries} initialMetric="content_views"/></div>
            <VisualDonut title="Engagement actions" detail="Share of recorded interaction events; actions may originate from the same member." items={[
              {label:'Reactions',value:n(data,'reactions'),color:'#65d1ff'},
              {label:'Comments',value:n(data,'comments'),color:'#a3a4ff'},
              {label:'Reposts',value:n(data,'reposts'),color:'#66e0c4'},
              {label:'Saves',value:n(data,'saves'),color:'#f5bd81'},
            ]} centerLabel="interactions"/>
            <VisualRails title="Most watched content" detail="Ranked by recorded signed-in views during the selected window." items={data.top_content.map((post,i)=>({label:post.preview||`Media post ${i+1}`,value:post.views,detail:`${post.reactions} reactions · ${post.comments} comments`}))}/>
            <div className="rch-viz-wide"><VisualHeatmap rows={data.daily} metric="posts" title="Publishing cadence" detail="Daily published posts, including automated publications; heat intensity follows actual counts."/></div>
          </div>
          <section className={panel}><h3 className="text-lg font-bold">Top observed social content</h3><p className="mt-1 text-xs text-[#b7cde1]">Ranked by recorded views in the reporting period; pre-tracking traffic is unavailable.</p>
            <div className="mt-4 divide-y divide-[#305371]">{data.top_content.length?data.top_content.map((post,i)=><Link key={post.id} href={`/social/post/${post.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-[#93d1fc]"><span className="flex min-w-0 flex-1 gap-3"><b className="text-[#88c8fa]">{i+1}.</b><span className="min-w-0 break-words text-sm">{post.preview || 'Media post'}</span></span><span className="shrink-0 text-xs text-[#b7d1e7]">{formatter.format(post.views)} views · {formatter.format(post.reactions)} reactions · {formatter.format(post.comments)} comments <FaArrowUpRightFromSquare className="ml-1 inline"/></span></Link>):<p className="py-5 text-sm text-[#c4d8e8]">No recorded qualifying post views yet.</p>}</div>
          </section>
        </>}
        {section==='basketball'&&<>
          <Heading eyebrow="Ecosystem intelligence" title="Basketball activity statewide" description="Participation and supply-side reporting across Runs, Crews, League games, community organizations, tryouts and training."/>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ['Runs created','runs_created','New posted basketball runs'],
              ['Run signups','run_signups','Joined run rosters'],
              ['Run check-ins','run_checkins','Verified attendance records'],
              ['Ranked results','ranked_games_verified','Verified competitive match results'],
              ['Crews formed','crews_created','New registered crews'],
              ['Crew run entries','crew_run_entries','Crew-to-run participation'],
              ['League games added','games_scheduled','Games created in the system'],
              ['League registrations','player_registrations','Submitted season applications'],
              ['Tryout registrations','tryout_registrations','Athlete tryout signups'],
              ['Organizations added','organizations_added','New network members'],
              ['Network events','network_events_added','Published event records, all statuses'],
              ['Training sessions','lab_sessions','The Lab sessions created'],
              ['Community joins','community_joins','Joins to basketball communities'],
              ['News articles','news_published','Published editorial articles'],
            ] as const).map(([label,key,detail])=><KPI key={key} label={label} value={formatter.format(n(data,key))} detail={detail}/>)}
          </div>
          <div className="rch-viz-grid">
            <div className="rch-viz-wide"><VisualComparison title="Virginia basketball activity scoreboard" detail="An actual recorded count for each activity type, across the selected reporting period." unit="different basketball event types" items={[
              {label:'Runs created',value:n(data,'runs_created'),color:'#67d3ff'},
              {label:'Run joins',value:n(data,'run_signups'),color:'#68e1c4'},
              {label:'Check-ins',value:n(data,'run_checkins'),color:'#aaa7ff'},
              {label:'Verified results',value:n(data,'ranked_games_verified'),color:'#e0b0f8'},
              {label:'Crews formed',value:n(data,'crews_created'),color:'#e5bc72'},
              {label:'League games',value:n(data,'games_scheduled'),color:'#8dbeff'},
              {label:'Organizations',value:n(data,'organizations_added'),color:'#88d2e0'},
            ]}/></div>
            <VisualDonut title="Participation signals" detail="The relative share of four event types—not a conversion funnel or census of players." items={overallSignals} centerLabel="events"/>
            <VisualRails title="Statewide ecosystem activity" detail="Virginia-wide platform totals; regional or city rankings require verified location aggregates." items={[
              {label:'Run roster joins',value:n(data,'run_signups')},
              {label:'Community joins',value:n(data,'community_joins')},
              {label:'Tryout registrations',value:n(data,'tryout_registrations')},
              {label:'Training sessions',value:n(data,'lab_sessions')},
              {label:'Crew run entries',value:n(data,'crew_run_entries')},
              {label:'Ranked results',value:n(data,'ranked_games_verified')},
              {label:'League registrations',value:n(data,'player_registrations')},
            ]}/>
          </div>
          <p className="rch-viz-insight"><strong>Geography integrity:</strong> These results represent platform activity across the Commonwealth, not a geographic heatmap. RCH will only rank cities or regions when privacy-safe and verified location counts are available.</p>
          <div className={panel}><h3 className="text-lg font-bold">Operational interpretation</h3><p className="mt-2 text-sm leading-6 text-[#c7daea]">Run participation, competition verification and community membership are real platform actions. This report does not infer game attendance, ticket sales or Commonwealth Cup winners from registrations. Game-day financial outcomes remain separately reconciled in the Financial Office.</p></div>
        </>}
        {section==='business'&&<>
          <Heading eyebrow="Business performance" title="Revenue, growth and fulfillment" description="Paid order records and reconciled Command Center bookkeeping. These are separate revenue sources and must not be summed without reconciliation."/>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPI label="Paid orders" value={formatter.format(n(data,'paid_orders'))} detail="Orders entered with a paid/completed status"/>
            <KPI label="Recorded order value" value={money(n(data,'paid_order_cents')/100)} detail="Order totals in cents converted to USD; not bank-verified cash"/>
            <KPI label="Active memberships" value={formatter.format(n(data,'active_subscriptions'))} detail="Current active or trialing subscription records"/>
            <KPI label="Reconciled ledger income" value={money(n(data,'ledger_income'))} detail="Command financial office, income only"/>
            <KPI label="Reconciled ledger expenses" value={money(n(data,'ledger_expenses'))} detail="Command financial office, expenses only"/>
            <KPI label="Ledger net" value={money(n(data,'ledger_income')-n(data,'ledger_expenses'))} detail="Reconciled income minus expenses, selected period"/>
            <KPI label="Network prospects joined" value={formatter.format(n(data,'organizations_added'))} detail="Organizations added to the network"/>
            <KPI label="New referrals" value={formatter.format(n(data,'qualified_referrals'))} detail="Qualified referral records"/>
          </div>

          <div className="rch-viz-grid">
            <VisualDonut title="Reconciled financial split" detail="Comparing ledger income and expense entries recorded in dollars; not a profit margin." centerLabel="ledger flow" format="currency" items={[
              {label:'Ledger income',value:Math.max(0,n(data,'ledger_income')),color:'#5fdbce'},
              {label:'Ledger expenses',value:Math.max(0,n(data,'ledger_expenses')),color:'#ef9b9b'},
            ]}/>
            <VisualRails title="Commerce activity scoreboard" detail="These are separate observed business record counts, not combined revenue." items={[
              {label:'Paid shop orders',value:n(data,'paid_orders'),detail:'Recorded paid/completed orders'},
              {label:'Active or trial memberships',value:n(data,'active_subscriptions'),detail:'Current subscription status'},
              {label:'Qualified referrals',value:n(data,'qualified_referrals'),detail:'Referral events in this window'},
              {label:'New organizations',value:n(data,'organizations_added'),detail:'New organization records'},
            ]}/>
            <div className="rch-viz-wide"><VisualComparison title="Revenue signals side by side" detail="Amounts shown in USD. Shop order totals and reconciled bookkeeping can overlap and must never be added." unit="recorded USD amounts" items={[
              {label:'Gross order value',value:Math.max(0,n(data,'paid_order_cents')/100),color:'#65caff'},
              {label:'Ledger income',value:Math.max(0,n(data,'ledger_income')),color:'#64dbb2'},
              {label:'Ledger expenses',value:Math.max(0,n(data,'ledger_expenses')),color:'#f6af9a'},
            ]}/></div>
          </div>
          <p className="rch-viz-insight"><strong>Reconciled ledger net:</strong> {money(n(data,'ledger_income')-n(data,'ledger_expenses'))}. This is ledger income less ledger expenses and is not an audited profit-and-loss report.</p>
          <section className={panel}><div className="flex items-center gap-2 text-[#93caff]"><FaWallet/><h3 className="text-lg font-bold text-white">Financial integrity</h3></div><p className="mt-2 text-sm leading-6 text-[#d1e0ee]">Orders are gross recorded order totals; tax, refunds, payment processing, taxes and unsettled receivables may not be represented. Ledger totals include only reconciled entries and may already include order proceeds. These figures are operational indicators—not an audited profit-and-loss statement.</p></section>
        </>}
        <footer className="rounded-xl border border-[#355d7c] bg-[#0d2740] p-4 text-xs leading-6 text-[#c1d8eb]">
          <p className="flex items-center gap-2 font-bold text-white"><FaShieldHalved/> Measurement & privacy</p>
          <p>Traffic collection {since?`observed since ${since}`:'awaiting first observed visit'}; 10-minute section-level de-duplication. Visitors using privacy controls, blockers or browsers without storage may not appear. Session counts refer to browser tabs, not unique people. No personal locations, IP addresses, raw page paths or search queries are collected by this analytics feature.</p>
          <p className="mt-1">Reports include existing platform records before traffic tracking began. All aggregate analytics are restricted to MFA-verified administrators. No individual visitor roster is exposed.</p>
        </footer>
      </div>:null}
  </main>;
}
