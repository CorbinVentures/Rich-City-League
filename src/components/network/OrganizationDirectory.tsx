'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { NetworkImpression } from '@/components/network/NetworkExposure';
import {
  NETWORK_ORGANIZATION_TYPES,
  NETWORK_REGIONS,
  networkRegionLabel,
  networkTypeLabel,
} from '@/lib/network-taxonomy';
import { FaArrowRight, FaCircleCheck, FaLocationDot, FaMagnifyingGlass, FaPeopleGroup } from 'react-icons/fa6';

export type DirectoryOrganization = {
  id:string; slug:string; name:string; short_name:string|null; description:string|null;
  organization_type:string; region:string; city:string|null; state:string;
  is_verified:boolean; is_claimed:boolean; network_tier:string; is_featured:boolean;
};

const REGIONS = [{value:'all',label:'All Virginia'},...NETWORK_REGIONS] as const;
const TYPES = [{value:'all',label:'All organization types'},...NETWORK_ORGANIZATION_TYPES] as const;

type Props = { organizations:DirectoryOrganization[]; initialRegion?:string; showRegionLinks?:boolean };

export function OrganizationDirectory({organizations,initialRegion='all',showRegionLinks=true}:Props) {
  const [query,setQuery]=useState('');
  const [region,setRegion]=useState(initialRegion);
  const [type,setType]=useState('all');
  const [ownership,setOwnership]=useState<'all'|'verified'|'claimable'>('all');

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return organizations.filter(org=>{
      const haystack=[org.name,org.short_name,org.description,org.city,org.region,org.organization_type,networkTypeLabel(org.organization_type)].filter(Boolean).join(' ').toLowerCase();
      return (!q||haystack.includes(q))
        && (region==='all'||org.region===region)
        && (type==='all'||org.organization_type===type)
        && (ownership==='all'||(ownership==='verified'?org.is_verified:!org.is_claimed&&org.network_tier!=='flagship'));
    });
  },[organizations,query,region,type,ownership]);

  const surface=initialRegion==='all'?'organization-directory-card':`organization-region-${initialRegion}-card`;

  const unclaimed = organizations.filter(org => !org.is_claimed && org.network_tier !== 'flagship').length;

  return <section>
    {unclaimed > 0 && <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rcl-blue/25 bg-rcl-blue/[.055] p-5">
      <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-rcl-blue">Bring your organization onto RCH</p><h3 className="mt-1 text-lg font-semibold">{unclaimed} listings ready for their organizers</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-white/50">If you know an owner, share their free claim link. Verified representatives can manage profiles and submit upcoming events.</p></div>
      <button type="button" onClick={() => setOwnership('claimable')} className="rounded-xl bg-rcl-blue px-4 py-3 text-xs font-bold text-[#03101a]">Find a claimable listing</button>
    </div>}
    <div className="rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <label className="relative block">
          <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search organizations, clubs, businesses, cities…" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/50"/>
        </label>
        <Filter value={region} onChange={setRegion} label="Region">{REGIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</Filter>
        <Filter value={type} onChange={setType} label="Type">{TYPES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</Filter>
        <Filter value={ownership} onChange={value=>setOwnership(value as typeof ownership)} label="Status"><option value="all">All listings</option><option value="verified">Verified</option><option value="claimable">Available to claim</option></Filter>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-white/35"><b className="text-white/65">{filtered.length}</b> result{filtered.length===1?'':'s'} · {organizations.length} total in this directory</p>
        {(query||region!==initialRegion||type!=='all'||ownership!=='all')&&<button onClick={()=>{setQuery('');setRegion(initialRegion);setType('all');setOwnership('all');}} className="text-[10px] font-black uppercase tracking-wide text-rcl-blue">Clear filters</button>}
      </div>
    </div>

    {showRegionLinks&&<div className="mt-5 flex gap-2 overflow-x-auto pb-2">{NETWORK_REGIONS.map(({value,label})=>{
      const count=organizations.filter(org=>org.region===value).length;
      return <Link key={value} href={`/organizations/region/${value}`} className="shrink-0 rounded-full border border-white/10 bg-white/[.025] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/45 transition hover:border-rcl-blue/35 hover:text-rcl-blue">{label} <span className="ml-1 text-white/25">{count}</span></Link>;
    })}</div>}

    {filtered.length?<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(org=><NetworkImpression key={org.id} organizationId={org.id} surface={surface}><OrganizationCard org={org}/></NetworkImpression>)}</div>:<div className="mt-6 rounded-3xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-7 sm:p-9"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Nothing matched yet</p><h3 className="mt-2 font-display text-3xl font-black uppercase">Know an organization that belongs here?</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Add it to the RCH Network for free. RCH reviews the submission, creates the listing, and an authorized representative can claim it to manage its presence and submit events.</p><Link href="/network/partners/apply?plan=community" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black">Add an organization <FaArrowRight/></Link></div>}
  </section>;
}

function Filter({value,onChange,label,children}:{value:string;onChange:(value:string)=>void;label:string;children:React.ReactNode}) {
  return <label><span className="sr-only">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/10 bg-[#050b12] px-3 text-xs font-black uppercase text-white/70 outline-none focus:border-rcl-blue/50">{children}</select></label>;
}

function OrganizationCard({org}:{org:DirectoryOrganization}) {
  const flagship=org.network_tier==='flagship';
  return <article className={`h-full rounded-2xl border p-5 ${flagship?'border-rcl-orange/30 bg-rcl-orange/[.045]':'border-rcl-blue/15 bg-[#071522]/60'}`}>
    <div className="flex items-start justify-between gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border font-display text-lg font-black ${flagship?'border-rcl-orange/25 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/20 bg-rcl-blue/10 text-rcl-blue'}`}>{(org.short_name||org.name).slice(0,3).toUpperCase()}</span><div className="flex flex-wrap justify-end gap-1.5">{flagship&&<Badge copy="RCL Flagship" orange/>}{org.network_tier==='premier'&&<Badge copy="Premier" orange/>}{org.is_verified&&<Badge copy="Verified"/>}{!org.is_claimed&&!flagship&&<Badge copy="Claimable"/>}</div></div>
    <h3 className="mt-4 font-display text-2xl font-black uppercase">{org.name}</h3>
    <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wide text-white/35"><span className="flex items-center gap-1.5"><FaPeopleGroup/>{networkTypeLabel(org.organization_type)}</span><span className="flex items-center gap-1.5"><FaLocationDot/>{org.city?`${org.city}, ${org.state}`:networkRegionLabel(org.region)}</span></div>
    <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-white/40">{org.description||'Virginia organization connected to the RCH Network.'}</p>
    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/organizations/${org.slug}`} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[10px] font-black uppercase ${flagship?'bg-rcl-orange text-black':'bg-rcl-blue text-[#03101a]'}`}>View page <FaArrowRight/></Link>{!org.is_claimed&&!flagship&&<><Link href={`/organizations/${org.slug}/claim`} className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase text-white/60">Claim free</Link><ClaimInviteButton slug={org.slug} name={org.name}/></>}</div>
  </article>;
}

function Badge({copy,orange=false}:{copy:string;orange?:boolean}) { return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${orange?'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/30 bg-rcl-blue/10 text-rcl-blue'}`}>{!orange&&<FaCircleCheck/>}{copy}</span>; }

// Help members recruit real organization owners without impersonating their pages.
function ClaimInviteButton({ slug, name }: { slug: string; name: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  async function share() {
    const url = new URL(`/organizations/${encodeURIComponent(slug)}/claim`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: `Claim ${name} on Rich City Hoops`, text: `Are you part of ${name}? Your free RCH organization listing is ready to claim.`, url });
        setStatus('idle');
      } else {
        await navigator.clipboard.writeText(url);
        setStatus('copied');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setStatus('error');
    }
  }
  return <button type="button" onClick={() => void share()} className="inline-flex min-h-10 items-center rounded-xl border border-rcl-blue/25 px-3 text-[10px] font-black uppercase text-rcl-blue">{status === 'copied' ? 'Invite copied ✓' : status === 'error' ? 'Retry invite' : 'Invite owner'}</button>;
}
