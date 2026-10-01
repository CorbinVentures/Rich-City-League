'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaBullhorn, FaCalendarDays, FaChartColumn, FaCircleCheck, FaCirclePause, FaClock, FaGlobe, FaPlay, FaStop } from 'react-icons/fa6';

type Organization={id:string;name:string;slug:string};
type Campaign={
  id:string;organization_id:string;event_id:string|null;name:string;package:string;objective:string;requested_placement:string;
  destination_url:string;headline:string|null;requested_starts_at:string;requested_ends_at:string;requested_budget_cents:number|null;
  target_regions:string[];status:string;created_at:string;organization:Organization|null;
};
type Promotion={
  id:string;organization_id:string;campaign_id:string|null;placement:string;headline:string|null;disclosure_label:string;
  destination_url:string|null;starts_at:string;ends_at:string;target_regions:string[];status:string;sort_weight:number;activated_at:string|null;
};
type Breakdown={campaign_id:string|null;impressions:number;organization_views:number;event_views:number;media_views:number;outbound_clicks:number;shares:number;saves:number;follower_growth:number};
type FormState={placement:string;startsAt:string;endsAt:string;region:string;headline:string;destinationUrl:string;disclosure:string};

const placements=[
  ['network-home','Network Home'],['regional-feature','Regional Feature'],['event-spotlight','Event Spotlight'],['social-feed','Social Feed'],
  ['search-feature','Search'],['news-feature','News'],['community-feature','Communities'],['media-feature','RCL TV'],['digest','RCL Digest'],
] as const;
const regions=[
  ['statewide','Statewide Virginia'],['central-virginia','Central Virginia'],['tri-cities','Tri-Cities'],['hampton-roads','Hampton Roads'],
  ['northern-virginia','Northern Virginia'],['shenandoah','Shenandoah'],['southwest-virginia','Southwest Virginia'],
] as const;
const input='min-h-11 w-full rounded-xl border border-white/10 bg-[#050b12] px-3 text-sm text-white outline-none focus:border-rcl-blue/55';

