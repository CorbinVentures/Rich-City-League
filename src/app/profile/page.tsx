'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { FaBasketball, FaBullhorn, FaShieldHalved, FaUserGroup } from 'react-icons/fa6';

const roleCards = [
  { id: 'player' as const, icon: FaBasketball, title: 'PLAYER', subtitle: 'Compete & build your stats', detail: 'Create your player identity, follow your career, rankings, badges and team activity.', accent: 'border-rcl-orange/40 bg-rcl-orange/10' },
  { id: 'official' as const, icon: FaBullhorn, title: 'OFFICIAL', subtitle: 'Coach, referee or league staff', detail: 'Request an official role. League administrators verify access before protected tools unlock.', accent: 'border-rcl-blue/40 bg-rcl-blue/10' },
  { id: 'fan' as const, icon: FaUserGroup, title: 'FAN', subtitle: 'Follow the city', detail: 'Build your fan identity, collect badges, join fantasy and connect with the RCL community.', accent: 'border-rcl-gold/40 bg-rcl-gold/10' },
];
type SelectedRole = 'fan' | 'player' | 'official';

export default function ProfilePage() {
  const { user, profile } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []);
  const [displayName, setDisplayName] = useState(''); const [bio, setBio] = useState(''); const [role, setRole] = useState<SelectedRole>('fan'); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setDisplayName(profile?.display_name ?? ''); setBio(profile?.bio ?? ''); if (profile?.role === 'player' || profile?.role === 'coach' || profile?.role === 'fan') setRole(profile.role === 'coach' ? 'official' : profile.role); }, [profile]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaved(false); setError(''); if (!supabase || !user) return;
    const writeClient = supabase as unknown as SupabaseClient;
    const profileResult = await writeClient.from('profiles').update({ display_name: displayName.trim() || null, bio: bio.trim() || null }).eq('id', user.id);
    if (profileResult.error) { setError('Unable to save your profile details.'); return; }
    const requestedRole = role === 'official' ? 'coach' : role;
    const roleRequest: Partial<Database['public']['Tables']['profile_roles']['Insert']> = { profile_id: user.id, role: requestedRole, status: role === 'fan' ? 'active' : 'pending', verified_at: null, verified_by: null };
    const roleResult = await writeClient.from('profile_roles').upsert(roleRequest);
    if (roleResult.error) { setError('Unable to submit your role request.'); return; }
    if (role === 'fan') { const fanResult = await writeClient.from('fan_profiles').upsert({ profile_id: user.id, favorite_team_id: null, fan_level: 1, games_attended: 0 }); if (fanResult.error) { setError('Unable to create your fan profile.'); return; } }
    setSaved(true);
  };
  const isAdmin = profile?.role === 'admin';
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="xl" className="py-10 sm:py-16"><div className="mx-auto max-w-5xl"><div className="max-w-3xl"><p className="text-xs font-black tracking-[.28em] text-rcl-gold">RCL IDENTITY CENTER</p><h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Create your <span className="text-rcl-orange">RCL profile.</span></h1><p className="mt-4 text-base leading-7 text-white/60">Choose how you participate in the Rich City League. Your role determines which parts of the platform are available to you.</p></div>
    {user ? <form onSubmit={save} className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl sm:p-7"><div><p className="text-[10px] font-black tracking-[.2em] text-white/40">01 · PARTICIPATION TYPE</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Choose your lane</h2></div><div className="mt-6 grid gap-3 md:grid-cols-3">{roleCards.map(({id,icon:Icon,title,subtitle,detail,accent})=><button type="button" key={id} onClick={()=>setRole(id)} className={`rounded-2xl border p-4 text-left transition ${role===id?accent:'border-white/10 bg-black/20 hover:border-white/25'}`}><div className="flex items-center justify-between"><Icon className={role===id?'text-rcl-orange':'text-white/40'}/><span className={`h-2 w-2 rounded-full ${role===id?'bg-rcl-orange':'bg-white/10'}`}/></div><p className="mt-5 font-display text-lg font-black">{title}</p><p className="mt-1 text-xs font-semibold text-white/70">{subtitle}</p><p className="mt-3 text-[11px] leading-5 text-white/45">{detail}</p></button>)}</div>
      {isAdmin&&<div className="mt-4 flex gap-3 rounded-2xl border border-rcl-gold/30 bg-rcl-gold/10 p-4 text-sm"><FaShieldHalved className="mt-1 text-rcl-gold"/><p><strong>ADMIN ACCESS</strong><br/><span className="text-white/60">Administrator permissions are controlled by league authorization and cannot be granted from this form.</span></p></div>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2"><label className="block text-xs font-black uppercase tracking-widest text-white/45">Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-rcl-orange"/></label><div><p className="text-xs font-black uppercase tracking-widest text-white/45">Account role</p><p className="mt-2 rounded-xl border border-white/10 bg-white/[.02] px-4 py-3 text-sm text-white/55">{profile?.username?`@${profile.username}`:role.toUpperCase()}</p></div></div>
      <label className="mt-5 block text-xs font-black uppercase tracking-widest text-white/45">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} placeholder="Tell the RCL community who you are…" className="mt-2 h-32 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-rcl-orange"/><span className="mt-1 block text-right text-[9px] text-white/30">{bio.length}/500</span></label>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className={`text-sm ${error?'text-red-300':'text-rcl-gold'}`}>{error||(saved?(role==='fan'?'Profile saved. Your fan identity is active.':'Profile saved. Your role request is pending league verification.'):'')}</span><button className="rounded-xl bg-rcl-orange px-7 py-3 font-black uppercase tracking-widest text-black transition hover:bg-white">SAVE RCL PROFILE</button></div></section>
      <aside className="space-y-4"><div className="rounded-3xl border border-white/10 bg-gradient-to-br from-rcl-navy/70 to-black p-6"><p className="text-[10px] font-black tracking-[.2em] text-rcl-gold">YOUR PROFILE PATH</p><div className="mt-6 space-y-4">{['Choose your identity','Build your profile','Get verified when required','Unlock your RCL experience'].map((item,index)=><div key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">0{index+1}</span><p className="pt-1 text-sm font-semibold text-white/75">{item}</p></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><p className="text-[10px] font-black tracking-[.2em] text-white/35">SECURITY</p><p className="mt-3 text-sm leading-6 text-white/55">Need to change your password? Use the secure account recovery flow.</p><Link href="/profile/reset-password" className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-rcl-gold hover:border-rcl-gold/40">Reset password</Link></div></aside>
    </form>:<div className="mt-10 rounded-3xl border border-white/10 bg-white/[.03] p-10 text-center"><p className="text-white/50">Sign in to create your RCL profile.</p><Link href="/auth/sign-in" className="mt-5 inline-flex rounded-xl bg-rcl-orange px-6 py-3 font-black uppercase text-black">Sign in</Link></div>}</div></Container></main>;
}
