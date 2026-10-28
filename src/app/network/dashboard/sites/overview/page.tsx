'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {Container} from '@/components/Container';
import {useAuth} from '@/hooks/useAuth';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {
  summarizeRchSitesOverview,
  type RchSitesOverviewInquiry,
  type RchSitesOverviewOffering,
  type RchSitesOverviewSlot,
  type RchSitesOverviewService,
} from '@/lib/rch-sites-overview';
import {
  FaArrowLeft,FaArrowRight,FaArrowUpRightFromSquare,FaCalendarDays,
  FaCircleCheck,FaClock,FaEnvelope,FaGlobe,FaLink,FaRotate,
} from 'react-icons/fa6';

type Org={id:string;name:string;eligible:boolean;member_role:string};
type Published={organization_id:string;slug:string;status:string};
type SitesResponse={organizations:Org[];published:Published[]};
type InquiryResponse={inquiries:RchSitesOverviewInquiry[]};
type CalendarResponse={slots:RchSitesOverviewSlot[];services:RchSitesOverviewService[];
  websitePlan?:{tier:string;billingStatus:string}};
type PaymentResponse={offerings:RchSitesOverviewOffering[]};
type Activity={
  organizationId:string;
  inquiries:RchSitesOverviewInquiry[]|null;
  slots:RchSitesOverviewSlot[]|null;
  services:RchSitesOverviewService[]|null;
  offerings:RchSitesOverviewOffering[]|null;
  plan:{tier:string;billingStatus:string}|null;
  failed:number;
};

const endpoint='/network/dashboard/sites';
const card='rounded-2xl border border-white/15 bg-white/[.045] p-5';
const control='min-h-12 rounded-xl border border-white/20 bg-[#161920] px-4 py-3 text-sm text-white focus:border-rose-400 focus:outline-none';
const inManagerRole=(org:Org)=>org.eligible&&['owner','manager'].includes(org.member_role);
const shortTime=(date:string)=>{
  const stamp=Date.parse(date);
  return Number.isFinite(stamp)
    ?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(stamp))
    :'Date unavailable';
};
const inquiryTypes:Record<string,string>={
  training:'Training',program:'Program',event:'Event',general:'General',
};
async function getData<T>(url:string,signal:AbortSignal):Promise<T>{
  const response=await fetch(url,{cache:'no-store',signal});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('Unable to load requested organization information.');
  return body as T;
}

