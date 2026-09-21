'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { FaMagnifyingGlass, FaUser, FaBasketball, FaRegComment, FaCalendarDays, FaNewspaper } from 'react-icons/fa6';

type Member = { id:string; display_name:string|null; username:string|null; first_name:string|null; last_name:string|null; avatar_url:string|null; role:string|null; is_vip?:boolean; vip_label?:string|null };
type Player = { id:string; profile_id:string|null; first_name:string; last_name:string; position:string|null; hometown:string|null; jersey_number:string|null };
type Team = { id:string; name:string; slug:string; division?:string|null };
type Game = { id:string; scheduled_at:string; status:string; home_score:number; away_score:number; home_team?:{name:string}|null; away_team?:{name:string}|null; venue?:{name:string;city?:string|null}|null };
type News = { id:string; slug:string; title:string; excerpt:string|null };
type Post = { id:string; body:string; author_id:string; author?:{display_name:string|null;username:string|null}|null };

export default function GlobalSearchPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(false);
  const [members,setMembers]=useState<Member[]>([]);
  const [players,setPlayers]=useState<Player[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [games,setGames]=useState<Game[]>([]);
  const [news,setNews]=useState<News[]>([]);
  const [posts,setPosts]=useState<Post[]>([]);
  const [error,setError]=useState('');

  useEffect(()=>{const q=new URLSearchParams(window.location.search).get('q');if(q)setQuery(q);},[]);

  const clear=()=>{setMembers([]);setPlayers([]);setTeams([]);setGames([]);setNews([]);setPosts([]);};
  const safe=(value:string)=>value.trim().replace(/[,%()]/g,' ').replace(/\s+/g,' ').slice(0,80);

  const searchAll=async(raw:string)=>{
    if(!supabase)return;
    const term=safe(raw);
    if(term.length<2){clear();setLoading(false);return;}
    setLoading(true);setError('');
    const pattern=`%${term}%`;
    try{
      const [memberResult,playerResult,teamResult,gameResult,newsResult,postResult]=await Promise.all([
        supabase.from('profiles').select('id,display_name,username,first_name,last_name,avatar_url,role,is_vip,vip_label').eq('is_active',true).eq('profile_visibility','public').or(`display_name.ilike.${pattern},username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`).limit(20),
        supabase.from('players').select('id,profile_id,first_name,last_name,position,hometown,jersey_number').eq('is_active',true).or(`first_name.ilike.${pattern},last_name.ilike.${pattern},position.ilike.${pattern},hometown.ilike.${pattern}`).limit(20),
        supabase.from('teams').select('id,name,slug').eq('is_active',true).ilike('name',pattern).limit(12),
        supabase.from('games').select('id,scheduled_at,status,home_score,away_score,home_team:teams!home_team_id(name),away_team:teams!away_team_id(name),venue:venues(name,city)').order('scheduled_at',{ascending:false}).limit(100),
        supabase.from('news').select('id,slug,title,excerpt').or(`title.ilike.${pattern},excerpt.ilike.${pattern}`).limit(12),
        supabase.from('posts').select('id,body,author_id,author:profiles(display_name,username)').eq('status','published').ilike('body',pattern).order('created_at',{ascending:false}).limit(20),
      ]);
      const failures=[memberResult,playerResult,teamResult,gameResult,newsResult,postResult].filter(x=>x.error);
      if(failures.length===6)throw failures[0].error;
      setMembers((memberResult.data??[]) as Member[]);
      setPlayers((playerResult.data??[]) as Player[]);
      setTeams((teamResult.data??[]) as Team[]);
      const needle=term.toLowerCase();
      setGames(((gameResult.data??[]) as unknown as Game[]).filter(g=>`${g.home_team?.name??''} ${g.away_team?.name??''} ${g.venue?.name??''} ${g.venue?.city??''} ${g.status}`.toLowerCase().includes(needle)).slice(0,20));
      setNews((newsResult.data??[]) as News[]);
      setPosts((postResult.data??[]) as unknown as Post[]);
    }catch(e){console.error('Global search failed',e);clear();setError('Search is temporarily unavailable. Please try again.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{const timer=window.setTimeout(()=>void searchAll(query),300);return()=>window.clearTimeout(timer);},[query,supabase]);
  const total=members.length+players.length+teams.length+games.length+news.length+posts.length;
  const active=query.trim().length>=2;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,.35),transparent_70%)] py-10"><Container maxWidth="xl"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">RCL SEARCH</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Find the <span className="text-rcl-gold">whole league.</span></h1><p className="mt-3 max-w-2xl text-sm text-white/45">Members, players, teams, games, venues, news and Social posts from one search.</p></Container></section>
    <Container maxWidth="lg" className="py-7">
      <label className="relative block"><span className="sr-only">Search Rich City League</span><FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"/><input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a name, @username, team, venue, article or keyword…" className="w-full rounded-2xl border border-white/10 bg-[#07111b] py-4 pl-12 pr-4 text-base outline-none focus:border-rcl-orange/60"/></label>
      {!query.trim()&&<div className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">SEARCH EVERYTHING</p><p className="mt-3 text-sm text-white/45">Try a player name, username, team, Richmond venue, “final”, a news topic, or words from a Social post.</p></div>}
      {query.trim().length===1&&<p className="mt-6 text-sm text-white/40">Type at least 2 characters to search.</p>}
      {loading&&<div className="py-14 text-center text-xs font-black uppercase tracking-widest text-white/40">Searching RCL…</div>}
      {error&&<p className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">{error}</p>}
      {!loading&&active&&!error&&<div className="mt-7"><div className="mb-6 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-widest text-white/35">Results for “{query.trim()}”</p><span className="text-xs font-black text-rcl-orange">{total} found</span></div>
        {total===0?<div className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-sm text-white/35">No RCL results match that search. Try a shorter name or different keyword.</div>:<div className="space-y-9">
          {members.length>0&&<Group title="Members" count={members.length}>{members.map(m=>{const name=m.display_name||[m.first_name,m.last_name].filter(Boolean).join(' ')||m.username||'RCL Member';return <Link key={m.id} href={`/social/profile/${m.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-rcl-orange font-black text-black">{m.avatar_url?<img src={m.avatar_url} alt="" className="h-full w-full object-cover"/>:name[0]}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{name} {m.is_vip&&<span className="ml-1 text-[9px] text-amber-300">✓ {m.vip_label||'VIP'}</span>}</p><p className="text-[10px] uppercase tracking-wider text-white/35">{m.username?`@${m.username} · `:''}{m.role||'member'}</p></div><FaUser className="text-white/20"/></Link>})}</Group>}
          {players.length>0&&<Group title="Players" count={players.length}>{players.map(p=><Link key={p.id} href={`/players/${p.id}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><p className="font-bold">{p.first_name} {p.last_name}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{p.position||'Player'}{p.jersey_number?` · #${p.jersey_number}`:''}{p.hometown?` · ${p.hometown}`:''}</p></Link>)}</Group>}
          {teams.length>0&&<Group title="Teams" count={teams.length}>{teams.map(t=><Link key={t.id} href={`/teams/${t.slug}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><FaBasketball className="text-rcl-orange"/><b>{t.name}</b></Link>)}</Group>}
          {games.length>0&&<Group title="Games & venues" count={games.length}>{games.map(g=><Link key={g.id} href={`/games/${g.id}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><div className="flex gap-3"><FaCalendarDays className="mt-1 text-rcl-orange"/><div><b>{g.away_team?.name||'Away'} @ {g.home_team?.name||'Home'}</b><p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{new Date(g.scheduled_at).toLocaleDateString()} · {g.venue?.name||'Venue TBA'} · {g.status}</p></div></div></Link>)}</Group>}
          {news.length>0&&<Group title="News" count={news.length}>{news.map(n=><Link key={n.id} href={`/news/${n.slug}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><div className="flex gap-3"><FaNewspaper className="mt-1 text-rcl-orange"/><div><b>{n.title}</b>{n.excerpt&&<p className="mt-1 line-clamp-2 text-xs text-white/40">{n.excerpt}</p>}</div></div></Link>)}</Group>}
          {posts.length>0&&<Group title="Social posts" count={posts.length}>{posts.map(p=><Link key={p.id} href={`/social#post-${p.id}`} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-rcl-orange/50"><p className="text-[10px] font-black uppercase text-rcl-orange"><FaRegComment className="mr-1 inline"/>{p.author?.display_name||p.author?.username||'RCL Member'}</p><p className="mt-2 line-clamp-2 text-sm text-white/60">{p.body}</p></Link>)}</Group>}
        </div>}
      </div>}
    </Container>
  </main>;
}
function Group({title,count,children}:{title:string;count:number;children:React.ReactNode}){return <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-black uppercase">{title}</h2><span className="text-[10px] font-black text-white/30">{count}</span></div><div className="grid gap-3 sm:grid-cols-2">{children}</div></section>}
