'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCheck,FaClock,FaLock} from 'react-icons/fa6';
import {basketballToolsFor,RCH_BASKETBALL_TEMPLATES,
  type BasketballToolView} from '@/lib/rch-sites-basketball-tools';
import {type RchSiteType} from '@/lib/rch-site-builder';
import {type RchSitePlanTier} from '@/lib/rch-sites-plans';

type Props={
  siteType:RchSiteType;
  tier:RchSitePlanTier;
  mode:'owner'|'builder'|'starter';
  organizationId?:string;
  paidSubscriptionActive?:boolean;
  limit?:number;
};

function accessText(tool:BasketballToolView,mode:Props['mode']){
  if(tool.access==='available')return mode==='owner'?'Available now':'Available after organization approval';
  if(tool.access==='inactive_subscription')return 'Subscription inactive';
  if(tool.access==='upgrade')return tool.firstPlan+' plan';
  return tool.access==='planned_higher_plan'
    ?'Planned · '+tool.firstPlan
    :'Planned for '+tool.firstPlan+'+';
}

export function RchSitesBasketballTools({siteType,tier,mode,organizationId,paidSubscriptionActive=false,limit=6}:Props){
  const items=basketballToolsFor(siteType,tier,paidSubscriptionActive,limit);
  const template=RCH_BASKETBALL_TEMPLATES[siteType];
  return <section aria-label="Basketball tools by website level" className="rounded-2xl border border-white/15 bg-white/[.04] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300"><FaBasketball aria-hidden="true"/> Basketball tools</p>
        <h2 className="mt-2 text-lg font-black">{template.label} toolkit</h2>
        <p className="mt-1 text-xs leading-5 text-white/60">{template.summary}</p>
      </div>
      <span className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/75">{mode==='owner'?'Website level: ':'Previewing: '}{tier}</span>
    </div>
    <p className="mt-4 text-xs leading-5 text-white/55">
      {mode==='owner'
        ?'Only currently released tools open here. Upcoming basketball modules remain previews and do not change your subscription.'
        :'These are basketball-focused tools for your website. Plan choices during setup do not activate paid tools; planned modules cannot be used yet.'}
    </p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {items.map(item=>{
        const open=mode==='owner'&&item.access==='available'&&Boolean(item.href)&&Boolean(organizationId);
        return <div key={item.id} className="rounded-xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold">{item.name}</h3>
            <span aria-hidden="true" className={item.access==='available'?'shrink-0 text-emerald-300':'shrink-0 text-white/45'}>
              {item.access==='available'?<FaCheck/>:item.access==='inactive_subscription'||item.access==='upgrade'?<FaLock/>:<FaClock/>}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-white/55">{item.description}</p>
          {open&&item.href?
            <Link href={item.href+'?organizationId='+encodeURIComponent(organizationId!)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-black text-sky-300">
              Open tool <FaArrowRight aria-hidden="true"/>
            </Link>:
            <p className="mt-3 text-xs font-bold text-white/65">{accessText(item,mode)}</p>}
        </div>;
      })}
    </div>
    {mode==='owner'&&<Link href={'/network/dashboard/sites/billing'+(organizationId?'?organizationId='+encodeURIComponent(organizationId):'')}
      className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-sky-300">
      View website plans <FaArrowRight aria-hidden="true"/>
    </Link>}
  </section>;
}