export default function RchSitesOverviewPage(){
  const {user,loading:authLoading}=useAuth();
  const [organizations,setOrganizations]=useState<Org[]>([]);
  const [published,setPublished]=useState<Published[]>([]);
  const [selected,setSelected]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [activity,setActivity]=useState<Activity|null>(null);
  const [activityLoading,setActivityLoading]=useState(false);
  const [refreshToken,setRefreshToken]=useState(0);
  const userId=user?.id;

  // Only organization memberships returned by the existing authenticated Site API
  // can populate this picker. Each private activity endpoint independently checks
  // active owner/manager membership and verified organization eligibility.
  useEffect(()=>{
    if(authLoading)return;
    if(!userId){
      setLoading(false);setOrganizations([]);setPublished([]);setSelected('');setActivity(null);
      return;
    }
    const controller=new AbortController();
    setLoading(true);setError('');
    void getData<SitesResponse>('/api/rch-sites',controller.signal)
      .then(data=>{
        if(controller.signal.aborted)return;
        const allowed=(data.organizations??[]).filter(inManagerRole);
        setOrganizations(allowed);
        setPublished(data.published??[]);
        setSelected(prev=>allowed.some(o=>o.id===prev)?prev:allowed[0]?.id??'');
      })
      .catch(()=>{
        if(!controller.signal.aborted)setError('Could not load your organizations. Refresh the page to retry.');
      })
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[authLoading,userId]);

  useEffect(()=>{
    if(authLoading||!userId||!selected)return;
    if(!organizations.some(o=>o.id===selected&&inManagerRole(o)))return;
    const controller=new AbortController();
    setActivityLoading(true);
    setActivity(null);
    const id=encodeURIComponent(selected);
    void Promise.allSettled([
      getData<InquiryResponse>('/api/rch-sites/inquiries?organizationId='+id,controller.signal),
      getData<CalendarResponse>('/api/rch-sites/appointments?organizationId='+id,controller.signal),
      getData<PaymentResponse>('/api/rch-sites/paypal?organizationId='+id,controller.signal),
    ]).then(results=>{
      if(controller.signal.aborted)return;
      const inbox=results[0].status==='fulfilled'?results[0].value:null;
      const calendar=results[1].status==='fulfilled'?results[1].value:null;
      const payments=results[2].status==='fulfilled'?results[2].value:null;
      setActivity({
        organizationId:selected,
        inquiries:inbox?.inquiries??null,
        slots:calendar?.slots??null,
        services:calendar?.services??null,
        offerings:payments?.offerings??null,
        plan:calendar?.websitePlan??null,
        failed:results.filter(r=>r.status==='rejected').length,
      });
    }).finally(()=>{if(!controller.signal.aborted)setActivityLoading(false);});
    return ()=>controller.abort();
  },[selected,organizations,refreshToken,userId,authLoading]);

  const organization=organizations.find(o=>o.id===selected);
  const liveRecord=published.find(x=>x.organization_id===selected);
  const isLive=liveRecord?.status==='published'&&isRchSiteSlug(liveRecord.slug);
  const current=activity?.organizationId===selected?activity:null;
  const summary=useMemo(()=>summarizeRchSitesOverview({
    siteStatus:isLive?'published':liveRecord?.status??null,
    inquiries:current?.inquiries??null,
    slots:current?.slots??null,
    services:current?.services??null,
    offerings:current?.offerings??null,
  }),[isLive,liveRecord?.status,current]);
  const pending=activityLoading||!current;
  const links=[
    {name:'Website Studio',description:'Edit & publish',href:endpoint,icon:<FaGlobe/>},
    {name:'Calendar',description:'Services & availability',href:endpoint+'/appointments',icon:<FaCalendarDays/>},
    {name:'Inbox',description:'Follow up with members',href:endpoint+'/people',icon:<FaEnvelope/>},
    {name:'PayPal links',description:'Your own business payments',href:endpoint+'/payments',icon:<FaLink/>},
  ];

  return <main className="min-h-screen bg-[#090b11] pb-28 text-white">
    <Container maxWidth="xl" className="py-8 sm:py-12">
      <Link href="/network/dashboard" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/60"><FaArrowLeft/> Partner dashboard</Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-rose-300">RCH Sites · Organization HQ</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Your day, at a glance.</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">Your website, your people, your next move. Everything in one place.</p>
        </div>
        <Link href={endpoint} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black">
          Edit website <FaArrowRight/>
        </Link>
      </header>
      {authLoading||loading?<p role="status" className="mt-8 text-sm text-white/60">Opening your organization dashboard…</p>:!userId?
        <section className={card+' mt-8'}>
          <p className="text-sm text-white/70">Sign in to view your organization's private activity.</p>
          <Link href="/auth/sign-in?next=/network/dashboard/sites/overview"
            className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-rose-600 px-5 text-sm font-black">Sign in</Link>
        </section>:error?<p role="alert" className="mt-8 rounded-xl border border-rose-400/30 p-5 text-sm text-rose-200">{error}</p>:
      organizations.length===0?
        <section className={card+' mt-8'}>
          <h2 className="text-lg font-black">Your website starts here.</h2>
          <p className="mt-2 text-sm text-white/65">Claim or verify a basketball organization to see private inquiries and bookings. You can prepare a free website draft before approval.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-12 items-center rounded-xl bg-rose-600 px-5 text-sm font-black" href="/website-creator/start">Build a free website</Link>
            <Link className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 text-sm font-bold" href="/organizations">Find your organization</Link>
          </div>
        </section>:
      <>
        <section className="mt-7 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/15 bg-white/[.04] p-4 sm:p-5">
          <label className="min-w-0 flex-1 text-xs font-bold sm:max-w-md">Organization
            <select className={control+' mt-2 w-full'} value={selected}
              onChange={e=>{setSelected(e.target.value);setActivity(null);}}>
              {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={()=>setRefreshToken(v=>v+1)} disabled={activityLoading}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-bold disabled:opacity-40">
            <FaRotate/> Refresh
          </button>
        </section>
        <section aria-label="Website status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#12151e] p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className={'grid h-11 w-11 shrink-0 place-items-center rounded-xl '+(isLive?'bg-emerald-400/15 text-emerald-200':'bg-white/10 text-white/70')}><FaGlobe/></span>
            <div className="min-w-0">
              <p className="truncate font-black">{organization?.name}</p>
              <p className="mt-1 text-xs text-white/60">{isLive?'Website live · Publicly visible':'Website not published · Private draft'}</p>
            </div>
          </div>
          {isLive&&liveRecord?
            <Link className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-emerald-300 underline"
              target="_blank" rel="noopener noreferrer" href={'/sites/'+liveRecord.slug}>Visit public site <FaArrowUpRightFromSquare/></Link>:
            <Link href={endpoint} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-rose-300">Finish website <FaArrowRight/></Link>}
        </section>
        {current?.failed? <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">
          Some updates could not load. A dash means unavailable data, not zero activity. Refresh to retry.
        </p>:null}
        <section aria-label="Organization activity" className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="New inquiries" value={pending?null:summary.newInquiries}
            hint="Most recent 100 requests" href={endpoint+'/people'} icon={<FaEnvelope/>}/>
          <Metric label="Booked upcoming" value={pending?null:summary.upcomingBooked}
            hint="Among next 200 times" href={endpoint+'/appointments'} icon={<FaCalendarDays/>}/>
          <Metric label="Open times" value={pending?null:summary.availableSlots}
            hint="Among next 200 times" href={endpoint+'/appointments'} icon={<FaClock/>}/>
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className={card} aria-labelledby="next-actions">
            <div className="flex items-center justify-between gap-3">
              <h2 id="next-actions" className="text-lg font-black">What needs attention?</h2>
              <span className="text-xs text-white/45">Up to 3 priorities</span>
            </div>
            {pending?<p role="status" className="mt-5 text-sm text-white/55">Checking your activity…</p>:
            summary.actions.length===0?
              <p className="mt-5 text-sm text-white/60">{current?.failed?'Some information is unavailable. Try refreshing.':'Nothing urgent here. Keep your website and availability current.'}</p>:
            <div className="mt-4 space-y-2">{summary.actions.map((a,index)=>
              <Link key={a.id} href={a.href} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/15 bg-black/20 p-3 hover:border-rose-400/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500/15 text-sm font-black text-rose-200">{index+1}</span>
                <span className="min-w-0 flex-1"><b className="block text-sm">{a.title}</b><span className="mt-1 block text-xs text-white/55">{a.description}</span></span>
                <FaArrowRight className="shrink-0 text-white/55"/>
              </Link>)}</div>}
          </section>
          <section className={card} aria-labelledby="website-health">
            <h2 id="website-health" className="text-lg font-black">Website &amp; tools</h2>
            <div className="mt-5 space-y-4 text-sm">
              <HealthRow label="Public website" status={isLive?'Live':'Not published'} ok={Boolean(isLive)}/>
              <HealthRow label="Booking services" status={pending?'Checking…':summary.activeServices===null?'Unavailable':String(summary.activeServices)+' active'} ok={Boolean(summary.activeServices)}/>
              <HealthRow label="PayPal Business links" status={pending?'Checking…':summary.activePayPalLinks===null?'Unavailable':String(summary.activePayPalLinks)+' active'} ok={Boolean(summary.activePayPalLinks)}/>
              <HealthRow label="Website plan" status={pending?'Checking…':current?.plan?current.plan.tier+' · '+current.plan.billingStatus:'Unavailable'} ok={current?.plan?.billingStatus==='active'||current?.plan?.tier==='free'}/>
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/50">Website page-view analytics aren't available yet. These figures show operational activity, not visitor traffic or PayPal earnings.</p>
          </section>
        </div>
        <section className="mt-5 grid gap-5 lg:grid-cols-2" aria-label="Recent organization activity">
          <div className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black">Latest new inquiries</h2>
              <Link href={endpoint+'/people'} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-rose-300">Open inbox <FaArrowRight/></Link>
            </div>
            {pending?<p className="mt-3 text-sm text-white/50">Loading…</p>:
            summary.newInquiries===null?<p className="mt-3 text-sm text-amber-200">Inbox unavailable right now.</p>:
            !summary.recentInquiries.length?<p className="mt-3 text-sm text-white/55">No new inquiries in the latest 100.</p>:
            <div className="mt-2 space-y-2">{summary.recentInquiries.map(i=>
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                <span className="text-sm font-semibold">{inquiryTypes[i.purpose]||'Basketball'} inquiry</span>
                <span className="text-right text-xs text-white/50">{shortTime(i.submitted_at)}</span>
              </div>)}</div>}
          </div>
          <div className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black">Next booked sessions</h2>
              <Link href={endpoint+'/appointments'} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-rose-300">Calendar <FaArrowRight/></Link>
            </div>
            {pending?<p className="mt-3 text-sm text-white/50">Loading…</p>:
            summary.upcomingBooked===null?<p className="mt-3 text-sm text-amber-200">Calendar unavailable right now.</p>:
            !summary.nextBooked.length?<p className="mt-3 text-sm text-white/55">No booked sessions among the next 200 times.</p>:
            <div className="mt-2 space-y-2">{summary.nextBooked.map(slot=>
              <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                <span className="text-sm font-semibold">{current?.services?.find(s=>s.id===slot.service_id)?.name||'Session'}</span>
                <span className="text-right text-xs text-white/50">{shortTime(slot.starts_at)}</span>
              </div>)}</div>}
          </div>
        </section>
        <section className="mt-5" aria-label="Website tools">
          <h2 className="mb-3 text-lg font-black">Manage your website</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map(link=><Link href={link.href} key={link.name}
              className="flex min-h-24 items-center gap-3 rounded-2xl border border-white/15 bg-white/[.04] p-4 hover:border-rose-400/40">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-200">{link.icon}</span>
              <span className="min-w-0 flex-1"><b className="block text-sm">{link.name}</b><span className="mt-1 block text-xs text-white/55">{link.description}</span></span>
              <FaArrowRight className="shrink-0 text-white/45"/>
            </Link>)}
          </div>
        </section>
        <p className="mt-5 text-xs leading-5 text-white/45">Bookings and inquiries are RCH activity. PayPal payments, refunds, and account balances remain in each organization's own PayPal Business account.</p>
      </>}
    </Container>
  </main>;
}

function Metric({label,value,hint,href,icon}:{label:string;value:number|null;hint:string;href:string;icon:React.ReactNode}){
  return <Link href={href} className="block rounded-2xl border border-white/15 bg-white/[.055] p-5 hover:border-rose-400/40">
    <div className="flex items-center justify-between text-xs font-bold text-white/65"><span>{label}</span><span className="text-rose-300">{icon}</span></div>
    <div className="mt-3 text-4xl font-black tabular-nums">{value===null?'—':value}</div>
    <div className="mt-3 text-xs text-white/45">{hint}</div>
  </Link>;
}
function HealthRow({label,status,ok}:{label:string;status:string;ok:boolean}){
  return <div className="flex items-center justify-between gap-3">
    <span className="text-white/65">{label}</span>
    <span className={'inline-flex items-center gap-1 text-right text-xs font-bold '+(ok?'text-emerald-300':'text-white/55')}>
      {ok&&<FaCircleCheck/>}{status}
    </span>
  </div>;
}
