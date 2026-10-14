'use client';

import {FaBasketball,FaCircleInfo} from 'react-icons/fa6';
import {COACH_LEVELS,COACH_SPECIALTIES,coachMilestones,type CoachIdentityForm} from '@/lib/rch-coach-identity';

export function RCHCoachFields({value,onChange,profileVisibility}:{value:CoachIdentityForm;onChange:(next:CoachIdentityForm)=>void;profileVisibility:string}){
 const change=<K extends keyof CoachIdentityForm>(key:K,next:CoachIdentityForm[K])=>onChange({...value,[key]:next});
 const joined=coachMilestones(value);
 const field='mt-2 h-12 w-full min-w-0 rounded-xl border border-rcl-blue/25 bg-[#071522] px-4 text-sm text-white outline-none focus:border-rcl-blue';
 return <section className="rounded-2xl border border-rcl-blue/25 bg-[#0b2944] p-5 text-white sm:p-7" aria-label="Your RCH coach identity">
  <p className="text-xs font-black uppercase tracking-[.17em] text-[#91ceff]"><FaBasketball className="mr-2 inline"/> RCH Coach Identity</p>
  <h2 className="mt-2 text-2xl font-black tracking-tight">Your coaching background</h2>
  <p className="mt-2 text-sm leading-6 text-[#c9dded]">This is part of your regular RCH profile. Keep your current followers, posts, REP, and profile picture. No official RCL appointment is required to participate.</p>
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
   <label className="text-xs font-bold">Coaching headline
    <input className={field} value={value.headline} maxLength={100} placeholder="Skills coach · Player development" onChange={e=>change('headline',e.target.value)}/>
   </label>
   <label className="text-xs font-bold">Organization or program (optional)
    <input className={field} value={value.organization} maxLength={120} placeholder="Independent coach, school, club…" onChange={e=>change('organization',e.target.value)}/>
   </label>
   <label className="text-xs font-bold">City / region
    <input className={field} value={value.city} maxLength={100} placeholder="Richmond, VA" onChange={e=>change('city',e.target.value)}/>
   </label>
   <label className="text-xs font-bold">Years of coaching
    <input className={field} type="number" min={0} max={65} value={value.years_experience??''} placeholder="Optional" onChange={e=>change('years_experience',e.target.value===''?null:Number(e.target.value))}/>
   </label>
   <label className="text-xs font-bold">Coaching level
    <select className={field} value={value.coaching_level} onChange={e=>change('coaching_level',e.target.value)}>
     <option value="">Choose a level</option>{COACH_LEVELS.map(s=><option key={s} value={s}>{s}</option>)}
    </select>
   </label>
   <label className="text-xs font-bold">Availability
    <select className={field} value={value.availability} onChange={e=>change('availability',e.target.value as CoachIdentityForm['availability'])}>
     <option value="not_listed">Not listed</option><option value="open_to_opportunities">Open to opportunities</option><option value="not_available">Not currently available</option>
    </select>
   </label>
  </div>
  <fieldset className="mt-5"><legend className="mb-3 text-xs font-black uppercase tracking-wider text-[#a7d6ff]">Your coaching specialties · up to 8</legend>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {COACH_SPECIALTIES.map(item=>{
     const checked=value.specialties.includes(item);return <label key={item} className={'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold '+(checked?'border-[#6db7f3] bg-[#20537a]':'border-[#345a7a] bg-[#0b2136]')}>
      <input type="checkbox" className="h-4 w-4 accent-[#67baff]" checked={checked} disabled={!checked&&value.specialties.length>=8} onChange={e=>change('specialties',e.target.checked?[...value.specialties,item]:value.specialties.filter(s=>s!==item))}/>{item}
     </label>;
    })}
   </div>
  </fieldset>
  <div className="mt-5 rounded-xl border border-[#48769a] bg-[#091e32] p-4">
   <label className="flex items-start gap-3">
    <input type="checkbox" className="mt-1 h-5 w-5 accent-[#67baff]" checked={value.published} onChange={e=>change('published',e.target.checked)} />
    <span className="text-sm font-semibold">Let people discover my regular RCH profile in the Coaches Directory
     <small className="mt-1 block text-xs font-normal leading-5 text-[#bcd1e5]">Optional. Your ordinary profile privacy settings still apply. You can turn this off whenever you want.</small></span>
   </label>
   {value.published&&profileVisibility!=='public'&&<p className="mt-3 flex items-start gap-2 text-xs text-amber-200"><FaCircleInfo className="mt-0.5 shrink-0"/> Your profile must also be set to Public to appear in the directory.</p>}
  </div>
  <div className="mt-5"><p className="text-xs font-black uppercase tracking-wider text-[#a6d6ff]">Coaching milestones</p>
   <div className="mt-2 flex flex-wrap gap-2">{joined.map(b=><span key={b.id} title={b.description} className="rounded-full border border-[#497fa6] bg-[#173e5d] px-3 py-2 text-xs font-bold text-[#e4f5ff]">✦ {b.name}</span>)}</div>
   <p className="mt-2 text-xs leading-5 text-[#bbccdc]">Milestones describe participation, not certification. Official coaching badges are awarded separately and cannot be self-assigned.</p>
  </div>
 </section>;
}
