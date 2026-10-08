'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { FaArrowRight, FaCheck, FaCopy, FaCrown, FaShareNodes, FaTrophy, FaUsers } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type ReferralStats = {
  code:string;
  qualified_referrals:number;
  rep_earned:number;
  weekly_referrals:number;
  next_milestone:number|null;
  next_milestone_name:string|null;
  next_milestone_remaining:number;
  rcl_plus_until:string|null;
};

type Milestone = {
  threshold:number;
  badge_name:string;
  bonus_rep:number;
  rcl_plus_days:number;
  title:string;
  description:string;
};

type Leader = {
  profile_id:string;
  qualified_referrals:number;
  display_name:string|null;
  username:string|null;
  avatar_url:string|null;
};

const fallbackStats:ReferralStats = {
  code:'',
  qualified_referrals:0,
  rep_earned:0,
  weekly_referrals:0,
  next_milestone:1,
  next_milestone_name:'First Assist',
  next_milestone_remaining:1,
  rcl_plus_until:null,
};

export default function ReferralsPage(){
  const {user,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(true),[]);
  const db=supabase as any;
  const [stats,setStats]=useState<ReferralStats>(fallbackStats);
  const [milestones,setMilestones]=useState<Milestone[]>([]);
  const [leaders,setLeaders]=useState<Leader[]>([]);
  const [loading,setLoading]=useState(true);
  const [copied,setCopied]=useState(false);
  const [origin,setOrigin]=useState('https://richcityhoops.com');

  useEffect(()=>{ if(typeof window!=='undefined') setOrigin(window.location.origin); },[]);

  useEffect(()=>{
    if(authLoading) return;
    if(!user||!db){setLoading(false);return;}
    void (async()=>{
      setLoading(true);
      await db.rpc('ensure_referral_code',{target_profile:user.id});
      const weekStart=startOfLocalWeek();
      const [{data:statsRaw},{data:milestonesRaw},{data:weeklyRows}] = await Promise.all([
        db.rpc('referral_stats',{target_profile:user.id}),
        db.from('referral_milestones').select('threshold,badge_name,bonus_rep,rcl_plus_days,title,description').order('threshold'),
        db.from('referral_daily_totals').select('profile_id,qualified_referrals').gte('metric_date',weekStart),
      ]);

      const row=Array.isArray(statsRaw)?statsRaw[0]:statsRaw;
      if(row) setStats({
        code:String(row.code??''),
        qualified_referrals:Number(row.qualified_referrals??0),
        rep_earned:Number(row.rep_earned??0),
        weekly_referrals:Number(row.weekly_referrals??0),
        next_milestone:row.next_milestone==null?null:Number(row.next_milestone),
        next_milestone_name:row.next_milestone_name??null,
        next_milestone_remaining:Number(row.next_milestone_remaining??0),
        rcl_plus_until:row.rcl_plus_until??null,
      });
      setMilestones((milestonesRaw??[]) as Milestone[]);

      const totals=new Map<string,number>();
      for(const item of weeklyRows??[]) totals.set(item.profile_id,(totals.get(item.profile_id)??0)+Number(item.qualified_referrals??0));
      const ranked=[...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
      if(ranked.length){
        const ids=ranked.map(([id])=>id);
        const {data:profiles}=await db.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
        const byId=new Map((profiles??[]).map((profile:any)=>[profile.id,profile]));
        setLeaders(ranked.map(([profile_id,qualified_referrals])=>{
          const profile:any=byId.get(profile_id);
          return {profile_id,qualified_referrals,display_name:profile?.display_name??null,username:profile?.username??null,avatar_url:profile?.avatar_url??null};
        }));
      } else setLeaders([]);
      setLoading(false);
    })();
  },[authLoading,user,db]);

  if(!authLoading&&!user) return <main className="min-h-screen bg-[#F5F8FC] pb-24 text-[#0F2547]"><Container maxWidth="md" className="py-20 text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">Build the City</p><h1 className="mt-3 font-display text-4xl font-black uppercase">Invite + Earn</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 !text-[#334A67]">Sign in to get your personal RCH invite link, earn REP and unlock referral badges.</p><Link href="/auth/sign-in?next=/referrals" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wider text-white">Sign in <FaArrowRight/></Link></Container></main>;

  const invite=stats.code?origin+'/join/'+encodeURIComponent(stats.code):'';
  const shareText='I’m on Rich City Hoops 🏀 Join Virginia basketball on RCH — players, coaches, runs, highlights, organizations and more. Use my invite: '+invite;
  const next=stats.next_milestone;
  const progress=next?Math.min(100,Math.round((stats.qualified_referrals/next)*100)):100;
  const accessDate=stats.rcl_plus_until?new Date(stats.rcl_plus_until).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):null;

  async function copyInvite(){
    if(!invite) return;
    await navigator.clipboard.writeText(invite);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),1600);
  }

  async function nativeShare(){
    if(!invite) return;
    if(navigator.share){await navigator.share({title:'Join me on Rich City Hoops',text:shareText,url:invite});return;}
    await copyInvite();
  }

  function textInvite(){
    if(!invite) return;
    window.location.href='sms:?&body='+encodeURIComponent(shareText);
  }

  function socialShare(target:'facebook'|'x'){
    if(!invite) return;
    const url=target==='facebook'
      ? 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(invite)
      : 'https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText);
    window.open(url,'_blank','noopener,noreferrer');
  }

  return <main className="min-h-screen bg-[#F5F8FC] pb-28 text-[#0F2547]">
    <section className="border-b border-[#DDE7F1] bg-[radial-gradient(circle_at_80%_10%,rgba(21,159,255,.16),transparent_35%),linear-gradient(135deg,#FFFFFF,#EEF5FB)]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">Build the City</p><h1 className="mt-3 font-display text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">Bring your people.<br/><span className="!text-[#3B82F6]">Build your REP.</span></h1><p className="mt-5 max-w-2xl text-sm leading-6 !text-[#334A67] sm:text-base">Every active member you bring to RCH earns <strong className="text-[#0F2547]">200 REP</strong>. Stack milestone bonuses, unlock permanent badges and earn RCL+ access as your network grows.</p></div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-[#D9E4EF] bg-white p-3 shadow-[0_16px_50px_rgba(15,37,71,.08)]">
            <Metric value={stats.qualified_referrals} label="Recruited"/>
            <Metric value={stats.weekly_referrals} label="This week"/>
            <Metric value={formatRep(stats.rep_earned)} label="REP earned"/>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8 sm:py-10">
      {loading?<div className="h-64 animate-pulse rounded-3xl border border-[#D9E4EF] bg-white"/>:<div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[#D9E4EF] bg-white p-5 shadow-[0_12px_40px_rgba(15,37,71,.06)] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Your personal invite</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Send one link. Get credit automatically.</h2><p className="mt-2 max-w-xl text-sm leading-6 !text-[#334A67]">A referral becomes qualified after the new member creates an account and participates with a post, comment or Run join. That keeps the leaderboard real.</p></div><span className="w-fit rounded-full bg-[#EAF7FF] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rcl-blue">+200 REP each</span></div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row"><div className="min-w-0 flex-1 truncate rounded-xl border border-[#D9E4EF] bg-[#F7FAFD] px-4 py-3 text-sm font-semibold text-[#4A6079]">{invite||'Preparing your invite link…'}</div><button type="button" onClick={()=>void copyInvite()} disabled={!invite} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"><FaCopy/>{copied?'Copied':'Copy link'}</button></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={textInvite} className="rounded-xl border border-[#D9E4EF] bg-white px-3 py-3 text-xs font-black">Text</button>
              <button type="button" onClick={()=>socialShare('facebook')} className="rounded-xl border border-[#D9E4EF] bg-white px-3 py-3 text-xs font-black">Facebook</button>
              <button type="button" onClick={()=>socialShare('x')} className="rounded-xl border border-[#D9E4EF] bg-white px-3 py-3 text-xs font-black">X</button>
              <button type="button" onClick={()=>void nativeShare()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9E4EF] bg-white px-3 py-3 text-xs font-black"><FaShareNodes/>Share</button>
            </div>
            {invite&&<div className="mt-5 flex flex-col gap-5 rounded-2xl border border-[#DDE7F1] bg-[#F7FAFD] p-5 sm:flex-row sm:items-center">
              <div className="grid h-40 w-40 shrink-0 place-items-center self-center rounded-2xl border border-[#D9E4EF] bg-white p-3 shadow-sm sm:self-auto">
                <QRCode
                  value={invite}
                  size={136}
                  bgColor="#FFFFFF"
                  fgColor="#0F2547"
                  level="M"
                  title="Scan to join Rich City Hoops"
                />
              </div>
              <div>
                <strong className="font-display text-xl uppercase !text-[#0F2547]">Put your invite anywhere</strong>
                <p className="mt-2 text-sm leading-6 !text-[#334A67]">Scan, save or show this QR code in person at runs, gyms, events or team meetings. Every account still has to become active before it counts.</p>
              </div>
            </div>}
          </section>

          <section className="rounded-3xl border border-[#D9E4EF] bg-white p-5 shadow-[0_12px_40px_rgba(15,37,71,.06)] sm:p-7">
            <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Your next unlock</p><h2 className="mt-1 font-display text-2xl font-black uppercase">{next?stats.next_milestone_name:'City Legend reached'}</h2></div>{next&&<b className="text-sm">{stats.qualified_referrals}/{next}</b>}</div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E7EEF6]"><div className="h-full rounded-full bg-rcl-orange transition-all" style={{width:progress+'%'}}/></div>
            <p className="mt-3 text-xs font-semibold !text-[#334A67]">{next?stats.next_milestone_remaining+' more qualified '+(stats.next_milestone_remaining===1?'invite':'invites')+' to unlock the next milestone.':'You reached the top referral milestone.'}</p>
            {accessDate&&<div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300/35 bg-amber-50 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><FaCrown/></span><div><b className="block text-sm">RCL+ earned through {accessDate}</b><small className="!text-[#334A67]">Referral access works like an active RCL+ membership during this period.</small></div></div>}
          </section>

          <section className="rounded-3xl border border-[#D9E4EF] bg-white p-5 shadow-[0_12px_40px_rgba(15,37,71,.06)] sm:p-7">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Milestones</p><h2 className="mt-1 font-display text-2xl font-black uppercase">The Build the City ladder</h2></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{milestones.map((milestone)=>{
              const earned=stats.qualified_referrals>=milestone.threshold;
              const rewards=['200 REP per qualified invite'];
              if(milestone.bonus_rep) rewards.push('+'+milestone.bonus_rep.toLocaleString()+' bonus REP');
              if(milestone.rcl_plus_days) rewards.push(milestone.rcl_plus_days+' days RCL+');
              return <article key={milestone.threshold} className={'rounded-2xl border p-4 '+(earned?'border-emerald-300 bg-emerald-50/70':'border-[#E2EAF2] bg-[#FAFCFE]')}><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-wider !text-[#526780]">{milestone.threshold} recruited</span><h3 className="mt-1 font-display text-lg font-black uppercase">{milestone.badge_name}</h3></div><span className={'grid h-8 w-8 place-items-center rounded-full text-xs '+(earned?'bg-emerald-500 text-white':'bg-[#E7EEF6] !text-[#526780]')}>{earned?<FaCheck/>:milestone.threshold}</span></div><p className="mt-2 text-xs leading-5 !text-[#334A67]">{rewards.join(' · ')}</p></article>;
            })}</div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[#D9E4EF] bg-white p-5 shadow-[0_12px_40px_rgba(15,37,71,.06)]">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Build the City</p><h2 className="mt-1 font-display text-xl font-black uppercase">Weekly leaders</h2></div><FaTrophy className="text-xl text-rcl-orange"/></div>
            {leaders.length?<div className="mt-4 space-y-2">{leaders.map((leader,index)=><Link href={'/social/profile/'+leader.profile_id} key={leader.profile_id} className="flex items-center gap-3 rounded-xl border border-[#E7EEF6] p-3 transition hover:border-rcl-blue/30"><b className="w-5 text-center text-sm !text-[#526780]">{index+1}</b><ProfileAvatarMedia src={leader.avatar_url} alt={leader.display_name||leader.username||'RCH member'} className="h-10 w-10 rounded-full object-cover"/><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{leader.display_name||leader.username||'RCH Member'}</strong><small className="block truncate !text-[#526780]">{leader.username?'@'+leader.username:'Community builder'}</small></span><b className="text-lg text-rcl-blue">{leader.qualified_referrals}</b></Link>)}</div>:<div className="mt-4 rounded-2xl border border-dashed border-[#D9E4EF] bg-[#F7FAFD] p-6 text-center"><FaUsers className="mx-auto text-2xl text-rcl-blue/45"/><b className="mt-3 block text-sm">The first spot is open.</b><p className="mt-1 text-xs leading-5 !text-[#526780]">Be the first member to qualify an invite this week.</p></div>}
            <p className="mt-4 text-[10px] leading-4 !text-[#526780]">Weekly standings reset Monday. Your lifetime recruited count and earned badges never reset.</p>
          </section>

          <section className="rounded-3xl border border-[#D9E4EF] bg-[#0F2547] p-5 text-white shadow-[0_12px_40px_rgba(15,37,71,.12)]">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">How it works</p>
            <div className="mt-4 space-y-4">{[
              ['1','Share your personal link','The invite code stays attached through signup.'],
              ['2','They become active','Their first real post, comment or Run join qualifies the referral.'],
              ['3','You get rewarded','200 REP lands automatically, then milestone bonuses stack on top.'],
            ].map(([step,title,copy])=><div key={step} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-rcl-orange">{step}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-white/75">{copy}</p></div></div>)}</div>
            <Link href="/badges" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">See all RCL badges <FaArrowRight/></Link>
          </section>
        </aside>
      </div>}
    </Container>
  </main>;
}

function Metric({value,label}:{value:string|number;label:string}){
  return <div className="rounded-2xl bg-[#F7FAFD] px-2 py-4 text-center"><b className="block font-display text-2xl font-black">{value}</b><small className="mt-1 block text-[9px] font-black uppercase tracking-wider !text-[#526780]">{label}</small></div>;
}

function formatRep(value:number){
  if(value>=1_000_000)return (value/1_000_000).toFixed(1)+'M';
  if(value>=1000)return (value/1000).toFixed(value>=10_000?0:1)+'K';
  return String(value);
}

function startOfLocalWeek(){
  const date=new Date();
  const diff=(date.getDay()+6)%7;
  date.setDate(date.getDate()-diff);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return year+'-'+month+'-'+day;
}
