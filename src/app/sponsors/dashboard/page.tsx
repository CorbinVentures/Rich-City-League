'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import {
  FaArrowRight, FaBullhorn, FaChartLine, FaCircleCheck, FaClock,
  FaGlobe, FaRectangleAd,
} from 'react-icons/fa6';

type Organization={id:string;name:string;slug:string;organization_type:string;network_tier:string};
type Membership={organization_id:string;member_role:string;organization:Organization};
type Campaign={id:string;organization_id:string;name:string;package:string;objective:string;requested_placement:string;requested_starts_at:string;requested_ends_at:string;status:string;payment_status:string;created_at:string};
type ReachRow={organization_id:string;campaign_id:string|null;impressions:number;organization_views:number;event_views:number;media_views:number;outbound_clicks:number;shares:number;saves:number};

export default function SponsorDashboardPage(){
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [selected,setSelected]=useState('');
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [reach,setReach]=useState<ReachRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!user||!db)return;
    setLoading(true);setError('');
    const {data:membershipRows,error:membershipError}=await db.from('network_organization_members')
      .select('organization_id,member_role,organization:network_organizations!organization_id(id,name,slug,organization_type,network_tier)')
      .eq('profile_id',user.id).eq('status','active');
    if(membershipError){setError(membershipError.message);setLoading(false);return;}
    const normalized=(membershipRows??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})).filter((row:any)=>row.organization) as Membership[];
    setMemberships(normalized);
    const ids=normalized.map(item=>item.organization_id);
    const active=selected&&ids.includes(selected)?selected:(ids[0]??'');
    setSelected(active);
    if(!ids.length){setCampaigns([]);setReach([]);setLoading(false);return;}
    const [campaignResult,reachResult]=await Promise.all([
      db.from('network_campaigns').select('id,organization_id,name,package,objective,requested_placement,requested_starts_at,requested_ends_at,status,payment_status,created_at').in('organization_id',ids).order('created_at',{ascending:false}).limit(100),
      db.from('network_reach_daily_breakdown').select('organization_id,campaign_id,impressions,organization_views,event_views,media_views,outbound_clicks,shares,saves').in('organization_id',ids).not('campaign_id','is',null),
    ]);
    if(campaignResult.error||reachResult.error)setError(campaignResult.error?.message||reachResult.error?.message||'Unable to load sponsorship data.');
    setCampaigns(campaignResult.data??[]);setReach(reachResult.data??[]);setLoading(false);
  },[user,db,selected]);

  useEffect(()=>{if(!authLoading){if(user)void load();else setLoading(false);}},[authLoading,user,load]);

  if(authLoading||loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Loading Sponsor Center…</p></Container></main>;
  if(!user)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="md" className="py-16"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">RCH Sponsor Center</p><h1 className="mt-3 font-display text-5xl font-black uppercase">Sign in to manage sponsorships.</h1><p className="mt-4 text-sm leading-6 text-white/45">Campaigns, creative requests and RCH Reach reporting are tied to a verified organization account.</p><Link href="/auth/sign-in?next=/sponsors/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Sign in <FaArrowRight/></Link></Container></main>;
  if(!memberships.length)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">RCH Sponsor Center</p><h1 className="mt-3 font-display text-5xl font-black uppercase">Connect a business or organization first.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">Once RCH verifies that you manage an organization, the Sponsor Center can create campaigns and report the audience RCH sends your way.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/sponsors/start" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Start sponsorship brief <FaArrowRight/></Link><Link href="/organizations" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-5 text-xs font-black uppercase text-rcl-blue">Find your organization</Link></div></Container></main>;

  const org=memberships.find(item=>item.organization_id===selected)?.organization??memberships[0].organization;
  const orgCampaigns=campaigns.filter(item=>item.organization_id===org.id);
  const orgReach=reach.filter(item=>item.organization_id===org.id);
  const metrics=orgReach.reduce((sum,row)=>({
    reach:sum.reach+(row.impressions||0)+(row.organization_views||0)+(row.event_views||0)+(row.media_views||0),
    clicks:sum.clicks+(row.outbound_clicks||0),
    engagements:sum.engagements+(row.outbound_clicks||0)+(row.shares||0)+(row.saves||0),
  }),{reach:0,clicks:0,engagements:0});
  const live=orgCampaigns.filter(item=>item.status==='active').length;
  const awaiting=orgCampaigns.filter(item=>['pending','approved'].includes(item.status)).length;
  const ctr=metrics.reach?metrics.clicks/metrics.reach*100:0;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_10%,rgba(21,159,255,.13),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Sponsor Center</p><h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-6xl">Sponsorship <span className="text-rcl-blue">dashboard.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Build campaigns, follow approvals and see measurable RCH delivery without mixing sponsorship with competitive basketball outcomes.</p></div><div className="flex flex-wrap gap-2"><Link href="/sponsors/campaigns/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black"><FaBullhorn/> New campaign</Link><Link href="/sponsors" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Inventory <FaArrowRight/></Link></div></div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8">
      {error&&<p className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/30">Sponsor organization</p><b className="mt-1 block font-display text-2xl font-black uppercase">{org.name}</b></div>{memberships.length>1&&<select value={org.id} onChange={e=>setSelected(e.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#071522] px-4 text-sm text-white">{memberships.map(item=><option key={item.organization_id} value={item.organization_id}>{item.organization.name}</option>)}</select>}</div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={<FaGlobe/>} label="Delivered reach" value={metrics.reach} detail="RCH campaign delivery"/>
        <Metric icon={<FaArrowRight/>} label="Outbound clicks" value={metrics.clicks} detail="Tracked destination clicks"/>
        <Metric icon={<FaChartLine/>} label="CTR" value={ctr.toFixed(1)+'%'} detail="Clicks ÷ delivered reach"/>
        <Metric icon={<FaCircleCheck/>} label="Live campaigns" value={live} detail="Currently delivering"/>
        <Metric icon={<FaClock/>} label="In review / ready" value={awaiting} detail="Pending or approved"/>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><FaRectangleAd className="text-rcl-blue"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">Campaign pipeline</p><h2 className="font-display text-3xl font-black uppercase">Your sponsorship activity</h2></div></div><div className="mt-5 space-y-3">{orgCampaigns.length?orgCampaigns.slice(0,12).map(item=><CampaignCard key={item.id} campaign={item}/>):<Empty text="No sponsorship campaigns yet. Start with one clear objective and one placement."/>}</div></div>
        <div className="space-y-5">
          <section className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-blue">Next action</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Build the next campaign.</h2><p className="mt-3 text-sm leading-6 text-white/45">Choose an RCH sponsorship product, target, dates, headline and destination. The campaign remains pending until RCH reviews the inventory and creative.</p><Link href="/sponsors/campaigns/new" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-[#03101a]">Open campaign builder <FaArrowRight/></Link></section>
          <section className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Major relationship</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Need presenting or category rights?</h2><p className="mt-3 text-sm leading-6 text-white/45">Those deals require fit, availability, category-conflict checks and a custom term. Start a sponsorship brief instead of forcing it into a self-service campaign.</p><Link href="/sponsors/start?product=category-exclusive" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Discuss major sponsorship <FaArrowRight/></Link></section>
        </div>
      </section>
    </Container>
  </main>;
}

