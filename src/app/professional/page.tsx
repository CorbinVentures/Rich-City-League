'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowTrendUp, FaChartColumn, FaChartLine, FaClock, FaEye, FaHeart, FaPeopleGroup, FaPlus, FaUserPlus } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { Container } from '@/components/Container';
import './professional.css';

type Period = 7 | 30 | 90;
type Totals = {
  impressions:number; reach:number; profile_views:number; reactions:number;
  comments:number; reposts:number; saves:number; new_followers:number; posts_published:number;
};
type Daily = {day:string;impressions:number;interactions:number};
type Hourly = {hour:number;views:number};
type TopPost = {
  id:string;created_at:string;preview:string;format:string;impressions:number;
  reach:number;reactions:number;comments:number;reposts:number;saves:number;interactions:number;
};
type Analytics = {period:number;timezone:string;totals:Totals;daily:Daily[];hours:Hourly[];top_posts:TopPost[]};
const periods:Period[] = [7,30,90];
const numeral = (n:number) => new Intl.NumberFormat('en-US').format(n||0);
const hourLabel = (hour:number) => `${(hour%12)||12} ${hour<12?'AM':'PM'}`;
const safeCount = (n:number|undefined) => Math.max(0,Number(n)||0);

function Metric({label,value,detail,icon:Icon}: {label:string;value:number;detail:string;icon:typeof FaEye}) {
  return <article className="rch-pro-stat">
    <div className="rch-pro-stat-header"><span>{label}</span><Icon aria-hidden="true"/></div>
    <strong>{numeral(value)}</strong><p>{detail}</p>
  </article>;
}

function DailyChart({rows}: {rows:Daily[]}) {
  const peak = Math.max(1,...rows.map(row=>Math.max(row.impressions,row.interactions)));
  const totals = rows.reduce((a,r)=>a+r.impressions,0);
  return <section className="rch-pro-panel" aria-label="Daily views and interactions">
    <div className="rch-pro-panel-head"><div><p className="rch-pro-overline">PERFORMANCE OVER TIME</p><h2>Content activity</h2><span>Recorded impressions and interactions by UTC day</span></div>
      <div className="rch-pro-legend"><span><i className="views"/> Impressions</span><span><i className="interactions"/> Interactions</span></div>
    </div>
    {totals===0 && rows.every(row=>row.interactions===0) ? <div className="rch-pro-empty-chart"><FaChartLine aria-hidden="true"/><p>Performance history will appear as people discover and interact with your posts.</p></div> : null}
    <div className="rch-pro-chart-scroll"><div className="rch-pro-daily-bars" role="img" aria-label={`Content performance chart for ${rows.length} days`} style={{'--count':rows.length} as React.CSSProperties}>
      {rows.map((row,index)=><div key={row.day} className="rch-pro-daily-column" title={`${row.day}: ${row.impressions} impressions, ${row.interactions} interactions`}>
        <span className="rch-pro-bar views" style={{height:`${Math.max(row.impressions?3:0,row.impressions/peak*100)}%`}}/>
        <span className="rch-pro-bar interactions" style={{height:`${Math.max(row.interactions?3:0,row.interactions/peak*100)}%`}}/>
        {(index===0||index===rows.length-1||index%Math.max(1,Math.floor(rows.length/5))===0) && <small>{row.day.slice(5)}</small>}
      </div>)}
    </div></div>
  </section>;
}

