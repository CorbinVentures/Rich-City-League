'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaLocationDot,FaMagnifyingGlass,FaMedal,FaPeopleGroup} from 'react-icons/fa6';
import {ProfileAvatarMedia} from '@/components/ProfileAvatarMedia';
import {useAuth} from '@/hooks/useAuth';
import {coachMilestones,type RCHCoachIdentity} from '@/lib/rch-coach-identity';

export type RCHDirectoryCoach=RCHCoachIdentity&{
 profile:{id:string;display_name:string|null;username:string|null;avatar_url:string|null;location:string|null}|null;
};

export function RCHCoachesNetwork({coaches}:{coaches:RCHDirectoryCoach[]}){
 const { user, loading: authLoading } = useAuth();
 const [search,setSearch]=useState('');
 const [level,setLevel]=useState('all');
 const [availability,setAvailability]=useState(false);
 const levels=useMemo(()=>[...new Set(coaches.map(c=>c.coaching_level).filter(Boolean))].sort(),[coaches]);
 const results=useMemo(()=>coaches.filter(coach=>{
  const haystack=[coach.profile?.display_name,coach.profile?.username,coach.headline,coach.organization,coach.city,coach.coaching_level,...coach.specialties].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(search.toLowerCase().trim())&&(level==='all'||coach.coaching_level===level)&&(!availability||coach.availability==='open_to_opportunities');
 }),[coaches,search,level,availability]);
 return <div>
   <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#416c91] bg-[#102941] p-4 sm:flex-row">
    <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-[#537ba0] bg-[#0a2035] px-4">
     <FaMagnifyingGlass className="shrink-0 text-[#9bccf6]" aria-hidden="true"/>
     <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names, cities or specialties" aria-label="Search RCH coaches" className="w-full min-w-0 bg-transparent py-3 text-sm text-white outline-none placeholder:text-[#bed1e3]"/>
    </label>
    <select value={level} onChange={e=>setLevel(e.target.value)} aria-label="Filter coaching level" className="min-h-12 rounded-xl border border-[#537ba0] bg-[#0a2035] px-4 text-sm font-semibold text-white">
     <option value="all">All coaching levels</option>{levels.map(item=><option key={item} value={item}>{item}</option>)}
    </select>
   </div>
   <label className="mb-5 flex items-center gap-2 text-xs font-semibold text-[#d5e7f7]"><input type="checkbox" checked={availability} onChange={e=>setAvailability(e.target.checked)} className="h-4 w-4 accent-[#66b2eb]"/> Open to opportunities only</label>
   <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-[#b8d4e9]">{results.length} coach{results.length===1?'':'es'} to discover</p><p className="text-xs text-[#c2d3e2]">Member identities · Not league staff appointments</p></div>
   {results.length?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {results.map(coach=>{
     const name=coach.profile?.display_name||coach.profile?.username||'RCH coach';
     const milestones=coachMilestones(coach);
     return <Link key={coach.profile_id} href={'/social/profile/'+coach.profile_id+'?tab=coach'} className="group min-w-0 rounded-2xl border border-[#416d95] bg-[linear-gradient(145deg,#143b5b,#081d30)] p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:border-[#92c9f1]">
      <div className="flex items-start gap-3">
       <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-2xl border border-[#5a8ab2] bg-[#1c4b6f]">
        {coach.profile?.avatar_url?<ProfileAvatarMedia src={coach.profile.avatar_url} alt={name} className="h-full w-full object-cover"/>:<FaBasketball size={23} className="text-[#a6d8ff]"/>}
       </span>
       <span className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#9cd2ff]">RCH COACH</span><strong className="mt-1 block truncate text-lg font-extrabold">{name}</strong><small className="mt-1 block text-xs leading-5 text-[#d0e0ed]">{coach.headline||coach.coaching_level||'Basketball coach'}</small></span>
       <FaArrowRight className="mt-1 shrink-0 text-[#a2d0f1] transition group-hover:translate-x-1" aria-hidden="true"/>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#d4e9fa]">
       {coach.city&&<span className="inline-flex items-center gap-1"><FaLocationDot aria-hidden="true"/>{coach.city}</span>}
       {coach.years_experience!==null&&<span>· {coach.years_experience} yr{coach.years_experience===1?'':'s'} coaching (self-reported)</span>}
      </div>
      {coach.organization&&<p className="mt-2 text-xs text-[#b6cde2]">{coach.organization} · Coach-reported affiliation</p>}
      <div className="mt-4 flex flex-wrap gap-2">{coach.specialties.slice(0,3).map(item=><span key={item} className="rounded-full border border-[#437399] bg-[#153c5c] px-2.5 py-1 text-[10px] font-bold text-[#dbf0ff]">{item}</span>)}</div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#365979] pt-3 text-[11px] font-bold text-[#b5d7ef]">
       <span className="inline-flex items-center gap-1"><FaMedal aria-hidden="true"/> {milestones.length} profile milestone{milestones.length===1?'':'s'}</span>
       {coach.availability==='open_to_opportunities'&&<span className="text-[#9fe8cf]">Open to opportunities</span>}
      </div>
     </Link>;
    })}
   </div>:<div className="rounded-2xl border border-dashed border-[#52799b] bg-[#0e2840] p-8 text-center">
    <FaPeopleGroup className="mx-auto text-4xl text-[#8fcaff]" aria-hidden="true"/>
    <h3 className="mt-4 text-xl font-black">{coaches.length?'No coaches match yet.':'Be one of the first coaches on RCH.'}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#c0d6e9]">{coaches.length?'Try a different city, specialty or coaching level.':'It takes a free RCH member profile and a coaching identity. Coaches choose whether to appear in the directory.'}</p>
    <Link href={coaches.length?'/coaches':authLoading?'/coaches':user?'/profile':'/auth/sign-up?next=/profile'} onClick={coaches.length?()=>{setSearch('');setLevel('all');setAvailability(false)}:undefined} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9ad4ff] bg-[#226fa8] px-5 text-sm font-black text-white">{coaches.length?'Clear filters':authLoading?'Checking account…':user?'Manage my coach identity':'Join RCH free'} <FaArrowRight/></Link>
   </div>}
  </div>;
}