function CampaignCard({campaign}:{campaign:Campaign}){const starts=new Date(campaign.requested_starts_at);return <article className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="block text-sm text-white/80">{campaign.name}</b><span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-white/30">{campaign.package} · {campaign.requested_placement}</span></div><span className={statusClass(campaign.status)}>{campaign.status}</span></div><div className="mt-3 flex flex-wrap gap-4 text-[10px] text-white/35"><span>{campaign.objective.replaceAll('-',' ')}</span><span>{starts.toLocaleDateString()}</span>{campaign.payment_status!=='not_required'&&<span>{campaign.payment_status.replaceAll('_',' ')}</span>}</div></article>;}
function statusClass(status:string){const tone=status==='active'?'border-emerald-400/25 text-emerald-300':status==='approved'?'border-rcl-blue/25 text-rcl-blue':status==='rejected'||status==='cancelled'?'border-red-400/25 text-red-300':'border-rcl-orange/25 text-rcl-orange';return 'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase '+tone;}
function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:number|string;detail:string}){return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-rcl-blue">{icon}</span><strong className="mt-3 block font-display text-3xl font-black">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[9px] font-black uppercase tracking-[.13em] text-white/40">{label}</span><p className="mt-2 text-[10px] text-white/25">{detail}</p></div>;}
function Empty({text}:{text:string}){return <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">{text}</p>;}
