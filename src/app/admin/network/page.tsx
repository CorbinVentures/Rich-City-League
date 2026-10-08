'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaBullhorn, FaCalendarCheck, FaChartLine, FaCheck, FaCircleCheck, FaPeopleGroup, FaShieldHalved, FaXmark } from 'react-icons/fa6';

type Inquiry = { id:string; organization_name:string; contact_name:string; contact_email:string; website_url:string|null; region:string; plan_interest:string; goals:string|null; status:string; created_at:string };
type Exposure = { organization_id:string; impressions:number; organization_views:number; event_views:number; outbound_clicks:number; follower_growth:number; shares:number; media_views:number };
type ReviewItem = { id:string; status:string; created_at:string; organization?:{name:string;slug:string}|null; [key:string]:any };

export default function NetworkAdminPage() {
  const {user,profile,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]); const db=supabase as any;
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [busyId,setBusyId]=useState<string|null>(null);
  const [organizations,setOrganizations]=useState<any[]>([]); const [events,setEvents]=useState<any[]>([]); const [promotions,setPromotions]=useState<any[]>([]);
  const [inquiries,setInquiries]=useState<Inquiry[]>([]); const [exposure,setExposure]=useState<Exposure[]>([]);
  const [claims,setClaims]=useState<ReviewItem[]>([]); const [submissions,setSubmissions]=useState<ReviewItem[]>([]); const [campaigns,setCampaigns]=useState<ReviewItem[]>([]);
  const authorized=Boolean(user&&profile?.role==='admin');

  const load=useCallback(async()=>{
    if(!db||!authorized) return; setLoading(true); setError('');
    try {
      const results=await Promise.all([
        db.from('network_organizations').select('id,name,slug,network_tier,is_verified,is_claimed,status').order('featured_rank',{ascending:true,nullsFirst:false}).order('name'),
        db.from('network_events').select('id,slug,title,organization_id,starts_at,status,is_featured').order('starts_at',{ascending:true}).limit(100),
        db.from('network_promotions').select('id,organization_id,event_id,campaign_id,placement,status,starts_at,ends_at').order('starts_at',{ascending:false}).limit(100),
        db.from('network_partner_inquiries').select('id,organization_name,contact_name,contact_email,website_url,region,plan_interest,goals,status,created_at').order('created_at',{ascending:false}),
        db.from('network_exposure_daily').select('organization_id,impressions,organization_views,event_views,outbound_clicks,follower_growth,shares,media_views'),
        db.from('network_organization_claims').select('id,organization_id,claimant_id,role_title,contact_email,proof_url,proof_notes,status,created_at,organization:network_organizations!organization_id(name,slug)').order('created_at',{ascending:false}).limit(50),
        db.from('network_event_submissions').select('id,organization_id,title,event_type,starts_at,external_url,status,created_at,organization:network_organizations!organization_id(name,slug)').order('created_at',{ascending:false}).limit(50),
        db.from('network_campaigns').select('id,organization_id,name,package,objective,requested_placement,destination_url,requested_starts_at,requested_ends_at,status,created_at,organization:network_organizations!organization_id(name,slug)').order('created_at',{ascending:false}).limit(50),
      ]);
      const failed=results.find(result=>result.error); if(failed?.error) throw failed.error;
      const normalize=(rows:any[])=>(rows??[]).map(row=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization}));
      setOrganizations(results[0].data??[]); setEvents(results[1].data??[]); setPromotions(results[2].data??[]); setInquiries(results[3].data??[]); setExposure(results[4].data??[]);
      setClaims(normalize(results[5].data)); setSubmissions(normalize(results[6].data)); setCampaigns(normalize(results[7].data));
    } catch(loadError){ console.error('Unable to load RCL Network admin',loadError); setError(loadError instanceof Error?loadError.message:'Unable to load Network operations.'); }
    finally{setLoading(false);}
  },[authorized,db]);

  useEffect(()=>{if(!authLoading&&authorized)void load();else if(!authLoading)setLoading(false);},[authLoading,authorized,load]);

  async function updateInquiry(id:string,status:string){const {error:updateError}=await db.from('network_partner_inquiries').update({status}).eq('id',id);if(updateError)return setError(updateError.message);setInquiries(current=>current.map(item=>item.id===id?{...item,status}:item));}
  async function review(kind:'claim'|'event'|'campaign',id:string,decision:'approved'|'rejected'){
    setBusyId(id); setError('');
    const config=kind==='claim'?{fn:'review_network_organization_claim',args:{p_claim_id:id,p_decision:decision,p_review_notes:null}}:kind==='event'?{fn:'review_network_event_submission',args:{p_submission_id:id,p_decision:decision,p_review_notes:null}}:{fn:'review_network_campaign',args:{p_campaign_id:id,p_decision:decision,p_review_notes:null}};
    const {error:reviewError}=await db.rpc(config.fn,config.args); setBusyId(null); if(reviewError)return setError(reviewError.message); await load();
  }

  if(authLoading||loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Loading RCL Network operations…</p></Container></main>;
  if(!authorized)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1><Link href="/" className="mt-6 inline-flex text-rcl-blue">Return to RCL</Link></Container></main>;

  const totals=exposure.reduce((sum,row)=>({impressions:sum.impressions+(row.impressions||0),views:sum.views+(row.organization_views||0)+(row.event_views||0),clicks:sum.clicks+(row.outbound_clicks||0),shares:sum.shares+(row.shares||0),media:sum.media+(row.media_views||0)}),{impressions:0,views:0,clicks:0,shares:0,media:0});
  const pendingClaims=claims.filter(x=>x.status==='pending'); const pendingEvents=submissions.filter(x=>x.status==='pending'); const pendingCampaigns=campaigns.filter(x=>x.status==='pending');

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-14">
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Admin</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">RCL Network Operations</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Exposure command center</h1><p className="mt-2 text-sm text-white/45">Verify operators, approve public activity, control sponsored inventory, and measure distribution.</p></div><div className="flex gap-2"><Link href="/network/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/55">Partner view <FaChartLine/></Link><Link href="/network/partners" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Partner product <FaBullhorn/></Link></div></div>
    {error&&<p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Organizations" value={organizations.length} icon={<FaPeopleGroup/>}/><Stat label="Pending claims" value={pendingClaims.length} icon={<FaShieldHalved/>}/><Stat label="Event reviews" value={pendingEvents.length} icon={<FaCalendarCheck/>}/><Stat label="Campaign reviews" value={pendingCampaigns.length} icon={<FaBullhorn/>}/></section>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Impressions" value={totals.impressions}/><Metric label="Page + event views" value={totals.views}/><Metric label="Outbound clicks" value={totals.clicks}/><Metric label="Shares" value={totals.shares}/><Metric label="Media views" value={totals.media}/></section>

    <section className="mt-10 grid gap-5 xl:grid-cols-3">
      <ReviewPanel eyebrow="Identity" title="Organization claims" icon={<FaShieldHalved/>} empty="No pending organization claims.">{pendingClaims.map(item=><ReviewCard key={item.id} title={item.organization?.name||'Organization'} meta={`${item.role_title} · ${item.contact_email}`} detail={item.proof_notes} href={item.proof_url} busy={busyId===item.id} onApprove={()=>void review('claim',item.id,'approved')} onReject={()=>void review('claim',item.id,'rejected')}/>)}</ReviewPanel>
      <ReviewPanel eyebrow="Publishing" title="Event submissions" icon={<FaCalendarCheck/>} empty="No pending event submissions.">{pendingEvents.map(item=><ReviewCard key={item.id} title={item.title} meta={`${item.organization?.name||'Organization'} · ${pretty(item.event_type)} · ${new Date(item.starts_at).toLocaleString()}`} href={item.external_url} busy={busyId===item.id} onApprove={()=>void review('event',item.id,'approved')} onReject={()=>void review('event',item.id,'rejected')}/>)}</ReviewPanel>
      <ReviewPanel eyebrow="Revenue inventory" title="Campaign requests" icon={<FaBullhorn/>} empty="No pending campaigns.">{pendingCampaigns.map(item=><ReviewCard key={item.id} title={item.name} meta={`${item.organization?.name||'Organization'} · ${pretty(item.package)} · ${pretty(item.requested_placement)}`} detail={`${new Date(item.requested_starts_at).toLocaleDateString()} → ${new Date(item.requested_ends_at).toLocaleDateString()}`} href={item.destination_url} busy={busyId===item.id} onApprove={()=>void review('campaign',item.id,'approved')} onReject={()=>void review('campaign',item.id,'rejected')}/>)}</ReviewPanel>
    </section>

    <section className="mt-10"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Acquisition pipeline</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Organization inquiries</h2></div>{inquiries.length?<div className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55"><div className="divide-y divide-white/10">{inquiries.map(item=><article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_.8fr_.7fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-black uppercase">{item.organization_name}</h3><span className="rounded-full border border-rcl-blue/20 px-2 py-1 text-[9px] font-black uppercase text-rcl-blue">{pretty(item.plan_interest)}</span></div><p className="mt-1 text-xs text-white/40">{item.contact_name} · {item.contact_email}</p>{item.goals&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{item.goals}</p>}</div><div className="text-xs text-white/40"><p>{pretty(item.region)}</p><p className="mt-1">{new Date(item.created_at).toLocaleDateString()}</p></div><div>{item.website_url&&<a href={item.website_url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase text-rcl-blue">Open website</a>}</div><select value={item.status} onChange={e=>void updateInquiry(item.id,e.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-[#050b12] px-3 text-xs font-black uppercase text-white"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option></select></article>)}</div></div>:<Empty text="No organization inquiries yet."/>}</section>

    <section className="mt-10 grid gap-5 lg:grid-cols-2"><Inventory title="Organizations" eyebrow="Network inventory">{organizations.map(org=><div key={org.id} className="flex items-center justify-between gap-3 py-3"><span><b className="block text-sm">{org.name}</b><small className="text-white/35">{pretty(org.network_tier)} · {org.is_verified?'Verified':'Unverified'} · {org.is_claimed?'Claimed':'Unclaimed'}</small></span><Link href={`/organizations/${org.slug}`} className="text-xs font-black uppercase text-rcl-blue">View</Link></div>)}</Inventory><Inventory title="Events" eyebrow="Published inventory">{events.slice(0,12).map(event=><div key={event.id} className="flex items-center justify-between gap-3 py-3"><span><b className="block text-sm">{event.title}</b><small className="text-white/35">{new Date(event.starts_at).toLocaleString()} · {event.is_featured?'Featured':'Standard'}</small></span><Link href={`/network/events/${event.slug}`} className="text-xs font-black uppercase text-rcl-blue">View</Link></div>)}{!events.length&&<p className="py-4 text-sm text-white/35">No Network events yet.</p>}</Inventory></section>
  </Container></main>;
}

function ReviewPanel({eyebrow,title,icon,children,empty}:{eyebrow:string;title:string;icon:React.ReactNode;children:React.ReactNode;empty:string}){const has=Array.isArray(children)?children.length>0:Boolean(children);return <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><div className="flex items-center gap-3"><span className="text-rcl-blue">{icon}</span><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-white/30">{eyebrow}</p><h2 className="font-display text-2xl font-black uppercase">{title}</h2></div></div><div className="mt-4 space-y-3">{has?children:<Empty text={empty}/>}</div></section>}
function ReviewCard({title,meta,detail,href,busy,onApprove,onReject}:{title:string;meta:string;detail?:string|null;href?:string|null;busy:boolean;onApprove:()=>void;onReject:()=>void}){return <article className="rounded-xl border border-white/10 bg-black/15 p-4"><h3 className="font-display text-xl font-black uppercase">{title}</h3><p className="mt-1 text-[11px] leading-5 text-white/40">{meta}</p>{detail&&<p className="mt-2 text-xs leading-5 text-white/45">{detail}</p>}{href&&<a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-black uppercase text-rcl-blue">Open reference</a>}<div className="mt-4 flex gap-2"><button disabled={busy} onClick={onApprove} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-400 px-3 text-[10px] font-black uppercase text-black disabled:opacity-50"><FaCheck/> Approve</button><button disabled={busy} onClick={onReject} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-400/25 px-3 text-[10px] font-black uppercase text-red-300 disabled:opacity-50"><FaXmark/> Reject</button></div></article>}
function Inventory({title,eyebrow,children}:{title:string;eyebrow:string;children:React.ReactNode}){return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">{eyebrow}</p><h2 className="mt-2 font-display text-2xl font-black uppercase">{title}</h2><div className="mt-4 divide-y divide-white/10">{children}</div></div>}
function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-rcl-blue">{icon}</span><strong className="mt-3 block font-display text-4xl font-black">{value.toLocaleString()}</strong><span className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</span></div>}
function Metric({label,value}:{label:string;value:number}){return <div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><b className="block text-xl">{value.toLocaleString()}</b><span className="text-[9px] font-black uppercase tracking-wide text-white/30">{label}</span></div>}
function Empty({text}:{text:string}){return <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-white/30">{text}</p>}
function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
