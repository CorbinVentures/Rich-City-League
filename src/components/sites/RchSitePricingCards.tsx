'use client';

import Link from 'next/link';
import {useState} from 'react';
import {FaArrowRight,FaCircleCheck} from 'react-icons/fa6';
import {RCH_SITE_ADDONS,RCH_SITE_FOUNDING_OFFER,RCH_SITE_PLAN_TIERS,
  RCH_SITE_PLANS,getRchSitePlanDisplayPrice,type RchSitePlanTier} from '@/lib/rch-sites-plans';

const descriptions:Record<RchSitePlanTier,{subtitle:string;live:string[];planned:string[]}>={
  free:{subtitle:'Make your mark',live:['Branded RCH website and templates','Basic SEO and inquiries','Free booking tools'],planned:['1 page and registration form','2 booking services · 25 bookings/month','1 administrator']},
  amateur:{subtitle:'Build your business',live:['Everything currently available on Free'],planned:['6 pages and 3 staff accounts','15 booking services · 150 bookings/month','5 registration forms and client tools','Local SEO and marketing','Media gallery and team rosters']},
  professional:{subtitle:'Run your organization',live:['Everything currently available on Free'],planned:['20 pages and 10 staff accounts','60 booking services · 600 bookings/month','Advanced registration and client tools','Custom domain and advanced SEO','Tournament brackets and marketing automation']},
};

export function RchSitePricingCards(){
  const [interval,setInterval]=useState<'monthly'|'annual'>('monthly');
  return <>
    <div className="mt-6 inline-flex gap-1 rounded-xl border border-white/20 bg-[#071522] p-1" role="group" aria-label="Website subscription billing frequency">
      {(['monthly','annual'] as const).map(value=>
        <button key={value} type="button" aria-pressed={interval===value} onClick={()=>setInterval(value)}
          className={'min-h-11 rounded-lg px-4 text-sm font-black transition '+(interval===value?'bg-sky-400 text-[#071522]':'text-white/65 hover:text-white')}>
          {value==='monthly'?'Monthly':'Yearly · 2 months free'}
        </button>)}
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{RCH_SITE_PLAN_TIERS.map(id=>{
      const plan=RCH_SITE_PLANS[id],detail=descriptions[id],amount=getRchSitePlanDisplayPrice(id,interval);
      return <article key={id} className={'flex min-w-0 flex-col rounded-3xl border p-6 '+(id==='amateur'?'border-sky-400/65 bg-[#10283a]':'border-white/15 bg-[#0b1723]')}>
        <p className="text-xs font-black uppercase tracking-[.17em] text-sky-300">{plan.name}</p>
        <h3 className="mt-3 font-display text-2xl font-black uppercase">{detail.subtitle}</h3>
        <p className="mt-5 font-display text-4xl font-black">{'$'}{amount}<span className="ml-1 text-sm font-normal text-white/65">/{interval==='monthly'?'month':'year'}</span></p>
        {id!=='free'&&<p className="mt-1 text-xs text-white/55">{interval==='annual'?'Equivalent to $'+(amount/12).toFixed(2)+'/month, billed annually':'Yearly option available'}</p>}
        <div className="mt-6 flex-1 space-y-5">
          <section><p className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-300">Available now</p>
            <ul className="space-y-2">{detail.live.map(item=><li key={item} className="flex gap-2 text-sm leading-6 text-white/80"><FaCircleCheck aria-hidden="true" className="mt-1 shrink-0 text-emerald-300"/>{item}</li>)}</ul>
          </section>
          <section><p className="mb-3 text-xs font-black uppercase tracking-widest text-white/50">Planned for this level</p>
            <ul className="space-y-2">{detail.planned.map(item=><li key={item} className="flex gap-2 text-sm leading-6 text-white/65"><FaCircleCheck aria-hidden="true" className="mt-1 shrink-0 text-sky-300"/>{item}</li>)}</ul>
          </section>
        </div>
        <Link href={'/website-creator/start?tier='+id+'&billing='+interval}
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-[#071522]">
          Get Started <FaArrowRight aria-hidden="true"/>
        </Link>
        <p className="mt-3 text-xs leading-5 text-white/55">
          {id==='free'?'Free to start; verify your organization before publishing.':'Price announced, not charged. Save your preference; start designing on Free.'}
        </p>
      </article>;
    })}</div>
    <div className="mt-7 rounded-2xl border border-sky-400/25 bg-sky-400/[.06] p-5">
      <h3 className="font-display text-xl font-black uppercase">Founding organizations</h3>
      <p className="mt-2 text-sm leading-7 text-white/70">
        Proposed first {RCH_SITE_FOUNDING_OFFER.maximumOrganizations} paying organizations: {'$'}{RCH_SITE_PLANS.amateur.proposedFoundingMonthlyUsd}/month Amateur or {'$'}{RCH_SITE_PLANS.professional.proposedFoundingMonthlyUsd}/month Professional for {RCH_SITE_FOUNDING_OFFER.discountedMonths} months, then standard renewal rates with advance notice. Enrollment is not open and a preferred tier does not reserve this rate.
      </p>
    </div>
    <section className="mt-8">
      <h3 className="font-display text-xl font-black uppercase">Optional growth services</h3>
      <p className="mt-2 text-sm text-white/60">Potential future add-ons—not available to purchase or automatically added.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {RCH_SITE_ADDONS.map(addon=><div key={addon.id} className="rounded-xl border border-white/15 bg-white/[.03] px-4 py-3">
          <p className="text-sm font-semibold">{addon.name}</p>
          <p className="mt-1 text-xs text-white/60">
            {'$'}{addon.priceUsd}{'maximumPriceUsd' in addon?'–$'+addon.maximumPriceUsd:''}
            {addon.unit==='one_time'?' once':addon.unit==='seat_monthly'?'/extra seat/month':'/month'}
          </p>
        </div>)}
      </div>
      <p className="mt-3 text-xs leading-6 text-white/50">Sponsored Discover placements will be labeled; SEO cannot guarantee rankings. Organizations receive customer payments through their own PayPal Business links; RCH adds no platform percentage to those payments.</p>
    </section>
  </>;
}
