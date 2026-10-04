'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBullhorn, FaCircleCheck } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { NetworkImpression, TrackedNetworkLink } from '@/components/network/NetworkExposure';

type Placement = 'network-home'|'regional-feature'|'event-spotlight'|'social-feed'|'search-feature'|'news-feature'|'community-feature'|'digest'|'media-feature';
type Variant = 'feed'|'inline'|'banner';
type SponsoredOrganization = {
  id:string;
  slug:string;
  name:string;
  short_name:string|null;
  city:string|null;
  region:string;
  is_verified:boolean;
  network_tier:string;
  logo_url:string|null;
  cover_url:string|null;
};
type Promotion = {
  id:string;
  organization_id:string;
  event_id:string|null;
  campaign_id:string|null;
  placement:Placement;
  headline:string|null;
  disclosure_label:string;
  destination_url:string|null;
  target_regions:string[]|null;
  organization:SponsoredOrganization|null;
};

export function NetworkSponsoredPlacement({
  placement,
  surface,
  region,
  variant='inline',
  className='',
}: {
  placement:Placement;
  surface:string;
  region?:string|null;
  variant?:Variant;
  className?:string;
}) {
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const db=supabase as any;
  const [promotion,setPromotion]=useState<Promotion|null>(null);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const now=new Date().toISOString();
      const {data,error}=await db.from('network_promotions')
        .select('id,organization_id,event_id,campaign_id,placement,headline,disclosure_label,destination_url,target_regions,organization:network_organizations!organization_id(id,slug,name,short_name,city,region,is_verified,network_tier,logo_url,cover_url)')
        .eq('placement',placement)
        .eq('status','active')
        .lte('starts_at',now)
        .gt('ends_at',now)
        .order('sort_weight',{ascending:false})
        .order('starts_at',{ascending:false})
        .limit(12);
      if(!active||error)return;
      const eligible=(data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})).filter((row:any)=>{
        const targets=Array.isArray(row.target_regions)?row.target_regions:[];
        if(targets.length===0||targets.includes('statewide'))return true;
        return Boolean(region&&targets.includes(region));
      }) as Promotion[];
      setPromotion(eligible[0]??null);
    };
    void load();
    return()=>{active=false;};
  },[db,placement,region]);

  if(!promotion?.organization)return null;
  const org=promotion.organization;
  const href=promotion.destination_url||`/organizations/${org.slug}`;
  const external=/^https?:\/\//i.test(href);
  const location=org.city||pretty(org.region);

  return <NetworkImpression
    organizationId={promotion.organization_id}
    eventId={promotion.event_id}
    promotionId={promotion.id}
    campaignId={promotion.campaign_id}
    surface={surface}
    className={className}
  >
    <article className={variantClass(variant)}>
      {org.cover_url&&<div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-[.08]" style={{backgroundImage:'url("'+org.cover_url.replaceAll('"','')+'")'}}/>}
      <div className="relative z-[1]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-rcl-orange/30 bg-rcl-orange/[.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] text-rcl-orange"><FaBullhorn/>{promotion.disclosure_label||'Sponsored'}</span>
        <span className="text-[9px] font-black uppercase tracking-[.15em] text-white/25">RCH Sponsor</span>
      </div>
      <div className={`${variant==='banner'?'mt-3 sm:flex sm:items-end sm:justify-between sm:gap-6':'mt-4'}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rcl-blue/20 bg-rcl-blue/10 bg-cover bg-center font-display text-[10px] font-black text-rcl-blue" style={org.logo_url?{backgroundImage:'url("'+org.logo_url.replaceAll('"','')+'")'}:undefined}>{org.logo_url?'':(org.short_name||org.name).slice(0,3).toUpperCase()}</span><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-rcl-blue"><span>{org.name}</span>{org.is_verified&&<FaCircleCheck/>}</div></div>
          <h3 className={`${variant==='feed'?'text-2xl':'text-xl sm:text-2xl'} mt-1 font-display font-black uppercase leading-tight text-white`}>{promotion.headline||`Discover ${org.name}`}</h3>
          <p className="mt-2 text-xs text-white/35">{location} · Paid distribution affects visibility only.</p>
        </div>
        <TrackedNetworkLink
          href={href}
          organizationId={promotion.organization_id}
          eventId={promotion.event_id}
          promotionId={promotion.id}
          campaignId={promotion.campaign_id}
          surface={`${surface}-cta`}
          target={external?'_blank':'_self'}
          rel={external?'noreferrer':undefined}
          className={`${variant==='banner'?'mt-4 sm:mt-0':'mt-4'} inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-[10px] font-black uppercase tracking-wider text-black`}
        >
          Learn more <FaArrowRight/>
        </TrackedNetworkLink>
      </div>
      </div>
    </article>
  </NetworkImpression>;
}

function variantClass(variant:Variant){
  if(variant==='feed')return 'relative overflow-hidden rounded-2xl border border-rcl-orange/25 bg-[linear-gradient(145deg,rgba(59,130,246,.07),rgba(7,17,27,.96))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.18)]';
  if(variant==='banner')return 'relative overflow-hidden rounded-2xl border border-rcl-orange/20 bg-[linear-gradient(120deg,rgba(59,130,246,.07),rgba(7,21,34,.78))] p-4 sm:p-5';
  return 'relative overflow-hidden rounded-2xl border border-rcl-orange/20 bg-[#071522]/70 p-5';
}
function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());}
