'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaCalendarDays, FaEnvelope, FaMedal, FaNewspaper, FaPersonRunning, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Event={id:string;title:string;time:string;location?:string|null;city?:string|null;slug?:string|null};
type Story={id:string;title:string;slug:string;excerpt:string|null;published_at:string};
type Brief={week_of:string;name:string;events:Event[];community_events:Event[];news:Story[];
 run_checkins:number;earned_rep:number;unlocked_badges:number;level:number|null;xp:number|null;
 sponsor:{headline:string;url:string;label:string}|null};
const dateLabel=(date:string)=>new Date(date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/New_York'});
const safeSponsorUrl=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};

export default function WeeklyHoopsBriefPage(){
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(true),[]);
  const [brief,setBrief]=useState<Brief|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    if(authLoading)return;
    if(!user||!supabase){setLoading(false);return;}
    let cancelled=false;
    (async()=>{
      const {data,error:queryError}=await (supabase.rpc as any)('rch_get_member_weekly_brief');
      if(cancelled)return;
      if(queryError){setError('The Weekly Brief is temporarily unavailable.');setLoading(false);return;}
      setBrief((data??null) as Brief|null);
      setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[authLoading,user,supabase]);

  const sponsorUrl=brief?.sponsor?safeSponsorUrl(brief.sponsor.url):null;

  return <main className="rcl-social-secondary min-h-screen bg-[#050a11] pb-24 text-white">
    <Container maxWidth="lg" className="pt-8 sm:pt-12">
      <Link href="/notifications" className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white">← Back to Activity Center</Link>
      <header className="mt-4 overflow-hidden rounded-3xl border border-rcl-orange/25 bg-gradient-to-br from-[#182c42] via-[#0a1c2e] to-[#100e19] p-6 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">Rich City Hoops • The Weekly Hoops Brief</p>
        <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight sm:text-5xl">Your week in Virginia basketball.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Everything worth knowing. Your courts, the next big events, your milestones and the stories moving Virginia basketball.</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-rcl-orange">{brief?.week_of??'This week'}</p>
      </header>
      {authLoading||loading?<div className="mt-7 space-y-4" role="status">{[1,2,3].map(x=><div key={x} className="h-36 animate-pulse rounded-2xl bg-white/[.06]"/>)}</div>:
        !user?<section className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-8 text-center"><h2 className="text-xl font-bold">Sign in for your weekly recap</h2><p className="mt-3 text-sm text-white/60">Your REP, badges and court progress belong only to your profile.</p><Link href="/auth/sign-in?next=/notifications/weekly" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-rcl-orange px-5 text-sm font-black text-black">Sign in</Link></section>:
        error||!brief?<p role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/[.06] p-5 text-sm text-red-100">{error||'We could not find your weekly basketball summary.'}</p>:
        <div className="mt-8 space-y-7">
          <section aria-label="Your basketball progression">
            <div className="mb-3 flex items-center gap-2"><FaTrophy className="text-rcl-orange"/><h2 className="font-display text-xl font-black uppercase">{brief.name}&apos;s Court Recap</h2></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {label:'Verified runs',value:brief.run_checkins??0,icon:FaPersonRunning},
                {label:'Run REP earned',value:brief.earned_rep??0,icon:FaTrophy},
                {label:'Badges unlocked',value:brief.unlocked_badges??0,icon:FaMedal},
                {label:'Hooper Level',value:brief.level??'—',icon:FaTrophy}
              ].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border border-white/10 bg-[#111d2b] p-4"><Icon className="text-rcl-orange"/><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-white/55">{label}</p></div>)}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4"><p className="text-sm text-white/60">Only verified achievements count. No runs yet? Your first check-in starts the journey.</p><Link href="/runs" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase text-rcl-orange">Explore Runs <FaArrowRight/></Link></div>
          </section>

          <section aria-label="Upcoming basketball">
            <div className="mb-3 flex items-center gap-2"><FaCalendarDays className="text-rcl-orange"/><h2 className="font-display text-xl font-black uppercase">On the Calendar</h2></div>
            {brief.events.length+brief.community_events.length===0?<div className="rounded-2xl border border-white/10 bg-[#101b29] p-6 text-sm text-white/60">No confirmed events scheduled in the next seven days. Check back for new Runs and tournaments.</div>:
              <div className="grid gap-3 sm:grid-cols-2">
                {[...brief.events.map(x=>({...x,kind:'Open Run'})),...brief.community_events.map(x=>({...x,kind:'Community Event'}))].sort((a,b)=>new Date(a.time).getTime()-new Date(b.time).getTime()).slice(0,6).map(x=><Link key={x.kind+x.id} href={x.kind==='Open Run'?'/runs':'/discover'} className="rounded-2xl border border-white/10 bg-[#111d2b] p-5 transition hover:border-rcl-orange/40">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rcl-orange">{x.kind}</span><h3 className="mt-2 font-bold">{x.title}</h3><p className="mt-2 text-xs text-white/50">{dateLabel(x.time)} · {x.location||x.city||'Virginia'}</p>
                </Link>)}
              </div>}
          </section>

          <section aria-label="Basketball news">
            <div className="mb-3 flex items-center gap-2"><FaNewspaper className="text-rcl-orange"/><h2 className="font-display text-xl font-black uppercase">Around the League</h2></div>
            {brief.news.length===0?<div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-white/60">The next wave of verified basketball stories is on the way.</div>:
            <div className="grid gap-3 sm:grid-cols-2">{brief.news.map(story=><Link key={story.id} href={'/news/'+encodeURIComponent(story.slug)} className="rounded-2xl border border-white/10 bg-[#111d2b] p-5 transition hover:border-rcl-blue/60"><p className="text-xs text-white/45">{dateLabel(story.published_at)}</p><h3 className="mt-2 font-bold">{story.title}</h3>{story.excerpt&&<p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">{story.excerpt}</p>}<span className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Read article <FaArrowRight/></span></Link>)}</div>}
          </section>

          {brief.sponsor&&sponsorUrl&&<section aria-label="Sponsored community partner" className="rounded-2xl border border-rcl-orange/25 bg-[#192435] p-6">
            <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">{brief.sponsor.label}</p>
            <h2 className="mt-2 text-xl font-black">{brief.sponsor.headline}</h2>
            <a href={sponsorUrl} rel="sponsored noopener noreferrer" target="_blank" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Explore partner <FaArrowRight/></a>
          </section>}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f1825] p-5">
            <div><p className="font-bold">Want this in your inbox?</p><p className="mt-1 text-sm text-white/55">Subscribe to the optional Monday Weekly Hoops Brief.</p></div>
            <Link href="/settings/notifications" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-orange/40 px-4 text-xs font-black uppercase text-rcl-orange"><FaEnvelope/> Manage email updates</Link>
          </div>
        </div>}
    </Container>
  </main>;
}
