'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { FaArrowRight, FaMagnifyingGlass } from 'react-icons/fa6';
import { rchMediaKind } from '@/lib/rch-tv-media';

type TeamItem = { id: string; name: string; slug: string; logo_url: string | null; primary_color: string | null; division: string | null; season: string | null; wins: number | null; losses: number | null };
type CoachItem = { id: string; profileId: string; name: string; title: string; team: string | null; teamSlug: string | null; wins: number | null; losses: number | null };
type NewsItem = { id: string; slug: string; title: string; excerpt: string | null; category: string; publishedAt: string | null; coverImageUrl: string | null };
type MediaItem = { id: string; title: string; description: string | null; type: string; url: string; createdAt: string };

const inputClass = 'h-12 w-full rounded-xl border border-rcl-blue/15 bg-[#071522]/70 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-rcl-blue/60 focus:ring-2 focus:ring-rcl-blue/10';
const selectClass = 'h-12 rounded-xl border border-rcl-blue/15 bg-[#071522] px-4 text-sm font-bold text-white outline-none transition focus:border-rcl-blue/60 focus:ring-2 focus:ring-rcl-blue/10';

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-10 text-center"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">RCL directory</p><p className="mt-3 font-display text-2xl font-black uppercase text-white">{title}</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/45">{body}</p></div>;
}

function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="relative flex-1"><span className="sr-only">{label}</span><FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/25"/><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} pl-10`} /></label>;
}

export function TeamsDirectory({ items }: { items: TeamItem[] }) {
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState('ALL');
  const divisions = [...new Set(items.map((item) => item.division).filter(Boolean))] as string[];
  const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.division ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (division === 'ALL' || item.division === division)), [items, query, division]);
  return <div>
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4 sm:flex-row sm:items-center"><SearchField value={query} onChange={setQuery} placeholder="Search teams..." label="Search teams"/><select aria-label="Division filter" value={division} onChange={(event) => setDivision(event.target.value)} className={selectClass}><option value="ALL">All divisions</option>{divisions.map((item) => <option key={item} value={item}>{item}</option>)}</select><span className="px-2 text-xs font-black uppercase tracking-[.16em] text-white/35">{filtered.length} shown</span></div>
    {!items.length ? <EmptyState title="The city is building." body="Official RCL teams will appear here as the league roster is finalized." /> : !filtered.length ? <EmptyState title="No teams found." body="Try a different team name or division." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="group relative overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.16)] transition hover:-translate-y-1 hover:border-rcl-blue/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rcl-blue"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rcl-orange/70 to-transparent opacity-0 transition group-hover:opacity-100"/><div className="flex items-center gap-4">{team.logo_url ? <Image src={team.logo_url} alt={`${team.name} logo`} width={80} height={80} sizes="80px" className="h-20 w-20 shrink-0 rounded-xl border border-white/10 bg-black/40 object-contain p-1" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-white/10 font-display text-xl font-black text-white" style={{ backgroundColor: team.primary_color ?? '#071522' }}>{team.name.slice(0,2).toUpperCase()}</div>}<div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[.16em] text-rcl-orange">{team.division ?? 'Division pending'}</p><h2 className="mt-1 truncate font-display text-xl font-black uppercase group-hover:text-rcl-blue">{team.name}</h2><p className="mt-1 text-xs text-white/35">{team.season ?? 'Season pending'}</p></div><FaArrowRight className="shrink-0 text-xs text-white/20 transition group-hover:translate-x-1 group-hover:text-rcl-orange"/></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-xs font-black uppercase tracking-wider text-white/30">Record</p><p className="mt-1 font-display text-2xl font-black">{team.wins === null ? '—' : `${team.wins}–${team.losses}`}</p></div><div className="text-right"><p className="text-xs font-black uppercase tracking-wider text-white/30">Status</p><p className="mt-2 text-xs font-black uppercase text-rcl-blue">View team</p></div></div></Link>)}</div>}
  </div>;
}

