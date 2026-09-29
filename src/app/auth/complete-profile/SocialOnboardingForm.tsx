'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaArrowRight, FaBasketball, FaBullhorn, FaUserGroup } from 'react-icons/fa6';
import { getSafeNextPath } from '@/lib/auth-redirect';
import { getSupabaseClient } from '@/lib/supabase';

type ProfileType = 'player' | 'coach' | 'fan';
type OnboardingProfile = {
  onboarding_complete?: boolean | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  location?: string | null;
  bio?: string | null;
};

const roles = [
  { id: 'player' as const, icon: FaBasketball, title: 'Player', copy: 'Build your basketball identity, stats, REP and badges.' },
  { id: 'coach' as const, icon: FaBullhorn, title: 'Coach', copy: 'Build your coaching identity. Coach tools require league approval.' },
  { id: 'fan' as const, icon: FaUserGroup, title: 'Fan', copy: 'Follow RCL, join the community, fantasy and open runs.' },
];

function cleanUsernameSeed(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9._]+/g, '_').replace(/^[_\.]+|[_\.]+$/g, '').slice(0, 30);
  return cleaned.length >= 3 ? cleaned : `rcl_${cleaned || 'member'}`.slice(0, 30);
}

function splitDisplayName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

export default function SocialOnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('social account');
  const [profileType, setProfileType] = useState<ProfileType>('player');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const next = getSafeNextPath(params.get('next') ?? '/social');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!client) {
        if (!cancelled) {
          setError('RCL authentication is temporarily unavailable.');
          setLoading(false);
        }
        return;
      }

      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data: rawProfile } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const profile = rawProfile as unknown as OnboardingProfile | null;
      if (profile?.onboarding_complete !== false) {
        router.replace(next);
        return;
      }

      const metadata = user.user_metadata ?? {};
      const providerName = String(user.app_metadata?.provider ?? '').toLowerCase();
      const fullName = String(metadata.full_name ?? metadata.name ?? profile?.display_name ?? '');
      const splitName = splitDisplayName(fullName);
      const first = String(profile?.first_name ?? metadata.first_name ?? metadata.given_name ?? splitName.first ?? '');
      const last = String(profile?.last_name ?? metadata.last_name ?? metadata.family_name ?? splitName.last ?? '');
      const emailSeed = user.email?.split('@')[0] ?? 'rcl_member';

      if (!cancelled) {
        setProvider(providerName === 'apple' ? 'Apple' : providerName === 'google' ? 'Google' : 'social account');
        setFirstName(first);
        setLastName(last);
        setDisplayName(String(profile?.display_name ?? fullName ?? ''));
        setUsername(profile?.username ?? cleanUsernameSeed(emailSeed));
        setLocation(profile?.location ?? '');
        setBio(profile?.bio ?? '');
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [client, next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || saving) return;
    setError('');

    if (!acceptedLegal) {
      setError('Review and accept the Terms, Privacy Policy, and Community Guidelines to continue.');
      return;
    }

    const birth = new Date(`${dateOfBirth}T00:00:00`);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
    if (!dateOfBirth || Number.isNaN(birth.getTime()) || age < 16) {
      setError('RCL accounts are currently available only to members age 16 or older.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setError('First name, last name, and username are required.');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await (client.rpc as any)('complete_social_onboarding', {
        p_username: username.trim(),
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_display_name: displayName.trim(),
        p_profile_type: profileType,
        p_date_of_birth: dateOfBirth,
        p_accept_legal: true,
        p_location: location.trim(),
        p_bio: bio.trim(),
      });
      if (rpcError) throw rpcError;

      let pendingReferral = '';
      try { pendingReferral = window.localStorage.getItem('rcl_pending_referral') ?? ''; } catch {}
      if (pendingReferral) {
        const { data: claimed } = await (client.rpc as any)('claim_referral', { invite_code: pendingReferral });
        if (claimed) {
          try { window.localStorage.removeItem('rcl_pending_referral'); } catch {}
        }
      }

      router.replace(next);
      router.refresh();
    } catch (saveError) {
      const code = typeof saveError === 'object' && saveError !== null && 'code' in saveError ? String((saveError as { code?: string }).code ?? '') : '';
      const message = saveError instanceof Error ? saveError.message : typeof saveError === 'object' && saveError !== null && 'message' in saveError ? String((saveError as { message?: string }).message ?? '') : '';
      if (code === '23505' || message.toLowerCase().includes('duplicate')) {
        setError('That username is already taken. Try another one.');
      } else if (message.toLowerCase().includes('16')) {
        setError('RCL accounts are currently available only to members age 16 or older.');
      } else {
        setError(message || 'Unable to finish your RCL profile. Please try again.');
      }
      setSaving(false);
    }
  }

  async function switchAccount() {
    if (client) await client.auth.signOut();
    router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-rcl-blue/60';

  if (loading) {
    return <div className="space-y-4 rounded-2xl border border-rcl-blue/20 bg-white/[.04] p-6"><div className="h-7 w-48 animate-pulse rounded bg-white/10"/><div className="h-12 animate-pulse rounded-xl bg-white/10"/><div className="h-36 animate-pulse rounded-xl bg-white/10"/></div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-rcl-blue/25 bg-white/[.04] p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Connected with {provider}</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase">Finish your RCL identity</h1>
        <p className="mt-2 text-sm leading-6 text-white/45">One quick profile screen, then you are inside the Network. RCL accounts are 16+.</p>
      </div>

      <section>
        <p className="text-xs font-black uppercase tracking-[.16em] text-white/40">How do you participate?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {roles.map(({ id, icon: Icon, title, copy }) => (
            <button key={id} type="button" onClick={() => setProfileType(id)} aria-pressed={profileType === id} className={`rounded-xl border p-3 text-left transition ${profileType === id ? 'border-rcl-orange/60 bg-rcl-orange/10' : 'border-white/10 bg-black/25 hover:border-rcl-blue/30'}`}>
              <Icon className={profileType === id ? 'text-rcl-orange' : 'text-white/35'} />
              <span className="mt-3 block text-xs font-black uppercase">{title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-white/35">{copy}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wider text-white/45">First name<input required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" className={inputClass}/></label>
        <label className="text-xs font-black uppercase tracking-wider text-white/45">Last name<input required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" className={inputClass}/></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wider text-white/45">Username<input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourname" autoComplete="username" className={inputClass}/></label>
        <label className="text-xs font-black uppercase tracking-wider text-white/45">Date of birth<input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass}/></label>
      </div>
      <label className="block text-xs font-black uppercase tracking-wider text-white/45">Display name <span className="normal-case font-normal text-white/25">(optional)</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass}/></label>
      <label className="block text-xs font-black uppercase tracking-wider text-white/45">City / location <span className="normal-case font-normal text-white/25">(optional)</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Richmond, VA" className={inputClass}/></label>
      <label className="block text-xs font-black uppercase tracking-wider text-white/45">Bio <span className="normal-case font-normal text-white/25">(optional)</span><textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} className={inputClass}/></label>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-white/60">
        <input required type="checkbox" checked={acceptedLegal} onChange={(e) => setAcceptedLegal(e.target.checked)} className="mt-1" />
        <span>I agree to the <Link className="font-bold text-rcl-orange" href="/legal/terms">Terms of Service</Link>, acknowledge the <Link className="font-bold text-rcl-orange" href="/legal/privacy">Privacy Policy</Link>, and agree to the <Link className="font-bold text-rcl-orange" href="/legal/community-guidelines">Community Guidelines</Link>.</span>
      </label>

      {error && <p role="alert" className="rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}

      <button disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{saving ? 'Building your identity…' : <>Enter RCL <FaArrowRight/></>}</button>
      <button type="button" onClick={() => void switchAccount()} className="w-full text-center text-xs font-bold text-white/30 hover:text-rcl-blue">Not your account? Sign out and use another one.</button>
    </form>
  );
}
