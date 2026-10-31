'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { trackRchConversion } from '@/lib/analytics/conversion';

type Role='player'|'coach'|'fan';
const options: Record<Role,Array<{title:string;detail:string;href:string}>> = {
  player:[
    {title:'Find your next Run',detail:'Discover real court listings and upcoming games.',href:'/runs'},
    {title:'Complete your player identity',detail:'Add your photo, position and location when ready.',href:'/profile'},
    {title:'Meet the community',detail:'Discover the basketball stories around you.',href:'/pulse'},
  ],
  coach:[
    {title:'Explore the coaching network',detail:'Find basketball people and opportunities.',href:'/coaches'},
    {title:'Build your coaching identity',detail:'Update your professional basketball profile.',href:'/profile'},
    {title:'Explore organization tools',detail:'Basketball website subscriptions are optional.',href:'/website-creator'},
  ],
  fan:[
    {title:'Discover your basketball community',detail:'Follow public basketball stories and local players.',href:'/pulse'},
    {title:'Watch highlights',detail:'Explore available RCH TV videos and stories.',href:'/media'},
    {title:'Follow Rich City League',detail:'The pro season is planned for November 2027.',href:'/league'},
  ],
};
export function RCHWelcomeActions({role,originalNext}:{role:Role;originalNext:string}) {
  const {user,loading}=useAuth();
  if(loading) return <p className="mt-8 text-white/70" role="status">Checking your account…</p>;
  if(!user) return <div className="mt-8 rounded-xl border border-white/15 p-6">
    <p className="text-white/75">Confirm your email and sign in to begin your member experience.</p>
    <Link href={'/auth/sign-in?next='+encodeURIComponent('/welcome?role='+role+'&next='+encodeURIComponent(originalNext))} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-rose-600 px-6 font-bold">Sign in and continue</Link>
  </div>;
  return <>
    <p className="mt-5 max-w-2xl text-white/70">You&apos;re part of the game. Choose one useful action now; you can finish the rest of your profile later.</p>
    <div className="mt-8 grid gap-3 md:grid-cols-3">
      {options[role].map((item,index)=><Link key={item.href} href={item.href} onClick={()=>trackRchConversion('first_action_click','welcome')} className={'flex min-h-48 flex-col rounded-2xl border p-6 hover:border-rose-400 '+(index===0?'border-rose-400/70 bg-rose-600/15':'border-white/15 bg-white/[.045]')}>
        <span className="text-xs font-black uppercase text-rose-300">Step {index+1}</span>
        <h2 className="mt-4 text-xl font-black">{item.title}</h2>
        <p className="mt-2 text-sm text-white/70">{item.detail}</p>
        <span className="mt-auto pt-5 text-sm font-black">Get started →</span>
      </Link>)}
    </div>
    <Link href={originalNext} onClick={()=>trackRchConversion('first_action_click','welcome')} className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-white/75 underline underline-offset-4">Continue to my original destination →</Link>
  </>;
}
