'use client';

import { useEffect, useState } from 'react';
import {
  FaArrowUpRightFromSquare, FaChartLine, FaLocationDot, FaRotate, FaShieldHalved,
  FaBasketball, FaUsers, FaChartColumn, FaMobileScreen, FaCircleExclamation,
} from 'react-icons/fa6';
type WindowDays = 7 | 30 | 90;
type Metric = Record<string, number>;
type Day = {date:string;members:number;verifiedCheckins:number;organicPosts:number;observedEntries:number};
type Report = {
  generatedAt:string;days:WindowDays; observations:Metric; daily:Day[];
  sections:{section:string;entries:number;sessions:number}[];
  funnel:{event:string;sessions:number}[];
  sources:{context:string;sessions:number}[];
  cohorts:{d7:{eligible:number;returned:number;percentage:number|null};d30:{eligible:number;returned:number;percentage:number|null}};
  geography:{consentedTotal:number;reportedCities:{cityId:string;city:string;members:number}[];
    hiddenCities:number;courtActivity:{cityId:string;city:string;scheduledRuns:number;verifiedCourts:number}[];basis:string};
  integrations:{name:string;configured:boolean;purpose:string;url:string}[];
  insights:string[];measurement:{privacy:string;retention:string;sessions:string;finance:string;active:string};
};
const fmt = new Intl.NumberFormat('en-US');
const currency = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const title = (s:string) => s.replaceAll('_',' ').replace(/\b\w/g,match=>match.toUpperCase());
function Surface({title:heading,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}) {
  return <section className="rounded-2xl border border-[#315474] bg-[#0b2137] p-5 sm:p-6">
    <h2 className="text-lg font-black text-white sm:text-xl">{heading}</h2>
    {subtitle&&<p className="mt-1 text-xs leading-5 text-[#b9d3e7]">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>;
}
function KPI({label,value,detail}:{label:string;value:string|number;detail:string}) {
  return <article className="rounded-xl border border-[#365a78] bg-[#112d47] p-4">
    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#bbd8ed]">{label}</p>
    <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
    <p className="mt-2 text-xs leading-5 text-[#b7cee2]">{detail}</p>
  </article>;
}
function Bars({rows,labelKey,valueKey,empty='No qualifying records yet.'}:{
  rows:Record<string,unknown>[];labelKey:string;valueKey:string;empty?:string;
}) {
  if(!rows.length)return <p className="text-sm text-[#bcd6e9]">{empty}</p>;
  const peak=Math.max(1,...rows.map(row=>Number(row[valueKey]??0)));
  return <div className="space-y-3">{rows.map((row,index)=>{
    const value=Number(row[valueKey]??0);
    return <div key={String(row[labelKey])+index}>
      <div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-white">{String(row[labelKey])}</span>
        <strong className="tabular-nums text-[#8dcdff]">{fmt.format(value)}</strong></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#24435e]"><div className="h-full rounded-full bg-[#78bff1]" style={{width:`${value / peak * 100}%`}}/></div>
    </div>;
  })}</div>;
}
function Trend({daily}:{daily:Day[]}) {
  const peak=Math.max(1,...daily.map(d=>d.members+d.verifiedCheckins+d.organicPosts));
  return <div>
    <div className="flex h-40 items-end gap-1 border-b border-[#426785] pb-1" aria-label="Daily new memberships, verified check-ins and organic posts">
      {daily.map(d=><div key={d.date} className="group relative flex h-full min-w-0 flex-1 items-end gap-px" title={`${d.date}: ${d.members} new members, ${d.verifiedCheckins} verified check-ins, ${d.organicPosts} organic posts`}>
        <span className="w-1/3 rounded-t-sm bg-[#83cfff]" style={{height:`${Math.max(1,d.members/peak*100)}%`}}/>
        <span className="w-1/3 rounded-t-sm bg-[#91e4b4]" style={{height:`${Math.max(1,d.verifiedCheckins/peak*100)}%`}}/>
        <span className="w-1/3 rounded-t-sm bg-[#e5b5ff]" style={{height:`${Math.max(1,d.organicPosts/peak*100)}%`}}/>
      </div>)}
    </div>
    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#bfd7eb]"><span>{daily[0]?.date}</span><span>{daily[daily.length-1]?.date}</span></div>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#d4e8f7]">
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#83cfff]"/>New members</span>
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#91e4b4]"/>Verified check-ins</span>
      <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#e5b5ff]"/>Organic posts</span>
    </div>
  </div>;
}
const funnelLabels:Record<string,string> = {
 home_view:'Homepage viewed',join_click:'Join Free clicked',signup_view:'Registration viewed',
 signup_submitted:'Signup submitted',signup_created:'Account created',first_action_click:'Welcome action clicked',
};
export function CommandIntelligenceCenter() {
  const [days,setDays]=useState<WindowDays>(30);
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [version,setVersion]=useState(0);
  const [view,setView]=useState<'executive'|'audience'|'geography'|'revenue'|'systems'>('executive');
  useEffect(()=>{
    let open=true;
    setLoading(true);setError('');
    const controller=new AbortController();
    void fetch(`/api/command/intelligence?days=${days}`,{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Intelligence service unavailable');
        return data as Report;
      }).then(data=>{if(open)setReport(data)}).catch(reason=>{
        if(open){setReport(null);setError(reason instanceof Error?reason.message:'Unable to load analytics');}
      }).finally(()=>{if(open)setLoading(false)});
    return()=>{open=false;controller.abort()};
  },[days,version]);
  const n=(key:string)=>fmt.format(report?.observations[key]??0);
  const tabButton=(id:typeof view,label:string)=><button key={id} type="button" aria-pressed={view===id} onClick={()=>setView(id)}
    className={`min-h-11 shrink-0 rounded-xl px-4 text-xs font-bold ${view===id?'bg-[#88c9fc] text-[#061b2a]':'border border-[#456983] bg-[#0a243b] text-[#d3e8f7]'}`}>{label}</button>;
  return <div className="space-y-5 rounded-2xl bg-[#061423] p-3 text-white sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#365b7c] pb-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#8bccfb]"><FaChartLine/> RCH / Intelligence Operations</p>
        <h1 className="mt-2 text-3xl font-black">Intelligence <span className="text-[#86c8fa]">Center</span></h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c4d8e8]">Verified platform activity, member journeys, cohort retention, PWA adoption, market coverage and reconciled financial signals. No invented traffic or predicted results.</p>
      </div>
      <button type="button" disabled={loading} onClick={()=>setVersion(v=>v+1)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#587b98] px-4 text-sm font-bold disabled:opacity-50"><FaRotate/> Refresh data</button>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="group" aria-label="Reporting period">
        {([7,30,90] as const).map(period=><button key={period} type="button" aria-pressed={days===period} onClick={()=>setDays(period)}
          className={`min-h-10 rounded-lg px-4 text-xs font-bold ${days===period?'bg-[#89c9fc] text-[#092338]':'border border-[#456983] text-white'}`}>{period} days</button>)}
      </div>
      <span className="text-xs text-[#a7c5df]">{report ? `Verified snapshot ${new Date(report.generatedAt).toLocaleString()}` : 'Secure administrator analytics'}</span>
    </div>
    <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Intelligence reports">
      {tabButton('executive','Executive')}{tabButton('audience','Members & Growth')}
      {tabButton('geography','Virginia Markets')}{tabButton('revenue','Sponsorship & Media')}
      {tabButton('systems','Systems & Experiments')}
    </nav>
    {loading&&<section role="status" className="rounded-xl border border-[#345574] p-5 text-sm">Loading cross-platform intelligence…</section>}
    {!loading&&error&&<section role="alert" className="rounded-xl border border-[#9c6a38] bg-[#302719] p-5 text-sm"><FaCircleExclamation className="mr-2 inline"/>The report is unavailable: {error}. Figures are not being replaced with zero estimates.</section>}
    {!loading&&report&&<>
      {view==='executive'&&<>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPI label="Members" value={n('membersTotal')} detail="Non-system accounts, all-time"/>
          <KPI label="New memberships" value={n('newMembers')} detail={`Created over ${days} days`}/>
          <KPI label="Observed active members" value={n('activeObservedMembers')} detail="Signed-in section visits, not all active users"/>
          <KPI label="Verified check-ins" value={n('verifiedCheckins')} detail="Recorded on-site basketball check-ins"/>
          <KPI label="PWA members" value={n('pwaMembers')} detail="Observed standalone launches; not installed-device census"/>
          <KPI label="Run participants" value={n('runPlayers')} detail="Distinct members joining Runs"/>
          <KPI label="Human creators" value={n('creators')} detail="Distinct non-automated post authors"/>
          <KPI label="Opted-in VA city members" value={n('optInCityMembers')} detail="Voluntary city signals only"/>
        </div>
        <Surface title="Platform growth velocity" subtitle="Measured daily registrations, verified attendance and original social publishing. Each bar reports actual database records.">
          <Trend daily={report.daily}/>
        </Surface>
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface title="Where attention goes" subtitle="Measured section entries, not individual people.">
            <Bars rows={report.sections.map(s=>({...s,label:title(s.section)}))} labelKey="label" valueKey="entries"/>
          </Surface>
          <Surface title="Executive evidence brief" subtitle="Rules based on real counts, not an AI-generated explanation of causation.">
            <div className="space-y-3">{report.insights.map(item=><p key={item} className="rounded-lg border border-[#345774] bg-[#15334b] p-3 text-sm leading-6 text-[#e1f1ff]">{item}</p>)}</div>
          </Surface>
        </div>
      </>}
      {view==='audience'&&<>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="Observed tab sessions" value={n('observedTabSessions')} detail="Browser-tab IDs; not unique visitors"/>
          <KPI label="Run signups" value={n('runJoins')} detail="Run roster joins"/>
          <KPI label="Recorded attendees" value={n('verifiedAttendees')} detail="Distinct checked-in player accounts"/>
          <KPI label="Push subscribers" value={n('pushMembers')} detail="Distinct member profiles with saved subscriptions, all time"/>
          <KPI label="iPhone/iPad PWA" value={n('pwaIos')} detail="Observed standalone app users"/>
          <KPI label="Android PWA" value={n('pwaAndroid')} detail="Observed standalone app users"/>
          <KPI label="Organic posts" value={n('organicPosts')} detail="Member-authored records"/>
          <KPI label="New members" value={n('newMembers')} detail={`${days}-day signup cohort`}/>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface title="Registration funnel" subtitle="Each step counts distinct tab sessions, not a verified joined cross-session funnel.">
            <Bars rows={report.funnel.map(s=>({...s,label:funnelLabels[s.event]??title(s.event)}))} labelKey="label" valueKey="sessions"/>
          </Surface>
          <Surface title="Acquisition entry points" subtitle="Recorded Join Free clicks grouped by approved CTA context.">
            <Bars rows={report.sources.map(s=>({...s,label:title(s.context)}))} labelKey="label" valueKey="sessions"/>
          </Surface>
          <Surface title="Measured return cohorts" subtitle="An observed visit in the defined return window; users with privacy opt-outs may be missing.">
            {(['d7','d30'] as const).map(id=><div key={id} className="mb-3 rounded-lg border border-[#365777] bg-[#123149] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold">{id==='d7'?'Days 7–13 after signup':'Days 30–36 after signup'}</p>
                <p className="mt-1 text-xs text-[#bed7e9]">{report.cohorts[id].returned} observed returns / {report.cohorts[id].eligible} eligible members</p></div>
                <strong className="text-3xl font-black">{report.cohorts[id].percentage===null?'Insufficient cohort':`${report.cohorts[id].percentage}%`}</strong></div>
            </div>)}
          </Surface>
          <Surface title="Engagement definition" subtitle="What these signals do and do not prove">
            <p className="text-sm leading-6 text-[#d0e4f3]">{report.measurement.retention}</p>
            <p className="mt-3 text-sm leading-6 text-[#d0e4f3]">{report.measurement.sessions}</p>
          </Surface>
        </div>
      </>}
      {view==='geography'&&<>
        <Surface title="Virginia market intelligence" subtitle="Planning signals from voluntary city preferences and basketball activity at verified courts. No GPS traces, visitor IP geography or individual whereabouts.">
          <div className="grid gap-3 sm:grid-cols-3">
            <KPI label="Opted-in city members" value={n('optInCityMembers')} detail="All-time current opt-ins"/>
            <KPI label="Reportable markets" value={fmt.format(report.geography.reportedCities.length)} detail="At least 3 consenting members per city"/>
            <KPI label="Court-active cities" value={fmt.format(report.geography.courtActivity.length)} detail={`Verified-court scheduled Runs in ${days} days`}/>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#b9d5e9]">{report.geography.basis} {report.geography.hiddenCities>0?`${report.geography.hiddenCities} small market groups are suppressed.`:''}</p>
        </Surface>
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface title="Member-supported cities" subtitle="Only members who intentionally opted into reporting. Groups with fewer than three are hidden.">
            <Bars rows={report.geography.reportedCities} labelKey="city" valueKey="members" empty="No consenting Virginia city has yet reached the three-member publication threshold."/>
          </Surface>
          <Surface title="Verified-court activity by city" subtitle="Scheduled run records linked to verified park basketball courts; not proof the event occurred.">
            <Bars rows={report.geography.courtActivity} labelKey="city" valueKey="scheduledRuns" empty="No Runs are linked to a verified court within this reporting window."/>
          </Surface>
        </div>
        <p className="text-xs leading-6 text-[#c4daeb]">Members can voluntarily share or remove their city under <a href="/settings/discovery" className="font-bold text-[#93d3ff] underline">Location & Discovery</a>. Exact device coordinates are never collected by this report.</p>
      </>}
      {view==='revenue'&&<>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPI label="Ledger income" value={currency(report.observations.reconciledIncome??0)} detail="Reconciled entries only"/>
          <KPI label="Sponsorship ledger" value={currency(report.observations.reconciledSponsorshipIncome??0)} detail="Reconciled income categories containing sponsor"/>
          <KPI label="Ledger expenses" value={currency(report.observations.reconciledExpenses??0)} detail="Reconciled spending entries"/>
          <KPI label="Ledger net" value={currency((report.observations.reconciledIncome??0)-(report.observations.reconciledExpenses??0))} detail="Not audited platform profit"/>
          <KPI label="Active paid organization sites" value={n('paidOrganizationSites')} detail="Subscription records with active paid tier"/>
          <KPI label="Active member subscriptions" value={n('activeMemberSubscriptions')} detail="Subscription status only, not collected cash"/>
          <KPI label="Published media" value={n('publishedMedia')} detail="Eligible published uploads created in reporting window"/>
          <KPI label="Human posts" value={n('organicPosts')} detail="Organic publishing; no estimated ad impressions"/>
        </div>
        <Surface title="Sponsor and creator reporting integrity" subtitle="Advertising and revenue must have independently verifiable source records.">
          <div className="space-y-3 text-sm leading-6 text-[#d1e5f4]">
            <p>Only reconciled ledger revenue is counted as sponsorship revenue here. Site visits, video plays, and media impressions are never substituted for verified ad delivery.</p>
            <p>{report.measurement.finance}</p>
            <p>Content engagement is compared to independently recorded member actions; revenue attribution is not claimed without linked campaigns or purchases.</p>
          </div>
        </Surface>
      </>}
      {view==='systems'&&<>
        <Surface title="Analytics integrations" subtitle="Connection status reports presence of configuration only. It does not imply consent, successful data ingestion, session replay, or an operational external dashboard.">
          <div className="grid gap-3 lg:grid-cols-2">{report.integrations.map(item=><article key={item.name} className="rounded-xl border border-[#365878] bg-[#102b45] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{item.name}</strong>
              <span className={`text-xs font-bold ${item.configured?'text-[#9ae5c0]':'text-[#f8c993]'}`}>{item.configured?'Credentials detected · verify service':'Not configured'}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#bdd5e7]">{item.purpose}</p>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#90d0ff]">Provider setup <FaArrowUpRightFromSquare/></a>
          </article>)}</div>
        </Surface>
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface title="Performance & diagnostics" subtitle="No error-rate or speed statistic is invented from database activity.">
            <div className="flex items-start gap-3 text-sm leading-6 text-[#d3e4f2]"><FaShieldHalved className="mt-1 shrink-0 text-[#a1d5fc]"/>Vercel runtime diagnostics and Sentry reporting require their own verified connected datasets. Until configured and validated, this module reports connection readiness only.</div>
          </Surface>
          <Surface title="Heatmaps, replay & A/B experiments" subtitle="Privacy and measurement prerequisites before activating.">
            <div className="text-sm leading-6 text-[#d3e4f2]">Replay is disabled until a provider is configured and explicit user consent with sensitive-field masking is implemented and verified. Experiment win rates are not shown without randomized assignments, exposure logs and observed outcomes.</div>
          </Surface>
        </div>
      </>}
      <footer className="rounded-xl border border-[#375e7a] bg-[#0e2942] p-4 text-xs leading-6 text-[#c6d9e9]">
        <div className="flex items-center gap-2 font-black text-white"><FaShieldHalved/> Audit definitions</div>
        <p>{report.measurement.privacy}</p><p>{report.measurement.active}</p><p>Numbers represent observable actions for the stated period. No GPS tracking, predictive churn scores, inferred visitor identity or unverified session replay is deployed.</p>
      </footer>
    </>}
  </div>;
}
