'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSafeNextPath } from '@/lib/auth-redirect';

type ProfileType = 'player' | 'coach' | 'fan';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' | 'reset' }) {
  const { signIn, signUp, resetPassword, loading, error } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileType, setProfileType] = useState<ProfileType>('player');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [position, setPosition] = useState('');
  const [height, setHeight] = useState('');
  const [jersey, setJersey] = useState('');
  const [experience, setExperience] = useState('');
  const [coachRole, setCoachRole] = useState('');
  const [coachExperience, setCoachExperience] = useState('');
  const [fanInterests, setFanInterests] = useState('');
  const [message, setMessage] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [signupHasSession, setSignupHasSession] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    try {
      if (mode === 'sign-in') {
        const requestedNext = new URLSearchParams(window.location.search).get('next');
        const hasExplicitNext = Boolean(requestedNext);
        let destination = getSafeNextPath(requestedNext);
        await signIn(email, password);
        // The temporary preview wall uses its own site-access cookie in addition to
        // Supabase auth. Grant that cookie after a successful member sign-in so
        // subsequent route requests do not bounce authenticated users back to /access.
        document.cookie = `rcl_preview_access=rcl-beta-2026; Path=/; SameSite=Lax; Expires=${new Date(Date.UTC(2026, 9, 1)).toUTCString()}${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        if (!hasExplicitNext) {
          const client = (await import('@/lib/supabase')).getSupabaseClient();
          const { data: { user: signedInUser } } = await client?.auth.getUser() ?? { data: { user: null } };
          if (signedInUser && client) {
            const { data: signedInProfile } = await client.from('profiles').select('role, is_active').eq('id', signedInUser.id).maybeSingle();
            const accessProfile = signedInProfile as { role?: string | null; is_active?: boolean | null } | null;
            if (accessProfile?.is_active === true && (accessProfile.role === 'admin' || accessProfile.role === 'coach')) destination = '/portal/scorebook';
          }
        }
        router.replace(destination);
      } else if (mode === 'sign-up') {
        if (step < 3) { setStep((current) => current + 1); return; }
        if (password !== confirmation) { setStep(1); setMessage('Passwords do not match.'); return; }
        if (!firstName.trim() || !lastName.trim() || !username.trim() || !dateOfBirth) { setMessage('Complete the required profile fields and age screen.'); return; }
        const birth = new Date(dateOfBirth + 'T00:00:00'); const now = new Date(); let age = now.getFullYear()-birth.getFullYear(); const md=now.getMonth()-birth.getMonth(); if(md<0||(md===0&&now.getDate()<birth.getDate())) age--;
        if (Number.isNaN(birth.getTime()) || age < 16) { setMessage('RCL Social accounts are currently available only to users age 16 or older.'); return; }
        if (!acceptedLegal) { setMessage('Review and accept the Terms and Privacy Policy to create an account.'); return; }
        const { session } = await signUp(email, password, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`,
          username: username.trim().replace(/^@/, ''),
          requested_profile_type: profileType,
          location: location.trim(),
          bio: bio.trim(),
          position: position.trim(),
          height: height.trim(),
          jersey_number: jersey.trim(),
          experience: experience.trim(),
          coach_role: coachRole.trim(),
          coach_experience: coachExperience.trim(),
          fan_interests: fanInterests.trim(),
          date_of_birth: dateOfBirth,
          legal_terms_accepted_at: new Date().toISOString(),
          privacy_policy_acknowledged_at: new Date().toISOString(),
        });
        setSignupHasSession(Boolean(session));
        setStep(4);
        setMessage(session ? 'Your RCL identity is ready.' : 'Account created. Check your email to confirm your address.');
      } else {
        await resetPassword(email);
        setMessage('Password recovery instructions have been sent if this email exists.');
      }
    } catch {}
  }

  const inputClass = "mt-2 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 font-normal outline-none transition focus:border-rcl-gold";
  const title = mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Join RCL' : 'Reset your password';

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-sky-500/30 bg-white/[0.04] p-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">{mode === 'sign-up' ? 'Create your identity inside the Rich City League community.' : 'Use your RCL account to access league tools.'}</p>
      </div>

      {mode === 'sign-up' && step < 4 && (
        <div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500"><span className={step >= 1 ? 'text-rcl-gold' : ''}>Account</span><span className={step >= 2 ? 'text-rcl-gold' : ''}>Identity</span><span className={step >= 3 ? 'text-rcl-gold' : ''}>Profile</span><span>Welcome</span></div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-rcl-gold transition-all" style={{ width: `${step * 25}%` }} /></div>
        </div>
      )}

      {(mode !== 'sign-up' || step === 1) && <>
        <label className="block text-sm font-semibold" htmlFor="auth-email">Email<input id="auth-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></label>
        {mode !== 'reset' && <label className="block text-sm font-semibold" htmlFor="auth-password">Password<div className="relative"><input id="auth-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + ' pr-20'} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-5 text-xs text-rcl-gold">{showPassword ? 'Hide' : 'Show'}</button></div>{mode === 'sign-up' && <span className="mt-2 block text-xs font-normal text-gray-400">Use at least 8 characters.</span>}</label>}
        {mode === 'sign-up' && <label className="block text-sm font-semibold">Confirm password<input required minLength={8} type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} /></label>}
      </>}

      {mode === 'sign-up' && step === 2 && <div className="space-y-3">
        <h2 className="text-lg font-bold">Who are you in RCL?</h2>
        {([
          ['player','PLAYER','Build your basketball identity.'],
          ['coach','COACH','Lead, manage, scout and develop.'],
          ['fan','FAN','Follow the league, join the community and play fantasy.'],
        ] as const).map(([value,label,copy]) => <button key={value} type="button" onClick={() => setProfileType(value)} className={`w-full rounded-xl border p-4 text-left transition ${profileType === value ? 'border-rcl-gold bg-rcl-gold/10' : 'border-white/10 bg-black/30'}`}><span className="block font-display text-xl font-bold">{label}</span><span className="text-xs text-gray-400">{copy}</span>{value === 'coach' && <span className="mt-1 block text-[10px] uppercase text-rcl-gold">Coach access requires league approval</span>}</button>)}
      </div>}

      {mode === 'sign-up' && step === 3 && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">First name<input required value={firstName} onChange={e=>setFirstName(e.target.value)} className={inputClass}/></label><label className="text-sm font-semibold">Last name<input required value={lastName} onChange={e=>setLastName(e.target.value)} className={inputClass}/></label></div>
        <label className="block text-sm font-semibold">Date of birth <span className="font-normal text-gray-500">(used for age-appropriate access)</span><input required type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} className={inputClass}/></label>
        <label className="block text-sm font-semibold">Username<input required placeholder="@yourname" value={username} onChange={e=>setUsername(e.target.value)} className={inputClass}/></label>
        <label className="block text-sm font-semibold">Display name <span className="font-normal text-gray-500">(optional)</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} className={inputClass}/></label>
        <label className="block text-sm font-semibold">City / location<input value={location} onChange={e=>setLocation(e.target.value)} className={inputClass}/></label>
        <label className="block text-sm font-semibold">Bio<textarea rows={3} value={bio} onChange={e=>setBio(e.target.value)} className={inputClass}/></label>
        {profileType === 'player' && <><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Position<input placeholder="PG, SG, SF..." value={position} onChange={e=>setPosition(e.target.value)} className={inputClass}/></label><label className="text-sm font-semibold">Height<input placeholder={'6\'5"'} value={height} onChange={e=>setHeight(e.target.value)} className={inputClass}/></label></div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Jersey #<input value={jersey} onChange={e=>setJersey(e.target.value)} className={inputClass}/></label><label className="text-sm font-semibold">Experience<input placeholder="College, rec..." value={experience} onChange={e=>setExperience(e.target.value)} className={inputClass}/></label></div><p className="text-xs text-gray-500">RCL ratings, badges, stats and teammate grades are verified by league activity and cannot be self-entered.</p></>}
        {profileType === 'coach' && <><label className="block text-sm font-semibold">Coaching role<input placeholder="Head coach, assistant..." value={coachRole} onChange={e=>setCoachRole(e.target.value)} className={inputClass}/></label><label className="block text-sm font-semibold">Coaching experience<textarea rows={3} value={coachExperience} onChange={e=>setCoachExperience(e.target.value)} className={inputClass}/></label></>}
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/70"><input required type="checkbox" checked={acceptedLegal} onChange={e=>setAcceptedLegal(e.target.checked)} className="mt-1"/><span>I agree to the <Link className="text-rcl-gold" href="/legal/terms">Terms of Service</Link> and acknowledge the <Link className="text-rcl-gold" href="/legal/privacy">Privacy Policy</Link> and <Link className="text-rcl-gold" href="/legal/community-guidelines">Community Guidelines</Link>.</span></label>
        {profileType === 'fan' && <label className="block text-sm font-semibold">Basketball interests<input placeholder="Fantasy, highlights, teams..." value={fanInterests} onChange={e=>setFanInterests(e.target.value)} className={inputClass}/></label>}
      </div>}

      {mode === 'sign-up' && step === 4 && <div className="py-6 text-center"><div className="text-xs font-bold uppercase tracking-[.25em] text-rcl-gold">Welcome to Rich City League</div><h2 className="mt-3 font-display text-3xl font-bold">{displayName || `${firstName} ${lastName}`}</h2><p className="mt-2 uppercase text-gray-400">{profileType} • {location || 'RCL Community'}</p><p className="mt-5 text-sm text-gray-400">{message}</p><Link href={signupHasSession ? "/explore" : "/auth/sign-in?next=/explore"} className="mt-6 inline-block rounded-lg bg-rcl-gold px-6 py-3 font-bold text-rcl-black">Explore RCL</Link></div>}

      {(error || (message && step !== 4)) && <p className={`text-sm ${error ? 'text-rcl-red' : 'text-rcl-gold'}`}>{error ?? message}</p>}
      {step !== 4 && <div className="flex gap-3">{mode === 'sign-up' && step > 1 && <button type="button" onClick={()=>setStep(s=>s-1)} className="rounded-lg border border-white/15 px-4 py-3 font-bold">Back</button>}<button disabled={loading} className="flex-1 rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">{loading ? 'Please wait…' : mode === 'reset' ? 'Send recovery email' : mode === 'sign-in' ? 'Sign in' : step < 3 ? 'Continue' : 'Create account'}</button></div>}
      {step !== 4 && <div className="flex flex-wrap justify-between gap-3 text-sm text-gray-400">{mode === 'sign-in' ? <><Link href="/auth/sign-up" className="hover:text-rcl-gold">Create account</Link><Link href="/auth/forgot-password" className="hover:text-rcl-gold">Forgot password?</Link></> : <Link href="/auth/sign-in" className="hover:text-rcl-gold">Back to sign in</Link>}</div>}
    </form>
  );
}