export function CoachesDirectory({ items }: { items: CoachItem[] }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const roles = [...new Set(items.map((item) => item.title).filter(Boolean))];
  const filtered = items.filter((item) => `${item.name} ${item.team ?? ''} ${item.title}`.toLowerCase().includes(query.toLowerCase()) && (role === 'ALL' || item.title === role));
  return <div><div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4 sm:flex-row"><SearchField value={query} onChange={setQuery} placeholder="Search coaches..." label="Search coaches"/><select aria-label="Role filter" value={role} onChange={(event) => setRole(event.target.value)} className={selectClass}><option value="ALL">All roles</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{!items.length ? <EmptyState title="The leaders are coming." body="Official RCL coaching profiles will appear as staff assignments are finalized." /> : !filtered.length ? <EmptyState title="No coaches found." body="Try a different name, team, or role." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((coach) => <Link key={coach.id} href={`/coaches/${coach.profileId}`} className="group rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 transition hover:-translate-y-1 hover:border-rcl-blue/45"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{coach.title}</p><div className="mt-2 flex items-start justify-between gap-4"><div><h2 className="font-display text-2xl font-black uppercase group-hover:text-rcl-blue">{coach.name}</h2><p className="mt-1 text-sm text-white/45">{coach.team ?? 'Team assignment pending'}</p></div><FaArrowRight className="mt-1 text-xs text-white/20 group-hover:text-rcl-orange"/></div>{coach.wins === null ? <p className="mt-6 border-t border-white/10 pt-4 text-sm text-white/35">No official record available</p> : <p className="mt-6 border-t border-white/10 pt-4 font-display text-2xl font-black">{coach.wins}–{coach.losses} <span className="text-xs font-normal uppercase text-white/35">team record</span></p>}</Link>)}</div>}</div>;
}

export function NewsDirectory({ items }: { items: NewsItem[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  const filtered = items.filter((item) => `${item.title} ${item.excerpt ?? ''} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'ALL' || item.category === category));
  return <div><div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4 sm:flex-row"><SearchField value={query} onChange={setQuery} placeholder="Search RCL News..." label="Search RCL News"/><select aria-label="Category filter" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}><option value="ALL">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{!items.length ? <EmptyState title="No stories yet." body="Official RCL news will appear here once the league begins publishing." /> : !filtered.length ? <EmptyState title="No stories found." body="Try another search or category." /> : <div className="grid gap-5 md:grid-cols-2">{filtered.map((item) => <Link key={item.id} href={`/news/${item.slug}`} className="group overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 transition hover:-translate-y-1 hover:border-rcl-blue/45">{item.coverImageUrl && <div className="relative h-48 w-full overflow-hidden"><Image src={item.coverImageUrl} alt={item.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" /></div>}<div className="p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{item.category}</p><div className="mt-3 flex items-start justify-between gap-4"><h2 className="font-display text-2xl font-black uppercase leading-tight group-hover:text-rcl-blue">{item.title}</h2><FaArrowRight className="mt-1 shrink-0 text-xs text-white/20 group-hover:text-rcl-orange"/></div>{item.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/45">{item.excerpt}</p>}<p className="mt-5 border-t border-white/10 pt-4 text-xs uppercase tracking-wider text-white/30">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'RCL News'}</p></div></Link>)}</div>}</div>;
}

export function MediaDirectory({ items }: { items: MediaItem[] }) {
  const [category, setCategory] = useState('ALL');
  const categories = [...new Set(items.map((item) => item.type))];
  const filtered = items.filter((item) => category === 'ALL' || item.type === category);
  return <div>
    <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-3" role="group" aria-label="Media type filter">
      {['ALL', ...categories].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${category === item ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/10 text-white/45 hover:border-rcl-blue/35 hover:text-white'}`}>{item === 'ALL' ? 'All' : item}</button>)}
    </div>
    {!items.length
      ? <EmptyState title="The camera is ready." body="RCH TV shows, interviews, photos and clips will appear here as they're published." />
      : !filtered.length
        ? <EmptyState title="No media found." body="Choose another media type." />
        : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const kind = rchMediaKind(item.type);
            return <article key={item.id} className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55">
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-black">
                {kind === 'video' ? (
                  <video src={item.url} controls preload="metadata" playsInline className="h-full w-full object-contain" aria-label={`Play ${item.title}`}>Your browser cannot play this video. <a href={item.url}>Open video</a></video>
                ) : kind === 'image' ? (
                  <img src={item.url} alt={item.title} loading="lazy" className="h-full w-full object-contain" />
                ) : kind === 'audio' ? (
                  <div className="w-full px-5 text-center"><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-rcl-blue">Listen on RCH TV</p><audio src={item.url} controls preload="none" className="w-full" aria-label={`Listen to ${item.title}`}>Your browser cannot play this audio.</audio></div>
                ) : (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-rcl-blue/30 px-5 py-3 text-sm font-bold text-rcl-blue">Open media file <FaArrowRight className="ml-2 inline" /></a>
                )}
              </div>
              <div className="p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{item.type}</p>
                <h2 className="mt-2 font-display text-xl font-black uppercase">{item.title}</h2>
                {item.description && <p className="mt-2 text-sm leading-6 text-white/45">{item.description}</p>}
                <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/50">{new Date(item.createdAt).toLocaleDateString('en-US')}</p>
              </div>
            </article>;
          })}
        </div>}
  </div>;
}
