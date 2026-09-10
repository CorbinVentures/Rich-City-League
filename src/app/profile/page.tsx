'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePage() {
  const { user, profile } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []); const [displayName, setDisplayName] = useState(''); const [bio, setBio] = useState(''); const [role, setRole] = useState<'fan' | 'player' | 'coach'>('fan'); const [saved, setSaved] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setDisplayName(profile?.display_name ?? ''); setBio(profile?.bio ?? ''); if (profile?.role === 'player' || profile?.role === 'coach' || profile?.role === 'fan') setRole(profile.role); }, [profile]);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaved(false); setError(''); if (!supabase || !user) return;
    const profileResult = await supabase.from('profiles').update({ display_name: displayName.trim() || null, bio: bio.trim() || null }).eq('id', user.id);
    if (profileResult.error) { setError('Unable to save your profile details.'); return; }
    const roleResult = await supabase.from('profile_roles').upsert({ profile_id: user.id, role, status: role === 'fan' ? 'active' : 'pending' });
    if (roleResult.error) { setError('Unable to submit your role request.'); return; }
    if (role === 'fan') {
      const fanResult = await supabase.from('fan_profiles').upsert({ profile_id: user.id });
      if (fanResult.error) { setError('Unable to create your fan profile.'); return; }
    }
    setSaved(true);
  };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">YOUR RCL IDENTITY</p><h1 className="mt-2 text-4xl font-black">Build your profile</h1>{user ? <form onSubmit={save} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><label className="text-xs font-bold uppercase tracking-widest text-gray-400">RCL role<select value={role} onChange={e => setRole(e.target.value as typeof role)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-rcl-gold"><option value="fan">🔥 Fan — available now</option><option value="player">🏀 Player — requires verification</option><option value="coach">🎓 Coach — requires verification</option></select></label><p className="mt-2 text-xs text-gray-500">Player and coach roles are submitted for league verification. Your fan identity is available immediately.</p><label className="mt-5 block text-xs font-bold uppercase tracking-widest text-gray-400">Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-rcl-gold" /></label><label className="mt-5 block text-xs font-bold uppercase tracking-widest text-gray-400">Bio<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} className="mt-2 h-32 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-rcl-gold" /></label><div className="mt-5 flex items-center justify-between"><span className="text-sm text-rcl-gold">{error || (saved ? 'Profile saved.' : '')}</span><button className="rounded-xl bg-rcl-gold px-5 py-3 font-black text-black">SAVE PROFILE</button></div></form> : <p className="mt-8 rounded-2xl border border-white/10 p-8 text-gray-400">Sign in to build your profile.</p>}</Container></main>;
}
