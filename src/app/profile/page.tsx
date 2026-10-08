'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { FaArrowLeft, FaBasketball, FaBullhorn, FaCamera, FaShieldHalved, FaUserGroup } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { ProfileMusicPicker } from '@/components/ProfileMusicPicker';
import { ClientPageHero } from '@/components/ClientPageHero';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const roleCards = [
  { id: 'player' as const, icon: FaBasketball, title: 'PLAYER', subtitle: 'Compete & build your stats', detail: 'Create your player identity, follow your career, rankings, badges and team activity.', accent: 'border-rcl-orange/40 bg-rcl-orange/10' },
  { id: 'official' as const, icon: FaBullhorn, title: 'OFFICIAL', subtitle: 'Coach, referee or league staff', detail: 'Request an official role. League administrators verify access before protected tools unlock.', accent: 'border-rcl-blue/40 bg-rcl-blue/10' },
  { id: 'fan' as const, icon: FaUserGroup, title: 'FAN', subtitle: 'Follow the city', detail: 'Build your fan identity, collect badges, join fantasy and connect with the RCL community.', accent: 'border-rcl-orange/30 bg-rcl-orange/[.06]' },
];
type SelectedRole = 'fan' | 'player' | 'official';

export default function ProfilePage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'avatar'|'cover'|null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [profileSongUrl, setProfileSongUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [role, setRole] = useState<SelectedRole>('fan');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
    setCoverUrl(profile?.cover_url ?? '');
    setProfileSongUrl(profile?.profile_song_url ?? '');
    setVisibility(profile?.profile_visibility ?? 'public');
    if (profile?.role === 'player' || profile?.role === 'coach' || profile?.role === 'fan') setRole(profile.role === 'coach' ? 'official' : profile.role);
  }, [profile]);

  const uploadProfileImage = async (kind: 'avatar'|'cover', file?: File) => {
    if (!file || !supabase || !user) return;
    setError('');
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Profile images must be 5 MB or smaller.'); return; }
    setUploading(kind);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/profile/${kind}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setError(uploadError.message || 'Unable to upload image.'); setUploading(null); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    if (kind === 'avatar') setAvatarUrl(data.publicUrl); else setCoverUrl(data.publicUrl);
    setUploading(null);
  };

  const isPrivileged = profile?.role === 'admin' || profile?.role === 'staff';
  const isAdmin = profile?.role === 'admin';

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false); setError('');
    if (!supabase || !user || saving) return;
    setSaving(true);
    const writeClient = supabase as unknown as SupabaseClient;
    const profileResult = await writeClient.from('profiles').update({ display_name: displayName.trim() || null, bio: bio.trim() || null, location: location.trim() || null, avatar_url: avatarUrl.trim() || null, cover_url: coverUrl.trim() || null, profile_song_url: profileSongUrl.trim() || null, profile_visibility: visibility }).eq('id', user.id);
    if (profileResult.error) { setError('Unable to save your profile details.'); setSaving(false); return; }
    if (isPrivileged) { setSaved(true); setSaving(false); return; }
    const requestedRole = role === 'official' ? 'coach' : role;
    const existingRole = await writeClient.from('profile_roles').select('role,status').eq('profile_id', user.id).eq('role', requestedRole).maybeSingle();
    if (existingRole.error) { setError(existingRole.error.message || 'Unable to verify your role.'); setSaving(false); return; }
    if (!existingRole.data) {
      const roleRequest: Partial<Database['public']['Tables']['profile_roles']['Insert']> = { profile_id: user.id, role: requestedRole, status: 'pending', verified_at: null, verified_by: null };
      const roleResult = await writeClient.from('profile_roles').insert(roleRequest);
      if (roleResult.error) { setError(roleResult.error.message || 'Unable to submit your role request.'); setSaving(false); return; }
    }
    if (role === 'fan') {
      const existingFan = await writeClient.from('fan_profiles').select('profile_id').eq('profile_id', user.id).maybeSingle();
      if (existingFan.error) { setError(existingFan.error.message || 'Unable to verify your fan profile.'); setSaving(false); return; }
      if (!existingFan.data) {
        const fanResult = await writeClient.from('fan_profiles').insert({ profile_id: user.id, favorite_team_id: null, fan_level: 1, games_attended: 0 });
        if (fanResult.error) { setError(fanResult.error.message || 'Unable to create your fan profile.'); setSaving(false); return; }
      }
    }
    setSaved(true);
    setSaving(false);
  };

  const statusMessage = error || (saved ? isPrivileged ? 'Profile saved. Your league authorization is unchanged.' : role === 'fan' ? 'Profile saved. Your fan identity is active.' : 'Profile saved. Your role request is pending league verification.' : '');

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="RCL Identity"
      title="Your profile"
      accent="How you show up"
      description="Control your public identity, images, role request, location, bio, and visibility without changing your official league history."
      assetKey="social.cover"
      meta={profile ? <div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Account role</p><p className="mt-1 font-display text-xl font-black uppercase">{profile.role ?? 'member'}</p><p className="mt-2 text-xs text-rcl-blue">{visibility} profile</p></div> : null}
    />

    <Container maxWidth="lg" className="py-8 sm:py-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/settings" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/35 transition hover:text-white"><FaArrowLeft/> Settings</Link>
        <div className="flex gap-2">{isAdmin && <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/20 bg-rcl-blue/5 px-4 text-xs font-black uppercase tracking-wider text-rcl-blue"><FaShieldHalved/> Admin</Link>}{user && <button type="button" onClick={() => void signOut()} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase tracking-wider text-white/45 transition hover:border-white/25 hover:text-white">Sign out</button>}</div>
      </div>

      {authLoading ? <div className="h-96 animate-pulse rounded-2xl border border-rcl-blue/10 bg-white/[.025]"/> : user ? <form onSubmit={save} className="grid gap-6">
        <section className="overflow-hidden rounded-2xl border border-rcl-blue/20 bg-[#071522]/55 shadow-[0_20px_60px_rgba(0,0,0,.18)]">
          <div className="relative h-48 bg-gradient-to-br from-rcl-navy to-black sm:h-56">
            {coverUrl && <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover"/>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#071522] via-transparent to-black/20"/>
            <button type="button" onClick={() => coverInputRef.current?.click()} className="absolute right-4 top-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 text-xs font-black uppercase tracking-wider text-white"><FaCamera/>{uploading === 'cover' ? 'Uploading…' : 'Change cover'}</button>
            <input aria-label="Upload cover photo" ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => void uploadProfileImage('cover', e.target.files?.[0])}/>
            <div className="absolute -bottom-12 left-5 sm:left-7"><button type="button" onClick={() => avatarInputRef.current?.click()} className="relative block h-24 w-24 overflow-hidden rounded-2xl border-4 border-[#071522] bg-rcl-orange shadow-xl sm:h-28 sm:w-28"><ProfileAvatarMedia src={avatarUrl} alt="Profile preview" className="h-full w-full object-cover" /><span className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-lg bg-white text-black"><FaCamera/></span></button><input aria-label="Upload profile photo" ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => void uploadProfileImage('avatar', e.target.files?.[0])}/></div>
          </div>
          <div className="px-5 pb-6 pt-16 sm:px-7"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile media</p><p className="mt-2 text-sm text-white/40">Use clear, recognizable images. Uploads must be images 5 MB or smaller.</p></div>
        </section>

        <section className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5 sm:p-7">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Identity type</p><h2 className="mt-1 font-display text-2xl font-black uppercase">How do you participate?</h2><p className="mt-2 text-sm leading-6 text-white/40">Player and official roles require league verification. Admin/staff authorization cannot be changed here.</p></div>
          <div className={`mt-5 grid gap-3 md:grid-cols-3 ${isPrivileged ? 'pointer-events-none opacity-45' : ''}`}>{roleCards.map(({id,icon:Icon,title,subtitle,detail,accent}) => <button type="button" key={id} onClick={() => setRole(id)} className={`rounded-2xl border p-4 text-left transition ${role === id ? accent : 'border-white/10 bg-black/20 hover:border-rcl-blue/25'}`}><div className="flex items-center justify-between"><Icon className={role === id ? 'text-rcl-orange' : 'text-white/35'}/><span className={`h-2.5 w-2.5 rounded-full ${role === id ? 'bg-rcl-orange' : 'bg-white/10'}`}/></div><p className="mt-5 font-display text-lg font-black">{title}</p><p className="mt-1 text-xs font-semibold text-white/70">{subtitle}</p><p className="mt-3 text-xs leading-5 text-white/40">{detail}</p></button>)}</div>
          {isAdmin && <div className="mt-4 flex gap-3 rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-4 text-sm"><FaShieldHalved className="mt-1 shrink-0 text-rcl-blue"/><p><strong className="text-rcl-blue">ADMIN ACCESS</strong><br/><span className="text-white/50">Administrator permissions are controlled by league authorization and cannot be granted from this form.</span></p></div>}
        </section>

        <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Profile details</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Public information</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="block text-xs font-black uppercase tracking-wider text-white/40">Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 text-sm text-white outline-none focus:border-rcl-blue/60"/></label><div><p className="text-xs font-black uppercase tracking-wider text-white/40">Account role</p><p className="mt-2 flex h-12 items-center rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-black uppercase text-white/55">{isPrivileged ? profile?.role?.toUpperCase() : role.toUpperCase()}</p></div></div>
          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/40">Bio<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} placeholder="Tell the RCL community who you are…" className="mt-2 h-32 w-full resize-none rounded-xl border border-rcl-blue/15 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60"/><span className="mt-1 block text-right text-xs text-white/25">{bio.length}/500</span></label>
          <div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="block text-xs font-black uppercase tracking-wider text-white/40">Location<input value={location} onChange={e => setLocation(e.target.value)} maxLength={100} placeholder="Richmond, VA" className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60"/></label><label className="block text-xs font-black uppercase tracking-wider text-white/40">Profile visibility<select value={visibility} onChange={e => setVisibility(e.target.value as 'public'|'friends'|'private')} className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 text-sm text-white outline-none focus:border-rcl-blue/60"><option value="public">Public</option><option value="friends">Friends</option><option value="private">Private</option></select></label></div>
        </section>

        <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Profile music</p>
          <h2 className="mt-1 font-display text-2xl font-black uppercase">Choose your profile song</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">Search the Audius catalog, listen and select a song for your profile. No YouTube link needed.</p>
          <ProfileMusicPicker value={profileSongUrl} onChange={setProfileSongUrl} />
          <p className="mt-4 text-xs leading-5 text-white/65">After choosing, tap Save RCL profile below. Playback is free; Safari may require visitors to tap Play.</p>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span role="status" className={`text-sm ${error ? 'text-red-300' : saved ? 'text-emerald-300' : 'text-white/35'}`}>{statusMessage || 'Changes are not saved until you submit this form.'}</span>
          <button disabled={saving || uploading !== null} className="min-h-12 shrink-0 rounded-xl bg-rcl-orange px-7 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-50">{saving ? 'Saving…' : 'Save RCL profile'}</button>
        </div>
      </form> : <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-10 text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">RCL Identity</p><h2 className="mt-3 font-display text-2xl font-black uppercase">Sign in to edit your profile</h2><p className="mt-2 text-sm text-white/40">Your public identity and participation settings live with your RCL account.</p><Link href="/auth/sign-in?next=/profile" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wider text-black">Sign in</Link></div>}
    </Container>
  </main>;
}