function AudienceHours({hours,timezone}: {hours:Hourly[];timezone:string}) {
  const top=Math.max(0,...hours.map(h=>h.views));
  const peak=hours.find(h=>h.views===top&&top>0);
  return <section className="rch-pro-panel" aria-label="Audience active times">
    <div className="rch-pro-panel-head"><div><p className="rch-pro-overline">AUDIENCE BEHAVIOR</p><h2>When your audience engages</h2><span>Hours your content was viewed · {timezone.replaceAll('_',' ')}</span></div><FaClock className="rch-pro-head-icon" aria-hidden="true"/></div>
    <div className="rch-pro-hour-grid" role="img" aria-label="Hourly distribution of recorded signed-in post views">
      {hours.map(h=><div key={h.hour} className="rch-pro-hour" title={`${hourLabel(h.hour)}: ${h.views} observed views`}>
        <div className="rch-pro-hour-rail"><span style={{height:`${top>0?Math.max(h.views?5:0,h.views/top*100):0}%`}}/></div>
        <small>{h.hour%3===0?hourLabel(h.hour).replace(' ',''):''}</small>
      </div>)}
    </div>
    <div className="rch-pro-hour-note">{peak ? <><strong>Most viewed hour: {hourLabel(peak.hour)}</strong><span>Based on {numeral(peak.views)} recorded post views in that hour. This is not a prediction of when followers are online.</span></> : <><strong>Audience patterns are gathering.</strong><span>Hourly insights will appear once signed-in members begin viewing your content.</span></>}</div>
  </section>;
}

function PostPerformance({posts}: {posts:TopPost[]}) {
  return <section className="rch-pro-panel" aria-label="Content insights">
    <div className="rch-pro-panel-head"><div><p className="rch-pro-overline">CONTENT INSIGHTS</p><h2>Top-performing posts</h2><span>Ranked by recorded views, with engagement alongside</span></div><FaChartColumn className="rch-pro-head-icon" aria-hidden="true"/></div>
    {posts.length ? <div className="rch-pro-post-list">
      {posts.map((post,index)=><Link key={post.id} href={`/social/post/${post.id}`} className="rch-pro-post">
        <span className="rch-pro-post-rank">{String(index+1).padStart(2,'0')}</span>
        <span className="rch-pro-post-main"><strong>{post.preview.trim()||`${post.format} post`}</strong><small>{post.format} · {new Date(post.created_at).toLocaleDateString()} · {numeral(post.reach)} accounts reached</small></span>
        <span className="rch-pro-post-metrics"><strong>{numeral(post.impressions)} <small>views</small></strong><span>{numeral(post.interactions)} interactions</span></span>
      </Link>)}
    </div> : <div className="rch-pro-empty-chart"><FaChartColumn aria-hidden="true"/><p>Your published content and its results will show up here. Start with your next post.</p><Link href="/social?compose=1">Create a post →</Link></div>}
  </section>;
}

