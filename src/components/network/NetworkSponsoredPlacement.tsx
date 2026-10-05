'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBullhorn, FaCircleCheck } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { NetworkImpression, TrackedNetworkLink } from '@/components/network/NetworkExposure';

type Placement = 'network-home'|'regional-feature'|'event-spotlight'|'social-feed'|'search-feature'|'news-feature'|'community-feature'|'digest'|'media-feature';
type Variant = 'feed'|'inline'|'banner'|'strip';
type Theme = 'dark'|'light';
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
  sort_weight:number;
  starts_at:string;
  organization:SponsoredOrganization|null;
};

const DAILY_KEY_PREFIX='rch-ad-frequency';
const SESSION_KEY='rch-ad-session-frequency';
const LAST_ORG_KEY='rch-ad-last-organization';
const defaultCaps:Record<Placement,{daily:number;session:number}>={
  'network-home':{daily:4,session:2},
  'regional-feature':{daily:12,session:8},
  'event-spotlight':{daily:3,session:2},
  'social-feed':{daily:3,session:2},
  'search-feature':{daily:3,session:2},
  'news-feature':{daily:2,session:1},
  'community-feature':{daily:3,session:2},
  'digest':{daily:4,session:2},
  'media-feature':{daily:6,session:3},
};

export function NetworkSponsoredPlacement({
  placement,
  surface,
  region,
  variant='inline',
  theme='dark',
  className='',
  slotKey='default',
  dailyCap,
  sessionCap,
  brandLabel='RCH Sponsor',
  ctaLabel='Learn more',
}: {
  placement:Placement;
  surface:string;
  region?:string|null;
  variant?:Variant;
  theme?:Theme;
  className?:string;
  slotKey?:string;
  dailyCap?:number;
  sessionCap?:number;
  brandLabel?:string;
  ctaLabel?:string;
}) {
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const db=supabase as any;
  const [promotion,setPromotion]=useState<Promotion|null>(null);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      const now=new Date().toISOString();
      const {data,error}=await db.from('network_promotions')
        .select('id,organization_id,event_id,campaign_id,placement,headline,disclosure_label,destination_url,target_regions,sort_weight,starts_at,organization:network_organizations!organization_id(id,slug,name,short_name,city,region,is_verified,network_tier,logo_url,cover_url)')
        .eq('placement',placement)
        .eq('status','active')
        .lte('starts_at',now)
        .gt('ends_at',now)
        .order('sort_weight',{ascending:false})
        .order('starts_at',{ascending:false})
        .limit(24);
      if(!active||error)return;

      const regional=(data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})).filter((row:any)=>{
        const targets=Array.isArray(row.target_regions)?row.target_regions:[];
        if(targets.length===0||targets.includes('statewide'))return true;
        return Boolean(region&&targets.includes(region));
      }) as Promotion[];

      const caps=defaultCaps[placement];
      const maxDaily=dailyCap??caps.daily;
      const maxSession=sessionCap??caps.session;
      const dateKey=new Date().toISOString().slice(0,10);
      const daily=readCounts('local',`${DAILY_KEY_PREFIX}:${dateKey}`);
      const session=readCounts('session',SESSION_KEY);
      const lastOrg=readValue('session',LAST_ORG_KEY);

      const available=regional.filter(item=>{
        const key=deliveryKey(item);
        return (daily[key]??0)<maxDaily&&(session[key]??0)<maxSession;
      });
      if(!available.length){setPromotion(null);return;}

      const lowestDaily=Math.min(...available.map(item=>daily[deliveryKey(item)]??0));
      let pool=available.filter(item=>(daily[deliveryKey(item)]??0)===lowestDaily);
      const alternate=pool.filter(item=>item.organization_id!==lastOrg);
      if(alternate.length)pool=alternate;

      pool.sort((a,b)=>b.sort_weight-a.sort_weight||new Date(b.starts_at).getTime()-new Date(a.starts_at).getTime());
      const seed=`${dateKey}:${placement}:${surface}:${slotKey}`;
      setPromotion(pool[stableHash(seed)%pool.length]??null);
    };
    void load();
    return()=>{active=false;};
  },[dailyCap,db,placement,region,sessionCap,slotKey,surface]);

  const claimFrequency=useCallback(()=>{
    if(!promotion)return;
    const key=deliveryKey(promotion);
    const dateKey=new Date().toISOString().slice(0,10);
    incrementCount('local',`${DAILY_KEY_PREFIX}:${dateKey}`,key);
    incrementCount('session',SESSION_KEY,key);
    writeValue('session',LAST_ORG_KEY,promotion.organization_id);
  },[promotion]);

  if(!promotion?.organization)return null;
  const org=promotion.organization;
  const href=promotion.destination_url||`/organizations/${org.slug}`;
  const external=/^https?:\/\//i.test(href);
  const location=org.city||pretty(org.region);
  const light=theme==='light';

  return <NetworkImpression
    organizationId={promotion.organization_id}
    eventId={promotion.event_id}
    promotionId={promotion.id}
    campaignId={promotion.campaign_id}
    surface={surface}
    className={className}
    onImpression={claimFrequency}
  >
    <article className={variantClass(variant,theme)}>
      {variant!=='strip'&&org.cover_url&&<div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-[.08]" style={{backgroundImage:'url("'+org.cover_url.replaceAll('"','')+'")'}}/>}
      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] ${light?'border-[#F97316]/25 bg-[#F97316]/[.07] text-[#C95608]':'border-rcl-orange/30 bg-rcl-orange/[.08] text-rcl-orange'}`}><FaBullhorn/>{promotion.disclosure_label||'Sponsored'}</span>
          <span className={`text-[9px] font-black uppercase tracking-[.15em] ${light?'text-[#71839A]':'text-white/25'}`}>{brandLabel}</span>
        </div>
        <div className={variant==='strip'?'mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between':variant==='banner'?'mt-3 sm:flex sm:items-end sm:justify-between sm:gap-6':'mt-4'}>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-cover bg-center font-display text-[10px] font-black ${light?'border-[#D9E4EF] bg-[#F1F6FA] text-[#1677B8]':'border-rcl-blue/20 bg-rcl-blue/10 text-rcl-blue'}`} style={org.logo_url?{backgroundImage:'url("'+org.logo_url.replaceAll('"','')+'")'}:undefined}>{org.logo_url?'':(org.short_name||org.name).slice(0,3).toUpperCase()}</span>
              <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wide ${light?'text-[#1677B8]':'text-rcl-blue'}`}><span>{org.name}</span>{org.is_verified&&<FaCircleCheck/>}</div>
            </div>
            <h3 className={`${variant==='feed'?'text-2xl':variant==='strip'?'text-base sm:text-lg':'text-xl sm:text-2xl'} mt-1 font-display font-black uppercase leading-tight ${light?'text-[#0F2547]':'text-white'}`}>{promotion.headline||`Discover ${org.name}`}</h3>
            {variant!=='strip'&&<p className={`mt-2 text-xs ${light?'text-[#71839A]':'text-white/35'}`}>{location} · Paid distribution affects visibility only.</p>}
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
            className={`${variant==='banner'?'mt-4 sm:mt-0':variant==='strip'?'sm:ml-4':'mt-4'} inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider ${light?'bg-[#0F2547] text-white':'bg-rcl-orange text-black'}`}
          >
            {ctaLabel} <FaArrowRight/>
          </TrackedNetworkLink>
        </div>
      </div>
    </article>
  </NetworkImpression>;
}

function deliveryKey(promotion:Promotion){return promotion.campaign_id||promotion.id;}

function readCounts(kind:'local'|'session',key:string):Record<string,number>{
  try{
    const storage=kind==='local'?window.localStorage:window.sessionStorage;
    const parsed=JSON.parse(storage.getItem(key)||'{}');
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch{return{};}
}

function incrementCount(kind:'local'|'session',storageKey:string,itemKey:string){
  try{
    const storage=kind==='local'?window.localStorage:window.sessionStorage;
    const current=readCounts(kind,storageKey);
    current[itemKey]=(current[itemKey]??0)+1;
    storage.setItem(storageKey,JSON.stringify(current));
  }catch{/* Ad delivery must not fail when browser storage is unavailable. */}
}

function readValue(kind:'local'|'session',key:string){
  try{return (kind==='local'?window.localStorage:window.sessionStorage).getItem(key);}catch{return null;}
}

function writeValue(kind:'local'|'session',key:string,value:string){
  try{(kind==='local'?window.localStorage:window.sessionStorage).setItem(key,value);}catch{/* noop */}
}

function stableHash(value:string){
  let hash=2166136261;
  for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

function variantClass(variant:Variant,theme:Theme){
  const light=theme==='light';
  if(variant==='feed')return light
    ? 'relative overflow-hidden rounded-2xl border border-[#D9E4EF] bg-white p-5 shadow-[0_12px_34px_rgba(15,37,71,.08)]'
    : 'relative overflow-hidden rounded-2xl border border-rcl-orange/25 bg-[linear-gradient(145deg,rgba(59,130,246,.07),rgba(7,17,27,.96))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.18)]';
  if(variant==='banner')return light
    ? 'relative overflow-hidden rounded-2xl border border-[#D9E4EF] bg-[#F7FAFD] p-4 sm:p-5'
    : 'relative overflow-hidden rounded-2xl border border-rcl-orange/20 bg-[linear-gradient(120deg,rgba(59,130,246,.07),rgba(7,21,34,.78))] p-4 sm:p-5';
  if(variant==='strip')return light
    ? 'relative overflow-hidden border-t border-[#E7EEF6] bg-[#F7FAFD] px-4 py-3 sm:px-5'
    : 'relative overflow-hidden rounded-2xl border border-rcl-orange/15 bg-[linear-gradient(120deg,rgba(249,115,22,.045),rgba(7,21,34,.72))] px-4 py-3 sm:px-5';
  return light
    ? 'relative overflow-hidden rounded-2xl border border-[#D9E4EF] bg-white p-5 shadow-[0_8px_24px_rgba(15,37,71,.06)]'
    : 'relative overflow-hidden rounded-2xl border border-rcl-orange/20 bg-[#071522]/70 p-5';
}

function pretty(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());}
