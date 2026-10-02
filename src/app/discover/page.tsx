import Link from 'next/link';
import { Container } from '@/components/Container';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';
import { RCL_MEMBER_NAV_GROUPS } from '@/lib/member-navigation';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowRight, FaBasketball, FaBolt, FaFire, FaLocationDot, FaMagnifyingGlass, FaPeopleGroup } from 'react-icons/fa6';

export const metadata = {
  title: 'Discover RCL',
  description: 'Discover people, communities, runs, trends and basketball activity across RCL.',
};

export const revalidate = 30;

type DiscoverProfile = SocialIdentityAuthor & { id:string; role?:string|null; created_at?:string|null; activity:number };
type Community = { id:string; name:string; slug:string; description:string|null; community_type:string|null; logo_url:string|null };
type Run = { id:string; title:string; game_format:string|null; skill_level:string|null; court_name:string|null; location:string|null; starts_at:string; capacity:number|null; max_players:number|null };
type ActivityPost = { id:string; body:string; author_id:string; created_at:string; is_automated:boolean; automation_type:string|null };

export default async function DiscoverRCLPage(){
  const client = getPublicClient();
  const publicDb:any = client;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString();

  const [{data:profilesRaw},{data:communitiesRaw},{data:runsRaw},{data:recentPostsRaw},{data:officialRaw}] = publicDb ? await Promise.all([
    publicDb.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label,is_system_account,system_account_key,created_at').eq('is_active',true).eq('profile_visibility','public').eq('is_system_account',false).order('created_at',{ascending:false}).limit(50),
    publicDb.from('communities').select('id,name,slug,description,community_type,logo_url').eq('privacy','public').order('created_at',{ascending:false}).limit(6),
    publicDb.from('runs').select('id,title,game_format,skill_level,court_name,location,starts_at,capacity,max_players').eq('status','open').gt('starts_at',now.toISOString()).order('starts_at',{ascending:true}).limit(6),
    publicDb.from('posts').select('id,body,author_id,created_at,is_automated,automation_type').eq('status','published').gte('created_at',weekAgo).order('created_at',{ascending:false}).limit(200),
    publicDb.from('posts').select('id,body,author_id,created_at,is_automated,automation_type').eq('status','published').eq('is_automated',true).order('created_at',{ascending:false}).limit(6),
  ]) : [{data:[]},{data:[]},{data:[]},{data:[]},{data:[]}];

  const profiles = (profilesRaw ?? []) as Array<Omit<DiscoverProfile,'activity'>>;
  const profileIds = profiles.map(profile=>profile.id);
  const {data:levelsRaw} = publicDb && profileIds.length ? await publicDb.from('user_levels').select('profile_id,xp,level').in('profile_id',profileIds) : {data:[]};
  const levelMap = new Map((levelsRaw ?? []).map((row:any)=>[row.profile_id,row]));
  const recentPosts = (recentPostsRaw ?? []) as ActivityPost[];
  const activityMap = new Map<string,number>();
  for(const post of recentPosts){ if(!post.is_automated) activityMap.set(post.author_id,(activityMap.get(post.author_id)??0)+1); }

  const people:DiscoverProfile[] = profiles.map(profile=>{
    const level:any = levelMap.get(profile.id);
    return {...profile,rep:level?.xp ?? 0,level:level?.level ?? 1,activity:activityMap.get(profile.id)??0};
  });
  const rising = [...people].sort((a,b)=>b.activity-a.activity || (b.rep??0)-(a.rep??0)).slice(0,6);
  const topRep = [...people].sort((a,b)=>(b.rep??0)-(a.rep??0) || b.activity-a.activity).slice(0,6);
  const newcomers = [...people].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime()).slice(0,5);
  const communities = (communitiesRaw ?? []) as Community[];
  const runs = (runsRaw ?? []) as Run[];
  const official = (officialRaw ?? []) as ActivityPost[];
  const trends = getTrends(recentPosts.map(post=>post.body));

  return <main className="rcl-social-secondary min-h-screen bg-[#03070d] pb-24 text-white">
    <header className="border-b border-rcl-blue/12 bg-[#071018]/88">
      <Container maxWidth="xl" className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-rcl-blue/65">Discover</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Discover RCL</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">People, runs, communities, league activity and reputation across Richmond basketball.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/search" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-semibold text-[#071018]"><FaMagnifyingGlass/> Search</Link>
          <Link href="/social" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 bg-rcl-blue/[.06] px-4 text-xs font-semibold text-rcl-blue"><FaBolt/> Social</Link>
        </div>
      </Container>
    </header>

    <Container maxWidth="xl" className="py-8 md:py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <div className="space-y-8">
          <section>
            <SectionHeading eyebrow="7-day activity" title="Rising in RCL" detail="Members creating momentum across RCL." />
            {rising.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rising.map((person,index)=><PersonCard key={person.id} person={person} index={index} />)}</div> : <EmptyState copy="Rising members will appear as RCL gets active." />}
          </section>

          <section>
            <SectionHeading eyebrow="Reputation" title="Top REP in the city" detail="Recognition built through activity, contribution and RCL participation." actionHref="/leaderboards" actionLabel="Leaderboards" />
            {topRep.length ? <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/65">{topRep.map((person,index)=><Link key={person.id} href={`/social/profile/${person.id}`} className="flex items-center gap-3 p-4 transition hover:bg-white/[.03]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rcl-blue/25 text-xs font-semibold text-rcl-blue">#{index+1}</span><SocialIdentity author={person} link={false}/><span className="ml-auto hidden text-xs font-semibold uppercase tracking-wider text-white/25 sm:block">{formatRep(person.rep??0)} REP</span></Link>)}</div> : <EmptyState copy="REP leaders will appear as members build activity." />}
          </section>

          <section>
            <SectionHeading eyebrow="Community" title="Find your people" detail="Join groups built around teams, runs, basketball culture and shared interests." actionHref="/communities" actionLabel="All communities" />
            {communities.length ? <div className="grid gap-3 md:grid-cols-2">{communities.map(community=><Link key={community.id} href="/communities" className="group flex min-h-32 items-center gap-4 rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-4 transition hover:border-rcl-blue/45"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-rcl-blue/10 text-xl text-rcl-blue">{community.logo_url?<img src={community.logo_url} alt="" className="h-full w-full object-cover"/>:<FaPeopleGroup/>}</span><span className="min-w-0 flex-1"><small className="text-xs font-semibold uppercase tracking-[.12em] text-rcl-blue/65">{community.community_type || 'Community'}</small><b className="mt-1 block font-display text-xl">{community.name}</b><span className="mt-1 block line-clamp-2 text-xs leading-5 text-white/40">{community.description || 'Connect with this RCL basketball community.'}</span></span><FaArrowRight className="text-white/20 transition group-hover:text-rcl-blue"/></Link>)}</div> : <EmptyState copy="Public RCL communities will appear here." />}
          </section>

          <section>
            <SectionHeading eyebrow="Get on court" title="Upcoming runs" detail="Turn online connections into real basketball." actionHref="/runs" actionLabel="All runs" />
            {runs.length ? <div className="grid gap-3 md:grid-cols-2">{runs.map(run=><Link href="/runs" key={run.id} className="rounded-2xl border border-rcl-blue/15 bg-rcl-blue/[.025] p-5 transition hover:border-rcl-blue/40"><div className="flex items-start justify-between gap-4"><div><small className="text-xs font-semibold uppercase tracking-[.12em] text-rcl-blue/65">{run.game_format || 'RCL Run'} · {run.skill_level || 'Open'}</small><h3 className="mt-2 font-display text-2xl font-semibold">{run.title}</h3></div><FaBasketball className="text-2xl text-rcl-blue/60"/></div><div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-white/40"><span>{formatDate(run.starts_at)}</span>{(run.court_name||run.location)&&<span className="inline-flex items-center gap-1"><FaLocationDot/>{run.court_name||run.location}</span>}<span>{run.capacity ?? 0}/{run.max_players ?? '—'} joined</span></div></Link>)}</div> : <EmptyState copy="Open pickup runs will appear here when they are scheduled." />}
          </section>
        </div>

        <aside className="space-y-5">
          <SideCard title="Trending in the 804" icon={<FaFire/>}>
            {trends.length ? <div className="space-y-1">{trends.map((trend,index)=><Link key={trend.tag} href="/social" className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-white/[.04]"><span><small className="mr-2 text-white/20">0{index+1}</small><b className="text-sm">#{trend.tag}</b></span><span className="text-xs text-white/25">{trend.count} posts</span></Link>)}</div> : <p className="text-sm leading-6 text-white/35">Hashtags will surface here as the city starts talking.</p>}
          </SideCard>

          <SideCard title="Official activity" icon={<FaBasketball/>}>
            {official.length ? <div className="space-y-3">{official.slice(0,5).map(post=><Link key={post.id} href={`/social?post=${post.id}`} className="block rounded-xl border border-rcl-blue/10 bg-rcl-blue/[.025] p-3 transition hover:border-rcl-blue/35"><small className="font-semibold uppercase tracking-[.12em] text-rcl-blue">{formatAutomation(post.automation_type)}</small><p className="mt-2 line-clamp-3 text-xs leading-5 text-white/50">{cleanActivity(post.body)}</p></Link>)}</div> : <p className="text-sm leading-6 text-white/35">GameDay, REP and other official RCL moments will surface here.</p>}
          </SideCard>

          <SideCard title="New to RCL" icon={<FaPeopleGroup/>}>
            <div className="space-y-2">{newcomers.map(person=><Link key={person.id} href={`/social/profile/${person.id}`} className="block rounded-xl px-2 py-2 transition hover:bg-white/[.04]"><SocialIdentity author={person} link={false}/></Link>)}</div>
          </SideCard>
        </aside>
      </div>

      <section className="mt-12 border-t border-white/10 pt-10">
        <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-white/25">More RCL</p><h2 className="mt-2 font-display text-3xl font-semibold">There’s more to RCL</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">League tools and identity features remain available without competing with discovery for the top of the experience.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">{RCL_MEMBER_NAV_GROUPS.map(group=><section key={group.label} className="rounded-2xl border border-rcl-blue/12 bg-[#071522]/45 p-5"><div className="mb-4"><h3 className="font-display text-xl font-semibold">{group.label}</h3><p className="mt-1 text-xs leading-5 text-white/35">{group.description}</p></div><div className="space-y-1">{group.items.slice(0,6).map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/55 transition hover:bg-white/[.035] hover:text-white"><Icon className="text-rcl-blue"/><span>{item.label}</span><FaArrowRight className="ml-auto text-xs text-white/15"/></Link>})}</div></section>)}</div>
      </section>
    </Container>
  </main>;
}

function SectionHeading({eyebrow,title,detail,actionHref,actionLabel}:{eyebrow:string;title:string;detail:string;actionHref?:string;actionLabel?:string}){
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-rcl-blue/60">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{title}</h2><p className="mt-1 text-sm text-white/40">{detail}</p></div>{actionHref&&<Link href={actionHref} className="inline-flex items-center gap-2 text-xs font-semibold text-rcl-blue">{actionLabel}<FaArrowRight/></Link>}</div>;
}

function PersonCard({person,index}:{person:DiscoverProfile;index:number}){
  return <Link href={`/social/profile/${person.id}`} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-4 transition hover:-translate-y-0.5 hover:border-rcl-blue/40"><div className="flex items-start justify-between gap-3"><SocialIdentity author={person} link={false}/><span className="text-xs font-semibold text-rcl-blue">0{index+1}</span></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-semibold uppercase tracking-wider"><span className="text-white/30">{person.role || 'member'}</span><span className="text-rcl-blue">{person.activity} posts · {formatRep(person.rep??0)} REP</span></div></Link>;
}

function SideCard({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){
  return <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/65 p-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-display text-lg font-semibold">{title}</h3><span className="text-rcl-blue">{icon}</span></div>{children}</section>;
}

function EmptyState({copy}:{copy:string}){return <div className="rounded-2xl border border-dashed border-rcl-blue/15 bg-rcl-blue/[.02] p-6 text-sm text-white/35">{copy}</div>}

function getTrends(bodies:string[]){
  const counts = new Map<string,number>();
  for(const body of bodies){ for(const match of body.matchAll(/#([a-z0-9_]{2,30})/gi)){ const tag=match[1].toLowerCase(); counts.set(tag,(counts.get(tag)??0)+1); } }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([tag,count])=>({tag,count}));
}

function formatRep(value:number){ return value>=1000 ? `${(value/1000).toFixed(value>=10000?0:1)}K` : String(value); }
function formatDate(value:string){ return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)); }
function formatAutomation(value:string|null){ return (value || 'RCL update').split('_').join(' '); }
function cleanActivity(value:string){ return value.replace(/#[A-Za-z0-9_]+/g,'').replace(/\n{3,}/g,'\n\n').trim(); }