export default function ProfessionalDashboard() {
  const {user,loading:authLoading}=useAuth();
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [period,setPeriod]=useState<Period>(30);
  const [timezone,setTimezone]=useState('UTC');
  const [data,setData]=useState<Analytics|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);

  useEffect(()=>{
    try {setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC');}
    catch {setTimezone('UTC');}
  },[]);
  useEffect(()=>{
    if(authLoading)return;
    if(!user||!db){setLoading(false);setData(null);return;}
    let active=true;
    setLoading(true);setError('');
    void db.rpc('get_my_professional_analytics',{p_days:period,p_timezone:timezone})
      .then(({data:result,error:requestError}:{data:Analytics|null,error:{message:string}|null})=>{
        if(!active)return;
        if(requestError)throw new Error(requestError.message);
        if(!result?.totals)throw new Error('Analytics are temporarily unavailable.');
        setData(result);
      })
      .catch((err:Error)=>{if(active){setData(null);setError(err.message||'Unable to load analytics.');}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[authLoading,db,user?.id,period,timezone,refresh]);

  const totals=data?.totals;
  const interactions=totals ? totals.reactions+totals.comments+totals.reposts+totals.saves : 0;
  const hasViews=Boolean((totals?.impressions||0)>0);
  return <main className="rch-professional min-h-screen pb-28">
    <Container maxWidth="xl" className="rch-pro-container">
      <nav aria-label="Back to social" className="rch-pro-back"><Link href="/social"><FaArrowLeft aria-hidden="true"/> RCH Pulse</Link></nav>
      <header className="rch-pro-hero">
        <div><p className="rch-pro-overline"><FaChartLine aria-hidden="true"/> RICH CITY HOOPS · PROFESSIONAL TOOLS</p>
          <h1>Professional <span>Dashboard.</span></h1>
          <p>Understand your reach. Learn what resonates. Build your presence on RCH.</p>
          <div className="rch-pro-included"><FaPeopleGroup aria-hidden="true"/> Included for every member · Creator and business friendly</div>
        </div>
        <Link className="rch-pro-create" href="/social?compose=1"><FaPlus aria-hidden="true"/> Create content</Link>
      </header>
      {!authLoading&&!user ? <section className="rch-pro-panel rch-pro-login"><h2>Your insights, in one place.</h2><p>Sign in to view private statistics for your own RCH posts and profile.</p><Link href="/auth/sign-in?redirect=/professional">Sign in</Link></section>
      : <>
        <div className="rch-pro-toolbar"><div><b>Your performance</b><span>Choose your reporting window</span></div><div className="rch-pro-period" aria-label="Reporting period">
          {periods.map(days=><button key={days} type="button" aria-pressed={period===days} onClick={()=>setPeriod(days)}>{days} days</button>)}
        </div></div>
        {loading||authLoading ? <div role="status" className="rch-pro-loading">Loading your professional insights…</div> :
        error ? <section role="alert" className="rch-pro-panel rch-pro-error"><h2>Unable to load your insights</h2><p>{error}</p><button onClick={()=>setRefresh(v=>v+1)}>Try again</button></section>
        : totals&&data ? <>
          <div className="rch-pro-stats">
            <Metric label="Accounts reached" value={safeCount(totals.reach)} detail="Unique signed-in viewers of your posts" icon={FaPeopleGroup}/>
            <Metric label="Post impressions" value={safeCount(totals.impressions)} detail="Observed views, deduplicated per day" icon={FaEye}/>
            <Metric label="Content interactions" value={interactions} detail="Reactions, comments, reposts and saves" icon={FaHeart}/>
            <Metric label="Profile visits" value={safeCount(totals.profile_views)} detail="Tracked signed-in profile visits" icon={FaArrowTrendUp}/>
          </div>
          <div className="rch-pro-secondary">
            <span><FaUserPlus aria-hidden="true"/> <strong>{numeral(totals.new_followers)}</strong> new followers</span>
            <span><FaChartColumn aria-hidden="true"/> <strong>{numeral(totals.posts_published)}</strong> posts published</span>
            <span><FaHeart aria-hidden="true"/> <strong>{numeral(totals.reactions)}</strong> reactions</span>
            <span><FaPeopleGroup aria-hidden="true"/> <strong>{numeral(totals.comments)}</strong> comments</span>
          </div>
          <DailyChart rows={data.daily}/>
          <div className="rch-pro-bottom-grid">
            <AudienceHours hours={data.hours} timezone={data.timezone}/>
            <div className="rch-pro-column">
              <section className="rch-pro-panel rch-pro-insight"><p className="rch-pro-overline">WHAT THE DATA SAYS</p><h2>Your 90-day growth toolkit</h2>
                {hasViews ? <p>{numeral(totals.reach)} unique accounts generated {numeral(totals.impressions)} recorded views during this {period}-day window. Review your top posts and busiest observed viewing hours to guide your next update.</p> : <p>Your dashboard is ready. Views begin accumulating as signed-in members see your posts. Previous untracked impressions cannot be reconstructed.</p>}
                <Link href="/social">Return to your timeline →</Link>
              </section>
              <section className="rch-pro-panel rch-pro-source"><p className="rch-pro-overline">MEASUREMENT NOTES</p><h2>Clear, private analytics</h2><p>Reach counts unique signed-in accounts who viewed your published posts. A viewer contributes at most one impression per post per UTC day. Anonymous views are not measured. Audience hours describe observed views in your local time zone, not every moment your followers are online. Your viewers' identities are never shown.</p></section>
            </div>
          </div>
          <PostPerformance posts={data.top_posts}/>
        </> : null}
      </>}
    </Container>
  </main>;
}
