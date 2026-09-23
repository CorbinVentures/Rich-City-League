import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowLeft, FaBasketball, FaLocationDot } from 'react-icons/fa6';
import { PublicProfileActions } from '@/components/PublicProfileActions';
import { reputationProgress, reputationStatus } from '@/lib/reputation';

export const revalidate = 30;

export default async function SocialPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getPublicClient();
  if (!client) notFound();
  const { data: profile } = await client.from('profiles').select('id,display_name,username,avatar_url,cover_url,bio,location,role,profile_visibility,created_at,is_vip,vip_label').eq('id', id).eq('is_active', true).maybeSingle() as any;
  if (!profile || profile.profile_visibility === 'private') notFound();
  const [{ data: posts }, { count: followers }, { count: following }, { data: repLevel }, { data: repLedger }] = await Promise.all([
    client.from('posts').select('id,author_id,body,media_urls,created_at').or(`author_id.eq.${id},target_profile_id.eq.${id}`).eq('status', 'published').order('created_at', { ascending: false }).limit(40) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id) as any,
    client.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id) as any,
    client.from('user_levels').select('xp,level').eq('profile_id', id).maybeSingle() as any,
    client.from('xp_transactions').select('id,amount,reason,source_type,created_at').eq('profile_id', id).order('created_at', { ascending: false }).limit(20) as any,
  ]);
  const postRows = (posts ?? []) as Array<{ id:string; author_id:string; body:string; media_urls:string[]; created_at:string }>;
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];
  const { data: authors } = authorIds.length ? await client.from('profiles').select('id,display_name,username,avatar_url').in('id', authorIds) as any : { data: [] };
  const authorMap = new Map((authors ?? []).map((author:any) => [author.id, author]));
  const name = profile.display_name || profile.username || 'RCL Member';
  const rep = repLevel?.xp ?? 0; const socialLevel = repLevel?.level ?? 1; const repLabel = rep >= 1000 ? (rep/1000).toFixed(1)+'K' : String(rep); const repProgress = reputationProgress(rep, socialLevel); const progress = repProgress.percent; const nextLevelXp = repProgress.next; const repStatus = reputationStatus(socialLevel); const repRows = (repLedger ?? []) as Array<{id:string;amount:number;reason:string;source_type:string|null;created_at:string}>;
  return <main className={'rcl-social-profile min-h-screen bg-[#05080d] pb-24 text-white '+(profile.is_vip?'is-vip':'')}>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05080d]/95 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4"><Link href="/social" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-white/70" aria-label="Back to Social"><FaArrowLeft /></Link><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Social</p><p className="text-sm font-black">{name}</p></div></div></header>
    <div className="mx-auto max-w-3xl">
      <section className="relative border-b border-white/10 bg-[#09111a]">
        <div className="h-44 overflow-hidden bg-gradient-to-br from-rcl-navy to-black sm:h-60">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}</div>
        <div className="px-5 pb-6">
          <div className="-mt-14 flex items-end justify-between gap-4"><div className="rcl-profile-rep-ring" style={{'--profile-progress':progress+'%'} as React.CSSProperties}><div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-[#05080d] bg-rcl-orange text-4xl font-black text-black">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : name.slice(0,1).toUpperCase()}</div><em>{socialLevel}</em></div><Link href="/social" className="mb-2 rounded-xl border border-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/70">RCL Social</Link></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><h1 className="font-display text-3xl font-black uppercase">{name}</h1>{profile.is_vip&&<span title="RCL VIP verified member" className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-amber-300"><span className="grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-[8px] text-black">✓</span>{profile.vip_label||'VIP'}</span>}</div>
          {profile.username && <p className="text-sm text-white/35">@{profile.username}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider text-white/35"><span className="rounded-full bg-white/5 px-3 py-1">{profile.role || 'member'}</span>{profile.location && <span className="flex items-center gap-1"><FaLocationDot />{profile.location}</span>}</div>
          {profile.bio && <p className="mt-4 text-sm leading-6 text-white/65">{profile.bio}</p>}<PublicProfileActions profileId={profile.id} profileName={name} />
          <div className={`rcl-profile-status-banner status-${repStatus.key}`}><small>REPUTATION STATUS</small><strong>{repStatus.label}</strong><span>Level {socialLevel} · {repProgress.remaining} REP to Level {socialLevel+1}</span></div><div className="rcl-profile-metrics mt-5"><span><b>{repLabel}</b><small>Reputation</small></span><span><b>{followers ?? 0}</b><small>Followers</small></span><span><b>{following ?? 0}</b><small>Following</small></span></div><div className="rcl-profile-rep-progress"><i style={{width:progress+'%'}}/><small>Level {socialLevel} · reputation progress</small></div>
        </div>
      </section>
      <section className="px-4 pt-5"><div className="rcl-profile-rep-ledger"><div className="rcl-rep-ledger-heading"><div><small>REPUTATION</small><h2>REP Activity</h2></div><span>{nextLevelXp-rep} REP to Level {socialLevel+1}</span></div>{repRows.length ? <div>{repRows.slice(0,6).map((item)=><article key={item.id}><b>+{item.amount}</b><span><strong>{repReasonLabel(item.reason)}</strong><small>{item.source_type || 'RCL activity'} · {new Date(item.created_at).toLocaleDateString()}</small></span></article>)}</div> : <p>Your REP history will appear here as you contribute to RCL.</p>}</div></section><section className="px-4 py-5"><div className="mb-4 flex items-center gap-2"><FaBasketball className="text-rcl-orange"/><h2 className="font-display text-xl font-black uppercase">Timeline</h2></div>
        {postRows.length ? <div className="space-y-4">{postRows.map((post:any)=>{const author:any=authorMap.get(post.author_id); const authorName=author?.display_name||author?.username||'RCL Member'; return <article key={post.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]"><div className="p-5"><Link href={`/social/profile/${post.author_id}`} className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-rcl-orange font-black text-black">{author?.avatar_url?<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>:authorName.slice(0,1).toUpperCase()}</span><span><b className="block text-xs hover:text-rcl-orange">{authorName}</b><small className="text-[9px] text-white/30">{new Date(post.created_at).toLocaleDateString()}</small></span></Link><p className="whitespace-pre-wrap text-sm leading-6 text-white/75">{post.body}</p></div>{post.media_urls?.[0] && <div className="border-t border-white/10 bg-black"><img src={post.media_urls[0]} alt="Post media" className="max-h-[520px] w-full object-cover"/></div>}</article>})}</div> : <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">No timeline posts yet.</div>}
      </section>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080b10]/95 px-4 py-2 backdrop-blur-xl"><div className="mx-auto grid max-w-3xl grid-cols-4 gap-2"><Link href="/social" className="rounded-2xl bg-rcl-orange px-3 py-3 text-center text-[10px] font-black uppercase text-black">⚡ Feed</Link><Link href="/friends" className="rounded-2xl border border-white/10 px-3 py-3 text-center text-[10px] font-black uppercase text-white/50">◉ Discover</Link><Link href="/runs" className="rounded-2xl border border-white/10 px-3 py-3 text-center text-[10px] font-black uppercase text-white/50">🏀 Runs</Link><Link href="/social/highlights" className="rounded-2xl border border-white/10 px-3 py-3 text-center text-[10px] font-black uppercase text-white/50">▶ Highlights</Link></div></nav>
  </main>;
}

function repReasonLabel(reason:string){ return ({quality_content:'Quality content',meaningful_engagement:'Meaningful engagement',community_contribution:'Community contribution',profile_completed:'Profile completed',joined_team:'Joined a team',played_game:'Played a game',won_game:'Won a game',stat_milestone:'Stat milestone',invite_teammate:'Invited a teammate'} as Record<string,string>)[reason] || reason.split('_').join(' '); }
