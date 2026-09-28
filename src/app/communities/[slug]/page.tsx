'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaCommentDots, FaPeopleGroup, FaPlus, FaUserGroup } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type Community = { id:string; name:string; slug:string; description:string|null; community_type:string|null; privacy:string; logo_url:string|null; cover_url:string|null; created_by:string };
type CommunityPost = { id:string; community_id:string; author_id:string; body:string; created_at:string; updated_at:string };
type Member = { profile_id:string; role:string; joined_at:string; profile?:SocialIdentityAuthor & {id:string; role?:string|null} };

export default function CommunityDetailPage(){
  const params = useParams<{slug:string}>();
  const slug = params?.slug;
  const { user, loading:authLoading } = useAuth();
  const supabase = useMemo(()=>getSupabaseClient(),[]);
  const [community,setCommunity] = useState<Community|null>(null);
  const [posts,setPosts] = useState<CommunityPost[]>([]);
  const [authors,setAuthors] = useState<Map<string,SocialIdentityAuthor & {id:string}>>(new Map());
  const [members,setMembers] = useState<Member[]>([]);
  const [joined,setJoined] = useState(false);
  const [body,setBody] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');

  const load = useCallback(async()=>{
    if(!supabase || !slug) return;
    setLoading(true); setError('');
    try{
      const {data:communityRaw,error:communityError}=await supabase.from('communities').select('id,name,slug,description,community_type,privacy,logo_url,cover_url,created_by').eq('slug',slug).maybeSingle();
      if(communityError||!communityRaw) throw communityError || new Error('Community not found');
      const nextCommunity=communityRaw as Community;
      setCommunity(nextCommunity);

      const [postResult,myMembership,memberResult]=await Promise.all([
        supabase.from('community_posts').select('id,community_id,author_id,body,created_at,updated_at').eq('community_id',nextCommunity.id).order('created_at',{ascending:false}).limit(100),
        user ? supabase.from('community_members').select('community_id').eq('community_id',nextCommunity.id).eq('profile_id',user.id).maybeSingle() : Promise.resolve({data:null,error:null}),
        user ? supabase.from('community_members').select('profile_id,role,joined_at').eq('community_id',nextCommunity.id).order('joined_at',{ascending:true}).limit(50) : Promise.resolve({data:[],error:null}),
      ]);
      if(postResult.error) throw postResult.error;
      setPosts((postResult.data ?? []) as CommunityPost[]);
      setJoined(Boolean(myMembership.data));

      const memberRows=(memberResult.data ?? []) as Array<{profile_id:string;role:string;joined_at:string}>;
      const identityIds=[...new Set([...(postResult.data ?? []).map((post:any)=>post.author_id),...memberRows.map(row=>row.profile_id)])];
      if(identityIds.length){
        const [profilesResult,levelsResult]=await Promise.all([
          supabase.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label').in('id',identityIds),
          supabase.from('user_levels').select('profile_id,xp,level').in('id',identityIds),
        ]);
        const levels=new Map(((levelsResult.data??[]) as Array<{profile_id:string;xp:number;level:number}>).map(row=>[row.profile_id,row]));
        const identityMap=new Map<string,SocialIdentityAuthor & {id:string}>(((profilesResult.data??[]) as Array<any>).map(profile=>{const rep=levels.get(profile.id);return [profile.id,{...profile,rep:rep?.xp??0,level:rep?.level??1}]}));
        setAuthors(identityMap);
        setMembers(memberRows.map(row=>({...row,profile:identityMap.get(row.profile_id)})));
      } else { setAuthors(new Map()); setMembers([]); }
    }catch(loadError){console.error('Unable to load community',loadError);setError('We could not open this community right now.');}
    finally{setLoading(false);}
  },[supabase,slug,user?.id]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!supabase||!community?.id)return;
    const channel=supabase.channel(`rcl-community-${community.id}`).on('postgres_changes',{event:'*',schema:'public',table:'community_posts',filter:`community_id=eq.${community.id}`},()=>void load()).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[supabase,community?.id,load]);

  const join=async()=>{
    if(!supabase||!user||!community||busy)return;
    setBusy(true);setError('');setMessage('');
    const {error:joinError}=await supabase.from('community_members').insert({community_id:community.id,profile_id:user.id,role:'member'} as never);
    if(joinError&&joinError.code!=='23505')setError('We could not join this community.');
    else{setMessage('You joined the community.');await load();}
    setBusy(false);
  };

  const leave=async()=>{
    if(!supabase||!user||!community||busy)return;
    setBusy(true);setError('');setMessage('');
    const {error:leaveError}=await supabase.from('community_members').delete().eq('community_id',community.id).eq('profile_id',user.id);
    if(leaveError)setError('We could not leave this community.');
    else{setMessage('You left the community.');await load();}
    setBusy(false);
  };

  const publish=async(event:FormEvent)=>{
    event.preventDefault();
    if(!supabase||!user||!community||!joined||!body.trim()||busy)return;
    setBusy(true);setError('');setMessage('');
    const {error:postError}=await supabase.from('community_posts').insert({community_id:community.id,author_id:user.id,body:body.trim()} as never);
    if(postError)setError('Your post was not published.');
    else{setBody('');setMessage('Posted to the community.');await load();}
    setBusy(false);
  };

  if(loading)return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-20"><div className="h-72 animate-pulse rounded-3xl border border-rcl-blue/10 bg-white/[.025]"/></Container></main>;
  if(!community)return <main className="grid min-h-screen place-items-center bg-[#03070d] px-4 text-white"><div className="text-center"><FaPeopleGroup className="mx-auto text-4xl text-rcl-blue/50"/><h1 className="mt-4 font-display text-3xl font-black uppercase">Community unavailable</h1><Link href="/communities" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-orange"><FaArrowLeft/> Back to communities</Link></div></main>;

  const canManage=user?.id===community.created_by || members.some(member=>member.profile_id===user?.id&&member.role==='admin');

  return <main className="min-h-screen bg-[#03070d] pb-28 text-white">
    <section className="relative overflow-hidden border-b border-white/10 bg-[#071522]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_15%,rgba(21,159,255,.2),transparent_32%),radial-gradient(circle_at_15%_65%,rgba(255,79,22,.14),transparent_35%)]"/>
      {community.cover_url&&<img src={community.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30"/>}
      <Container maxWidth="lg" className="relative py-8 sm:py-12">
        <Link href="/communities" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-white/45 hover:text-white"><FaArrowLeft/> Communities</Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4"><span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-rcl-blue/25 bg-rcl-blue/10 text-3xl text-rcl-blue">{community.logo_url?<img src={community.logo_url} alt="" className="h-full w-full object-cover"/>:<FaPeopleGroup/>}</span><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">{community.community_type?.replace(/_/g,' ')||'RCL Community'}</p><h1 className="mt-1 break-words font-display text-4xl font-black uppercase sm:text-5xl">{community.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{community.description||'A space for the RCL basketball community.'}</p></div></div>
          <div className="flex shrink-0 gap-2">{user ? joined ? <button onClick={()=>void leave()} disabled={busy||canManage} title={canManage?'Community admins cannot leave from this screen.':undefined} className="min-h-11 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider text-white/50 disabled:opacity-40">{canManage?'Admin':'Leave'}</button> : <button onClick={()=>void join()} disabled={busy} className="min-h-11 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Join community</button> : <Link href={`/auth/sign-in?redirect=/communities/${community.slug}`} className="inline-flex min-h-11 items-center rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in to join</Link>}</div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider text-white/35"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{community.privacy}</span><span className="rounded-full border border-rcl-blue/20 bg-rcl-blue/5 px-3 py-1.5 text-rcl-blue">{posts.length} posts</span>{joined&&<span className="rounded-full border border-rcl-orange/20 bg-rcl-orange/5 px-3 py-1.5 text-rcl-orange">Member</span>}</div>
      </Container>
    </section>

    <Container maxWidth="lg" className="py-7">
      {error&&<p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</p>}
      {message&&<p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {joined ? <form onSubmit={publish} className="mb-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/65 p-4 sm:p-5"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rcl-orange text-sm font-black text-black">{user?.email?.[0]?.toUpperCase()||'R'}</span><textarea value={body} onChange={event=>setBody(event.target.value)} maxLength={2000} rows={3} placeholder={`Post to ${community.name}…`} className="min-h-24 flex-1 resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none placeholder:text-white/25 focus:border-rcl-blue/45"/></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-white/25">{body.length}/2000</span><button disabled={busy||!body.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"><FaPlus/> Post</button></div></form> : <div className="mb-5 rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-5"><p className="text-sm font-black">Join to post in this community.</p><p className="mt-1 text-xs leading-5 text-white/35">Public community posts remain readable so you can see the conversation first.</p></div>}

          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Community timeline</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Conversation</h2></div><span className="text-xs font-black uppercase tracking-wider text-white/25">Newest first</span></div>
          {posts.length ? <div className="space-y-3">{posts.map(post=>{const author=authors.get(post.author_id);return <article key={post.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><SocialIdentity author={author} /><span className="text-xs text-white/25">{formatTime(post.created_at)}</span></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{post.body}</p><div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-3"><span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/25"><FaCommentDots/> Community post</span>{author?.id&&user&&author.id!==user.id&&<Link href={`/messages?to=${author.id}`} className="ml-auto text-xs font-black uppercase tracking-wider text-rcl-blue">Message <FaArrowRight className="ml-1 inline"/></Link>}</div></article>})}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><FaCommentDots className="mx-auto text-3xl text-rcl-blue/40"/><h3 className="mt-4 font-display text-xl font-black uppercase">Start the conversation</h3><p className="mt-2 text-sm text-white/35">The first community post will appear here.</p></div>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-rcl-orange">Members</p><h3 className="mt-1 font-display text-xl font-black uppercase">The circle</h3></div><FaUserGroup className="text-rcl-blue"/></div>{joined ? <div className="mt-4 space-y-2">{members.slice(0,12).map(member=><div key={member.profile_id} className="rounded-xl bg-black/15 p-2"><SocialIdentity author={member.profile}/><div className="mt-1 flex items-center justify-between"><small className="text-xs font-black uppercase tracking-wider text-white/25">{member.role}</small>{member.profile?.id&&user&&member.profile.id!==user.id&&<Link href={`/messages?to=${member.profile.id}`} className="text-xs font-black uppercase tracking-wider text-rcl-blue">Message</Link>}</div></div>)}{!members.length&&<p className="text-sm text-white/35">Member identities will appear here.</p>}</div> : <p className="mt-3 text-sm leading-6 text-white/35">Join the community to see its member circle.</p>}</section>
          <section className="rounded-2xl border border-rcl-orange/15 bg-rcl-orange/[.035] p-4"><p className="text-xs font-black uppercase tracking-[.16em] text-rcl-orange">Take it further</p><h3 className="mt-2 font-display text-xl font-black uppercase">Turn conversation into basketball</h3><p className="mt-2 text-sm leading-6 text-white/40">Find a run, connect with a member, or bring the conversation back to the main RCL feed.</p><div className="mt-4 space-y-2"><Link href="/runs" className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-white/55">Find a run <FaArrowRight/></Link><Link href="/social" className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-white/55">Network home <FaArrowRight/></Link></div></section>
        </aside>
      </div>
    </Container>
  </main>;
}

function formatTime(value:string){
  const date=new Date(value);const diff=Math.max(0,Date.now()-date.getTime());const mins=Math.floor(diff/60000);if(mins<1)return 'Just now';if(mins<60)return `${mins}m`;const hours=Math.floor(mins/60);if(hours<24)return `${hours}h`;return date.toLocaleDateString();
}