export default function NetworkCampaignControlPage(){
  const {user,profile,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]); const db=supabase as any;
  const authorized=Boolean(user&&profile?.role==='admin');
  const [campaigns,setCampaigns]=useState<Campaign[]>([]); const [promotions,setPromotions]=useState<Promotion[]>([]); const [breakdown,setBreakdown]=useState<Breakdown[]>([]);
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState<string|null>(null); const [error,setError]=useState(''); const [message,setMessage]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null); const [form,setForm]=useState<FormState|null>(null);

  const load=useCallback(async()=>{
    if(!authorized)return;
    setLoading(true); setError('');
    const [campaignResult,promotionResult,reachResult]=await Promise.all([
      db.from('network_campaigns').select('id,organization_id,event_id,name,package,objective,requested_placement,destination_url,headline,requested_starts_at,requested_ends_at,requested_budget_cents,target_regions,status,created_at,organization:network_organizations!organization_id(id,name,slug)').order('created_at',{ascending:false}).limit(100),
      db.from('network_promotions').select('id,organization_id,campaign_id,placement,headline,disclosure_label,destination_url,starts_at,ends_at,target_regions,status,sort_weight,activated_at').order('starts_at',{ascending:false}).limit(200),
      db.from('network_reach_daily_breakdown').select('campaign_id,impressions,organization_views,event_views,media_views,outbound_clicks,shares,saves,follower_growth').not('campaign_id','is',null),
    ]);
    const failure=[campaignResult,promotionResult,reachResult].find(result=>result.error); if(failure?.error){setError(failure.error.message);setLoading(false);return;}
    setCampaigns((campaignResult.data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})));
    setPromotions(promotionResult.data??[]); setBreakdown(reachResult.data??[]); setLoading(false);
  },[authorized,db]);

  useEffect(()=>{if(!authLoading&&authorized)void load();else if(!authLoading)setLoading(false);},[authLoading,authorized,load]);

  const now=Date.now();
  const live=promotions.filter(p=>p.status==='active'&&new Date(p.starts_at).getTime()<=now&&new Date(p.ends_at).getTime()>now);
  const scheduled=promotions.filter(p=>p.status==='active'&&new Date(p.starts_at).getTime()>now);
  const paused=promotions.filter(p=>p.status==='paused');
  const pending=campaigns.filter(c=>c.status==='pending');
  const approved=campaigns.filter(c=>c.status==='approved');
  const operating=campaigns.filter(c=>['active','paused'].includes(c.status));

  const metrics=new Map<string,{reach:number;clicks:number;engagements:number}>();
  breakdown.forEach(row=>{if(!row.campaign_id)return;const current=metrics.get(row.campaign_id)??{reach:0,clicks:0,engagements:0};current.reach+=(row.impressions||0)+(row.organization_views||0)+(row.event_views||0)+(row.media_views||0);current.clicks+=row.outbound_clicks||0;current.engagements+=(row.outbound_clicks||0)+(row.shares||0)+(row.saves||0)+(row.follower_growth||0);metrics.set(row.campaign_id,current);});

  const configure=(campaign:Campaign)=>{
    setSelectedId(campaign.id);
    setForm({
      placement:campaign.requested_placement,
      startsAt:localDateTime(campaign.requested_starts_at),
      endsAt:localDateTime(campaign.requested_ends_at),
      region:campaign.target_regions?.[0]||'statewide',
      headline:campaign.headline||campaign.name,
      destinationUrl:campaign.destination_url,
      disclosure:'Sponsored',
    });
    setMessage('');setError('');
  };

  const activate=async()=>{
    if(!selectedId||!form)return;
    if(new Date(form.endsAt).getTime()<=new Date(form.startsAt).getTime()){setError('End time must be after start time.');return;}
    setBusy(selectedId);setError('');setMessage('');
    const {error:rpcError}=await db.rpc('activate_network_campaign',{
      p_campaign_id:selectedId,
      p_placement:form.placement,
      p_starts_at:new Date(form.startsAt).toISOString(),
      p_ends_at:new Date(form.endsAt).toISOString(),
      p_target_regions:form.region==='statewide'?['statewide']:[form.region],
      p_headline:form.headline.trim()||null,
      p_destination_url:form.destinationUrl.trim()||null,
      p_disclosure_label:form.disclosure.trim()||'Sponsored',
    });
    setBusy(null);if(rpcError){setError(rpcError.message);return;}
    setMessage('Placement activated. Public delivery will follow the configured dates, surface, region and disclosure.');setSelectedId(null);setForm(null);await load();
  };

  const setDeliveryStatus=async(campaignId:string,status:'active'|'paused'|'completed'|'cancelled')=>{
    setBusy(campaignId);setError('');setMessage('');
    const {error:rpcError}=await db.rpc('set_network_campaign_delivery_status',{p_campaign_id:campaignId,p_status:status});
    setBusy(null);if(rpcError){setError(rpcError.message);return;}
    setMessage(`Campaign ${status}.`);await load();
  };

  if(authLoading||loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Loading campaign inventory…</p></Container></main>;
  if(!authorized)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1><Link href="/" className="mt-5 inline-flex text-rcl-blue">Return to RCL</Link></Container></main>;

  const selected=campaigns.find(c=>c.id===selectedId)||null;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_8%,rgba(44,166,255,.14),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <Link href="/admin/network" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Network operations</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Reach Operations</p><h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-6xl">Campaign <span className="text-rcl-blue">Control.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Approve requests separately from delivery. Schedule disclosed paid inventory across RCL surfaces, pause it instantly, and measure what each campaign produces.</p></div><Link href="/network/dashboard/reach" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue"><FaChartColumn/> Partner Reach view</Link></div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8">
      {error&&<p className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-200">{error}</p>}
      {message&&<p className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-200">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pending review" value={pending.length} icon={<FaClock/>}/><Stat label="Approved / ready" value={approved.length} icon={<FaCircleCheck/>}/><Stat label="Live now" value={live.length} icon={<FaPlay/>}/><Stat label="Scheduled" value={scheduled.length} icon={<FaCalendarDays/>}/><Stat label="Paused" value={paused.length} icon={<FaCirclePause/>}/>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <Panel eyebrow="Ready inventory" title="Approved campaigns" icon={<FaBullhorn/>}>
          {approved.length?approved.map(c=><CampaignCard key={c.id} campaign={c} metrics={metrics.get(c.id)} action={<button onClick={()=>configure(c)} className="rounded-lg bg-rcl-orange px-3 py-2 text-[10px] font-black uppercase text-black">Configure placement</button>}/>):<Empty text="No approved campaigns are waiting for activation."/>}
          {pending.length>0&&<Link href="/admin/network" className="inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">{pending.length} campaign request{pending.length===1?'':'s'} still need review <FaBullhorn/></Link>}
        </Panel>

        <section className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-6">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Placement builder</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Schedule paid distribution</h2>
          {!selected||!form?<Empty text="Choose an approved campaign to set the exact RCL surface, dates, region, headline, destination and disclosure."/>:<div className="mt-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4"><b className="block text-sm">{selected.name}</b><span className="text-xs text-white/35">{selected.organization?.name||'Organization'} · Requested {pretty(selected.requested_placement)}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="RCL surface"><select className={input} value={form.placement} onChange={e=>setForm({...form,placement:e.target.value})}>{placements.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Virginia target"><select className={input} value={form.region} onChange={e=>setForm({...form,region:e.target.value})}>{regions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Starts"><input type="datetime-local" className={input} value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></Field>
              <Field label="Ends"><input type="datetime-local" className={input} value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></Field>
              <div className="sm:col-span-2"><Field label="Sponsored headline"><input className={input} maxLength={180} value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})}/></Field></div>
              <div className="sm:col-span-2"><Field label="Destination URL"><input type="url" className={input} value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})}/></Field></div>
              <Field label="Disclosure"><input className={input} maxLength={60} value={form.disclosure} onChange={e=>setForm({...form,disclosure:e.target.value})}/></Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy===selected.id} onClick={()=>void activate()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black disabled:opacity-50"><FaPlay/>{busy===selected.id?'Activating…':'Activate placement'}</button><button onClick={()=>{setSelectedId(null);setForm(null);}} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/45">Cancel</button></div>
            <p className="mt-4 text-[11px] leading-5 text-white/30">Activation controls visibility only. REP, ratings, rankings, stats, awards, results and selection remain untouched.</p>
          </div>}
        </section>
      </section>

      <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Delivery</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Operating campaigns</h2></div>
        {operating.length?<div className="grid gap-4 lg:grid-cols-2">{operating.map(c=>{const campaignPromos=promotions.filter(p=>p.campaign_id===c.id&&['active','paused'].includes(p.status));return <article key={c.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><CampaignCard campaign={c} metrics={metrics.get(c.id)}/><div className="mt-4 space-y-2">{campaignPromos.map(p=><div key={p.id} className="rounded-xl border border-white/8 bg-black/15 p-3 text-xs"><div className="flex items-center justify-between gap-3"><b>{pretty(p.placement)}</b><span className={`${p.status==='active'?'text-emerald-300':'text-amber-300'} font-black uppercase`}>{deliveryLabel(p,now)}</span></div><p className="mt-1 text-white/30">{new Date(p.starts_at).toLocaleString()} → {new Date(p.ends_at).toLocaleString()}</p><p className="mt-1 text-white/30">{p.target_regions.length?p.target_regions.map(pretty).join(', '):'All Virginia'} · {p.disclosure_label}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{c.status==='active'?<button disabled={busy===c.id} onClick={()=>void setDeliveryStatus(c.id,'paused')} className="ControlButton"><FaCirclePause/> Pause</button>:<button disabled={busy===c.id} onClick={()=>void setDeliveryStatus(c.id,'active')} className="ControlButton"><FaPlay/> Resume</button>}<button disabled={busy===c.id} onClick={()=>void setDeliveryStatus(c.id,'completed')} className="ControlButton"><FaCircleCheck/> Complete</button><button disabled={busy===c.id} onClick={()=>void setDeliveryStatus(c.id,'cancelled')} className="ControlButton danger"><FaStop/> Cancel</button>{c.status==='active'&&<button disabled={busy===c.id} onClick={()=>configure(c)} className="ControlButton"><FaBullhorn/> Add / replace placement</button>}</div></article>})}</div>:<Empty text="No campaigns are operating yet."/>}
      </section>

      <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Inventory map</p><h2 className="mt-2 font-display text-3xl font-black uppercase">RCL paid surfaces</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{placements.map(([value,label])=>{const activeCount=live.filter(p=>p.placement===value).length;const scheduledCount=scheduled.filter(p=>p.placement===value).length;return <div key={value} className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-center justify-between"><b className="text-sm">{label}</b><FaGlobe className="text-rcl-blue"/></div><p className="mt-2 text-xs text-white/35">{activeCount} live · {scheduledCount} scheduled</p></div>})}</div></section>
    </Container>
  </main>;
}

function CampaignCard({campaign,metrics,action}:{campaign:Campaign;metrics?:{reach:number;clicks:number;engagements:number};action?:React.ReactNode}){return <div className="rounded-xl border border-white/8 bg-black/15 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="block text-sm">{campaign.name}</b><span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-white/30">{campaign.organization?.name||'Organization'} · {pretty(campaign.package)} · {pretty(campaign.status)}</span></div>{action}</div><div className="mt-3 grid grid-cols-3 gap-2"><Mini label="Reach" value={metrics?.reach??0}/><Mini label="Clicks" value={metrics?.clicks??0}/><Mini label="Engagements" value={metrics?.engagements??0}/></div><p className="mt-3 text-[11px] text-white/30">Requested: {pretty(campaign.requested_placement)} · {campaign.target_regions?.length?campaign.target_regions.map(pretty).join(', '):'No region preference'}{campaign.requested_budget_cents!=null?` · ${(campaign.requested_budget_cents/100).toLocaleString('en-US',{style:'currency',currency:'USD'})}`:''}</p></div>}
function Panel({eyebrow,title,icon,children}:{eyebrow:string;title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><span className="text-rcl-blue">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/30">{eyebrow}</p><h2 className="font-display text-3xl font-black uppercase">{title}</h2></div></div><div className="mt-5 space-y-3">{children}</div></section>}
function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="text-rcl-blue">{icon}</span><strong className="mt-2 block font-display text-3xl">{value.toLocaleString()}</strong><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">{label}</span></div>}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-lg border border-white/8 bg-white/[.02] p-2 text-center"><b className="block font-display text-lg">{value.toLocaleString()}</b><span className="text-[8px] font-black uppercase tracking-wide text-white/25">{label}</span></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.14em] text-white/40">{label}</span>{children}</label>}
function Empty({text}:{text:string}){return <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">{text}</p>}
function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase());}
function localDateTime(iso:string){const d=new Date(iso);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
function deliveryLabel(p:Promotion,now:number){if(p.status==='paused')return 'Paused';if(new Date(p.starts_at).getTime()>now)return 'Scheduled';if(new Date(p.ends_at).getTime()<=now)return 'Ended';return 'Live';}
