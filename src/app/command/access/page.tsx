'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaArrowUpRightFromSquare, FaLock, FaShieldHalved, FaCheck, FaMobileScreenButton } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type AccessProfile = { role: string | null; is_active: boolean | null; onboarding_complete: boolean | null };
const STATUS_COPY: Record<string,string> = {
  denied: 'This RCH account is not authorized for RCL Command Center. Sign in with a league administrator account.',
  inactive: 'This account is inactive. Contact RCL administration to restore access.',
  profile: 'Finish setting up your RCH account profile before entering Command Center.',
  setup: 'Complete your RCH account setup before entering Command Center.',
};

export default function CommandAccessPage() {
  const client = useMemo(() => getSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    let cancelled = false;
    setStatus(new URLSearchParams(window.location.search).get('status') ?? '');
    async function check() {
      if (!client) {
        if (!cancelled) {setMessage('Secure sign-in is temporarily unavailable. Please try again later.');setChecking(false);}
        return;
      }
      try {
        const { data: {user}, error } = await client.auth.getUser();
        if (error || !user || cancelled) return;
        setSignedIn(true);
        const {data:profile, error:profileError} = await client.from('profiles')
          .select('role,is_active,onboarding_complete')
          .eq('id',user.id).maybeSingle();
        if (profileError || cancelled) return;
        const verified = profile as AccessProfile | null;
        if (verified?.role==='admin' && verified.is_active!==false && verified.onboarding_complete!==false) {
          window.location.replace('/command');
          return;
        }
        if (verified?.is_active === false) setMessage(STATUS_COPY.inactive);
        else if (!verified) setMessage(STATUS_COPY.profile);
        else if (verified.onboarding_complete === false) setMessage(STATUS_COPY.setup);
        else setMessage(STATUS_COPY.denied);
      } catch {
        // An expired session should not prevent a fresh, password-based sign-in.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {cancelled=true};
  }, [client]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || submitting) return;
    setSubmitting(true);setMessage('');
    try {
      const {data,error} = await client.auth.signInWithPassword({email:email.trim(),password});
      if(error || !data.user) throw new Error('Unable to sign in. Verify your email and password.');
      const {data:profile,error:profileError} = await client.from('profiles')
        .select('role,is_active,onboarding_complete')
        .eq('id',data.user.id).maybeSingle();
      if(profileError) throw new Error('Unable to verify your administrator access. Please try again.');
      const verified=profile as AccessProfile | null;
      if(!verified) {setMessage(STATUS_COPY.profile);setSignedIn(true);return;}
      if(verified.is_active===false) {setMessage(STATUS_COPY.inactive);setSignedIn(true);return;}
      if(verified.role!=='admin') {setMessage(STATUS_COPY.denied);setSignedIn(true);return;}
      if(verified.onboarding_complete===false) {setMessage(STATUS_COPY.setup);setSignedIn(true);return;}
      // The SSR-aware browser client writes cookies; a full navigation lets
      // middleware and the server re-verify this account before loading data.
      window.location.replace('/command');
    } catch(error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function switchAccount() {
    if (!client || submitting) return;
    setSubmitting(true);
    await client.auth.signOut();
    setSignedIn(false);setMessage('');setPassword('');setSubmitting(false);
  }

  return <main className="cmd-entry" aria-label="RCL Command Center administrator login">
    <div className="cmd-entry-noise" aria-hidden="true" />
    <div className="cmd-entry-grid">
      <section className="cmd-entry-presentation">
        <div className="cmd-entry-brand"><span className="cmd-entry-mark" aria-hidden="true">R</span><div><strong>RCL COMMAND</strong><small>RICH CITY LEAGUE · PRIVATE OPERATIONS</small></div></div>
        <div className="cmd-entry-hero">
          <div className="cmd-entry-eyebrow"><span className="cmd-entry-live"/> EXECUTIVE OPERATIONS NETWORK</div>
          <h1>THE LEAGUE<br/>RUNS <em>HERE.</em></h1>
          <p>Front-office intelligence for Rich City League. One private command system for every franchise, every game, and every decision.</p>
        </div>
        <div className="cmd-entry-detail"><div><b>01</b><span>FINANCIAL INTELLIGENCE</span></div><div><b>02</b><span>VENUES & GAME OPERATIONS</span></div><div><b>03</b><span>FRANCHISE & TRADE OFFICE</span></div><div><b>04</b><span>STORYLINE & PRODUCTION</span></div></div>
        <div className="cmd-entry-watermark" aria-hidden="true">R</div>
      </section>
      <section className="cmd-entry-panel">
        <div className="cmd-entry-secure"><FaShieldHalved aria-hidden="true"/> ENCRYPTED ADMIN ACCESS</div>
        <div className="cmd-entry-panel-title">
          <p className="cmd-entry-eyebrow">RCL EXECUTIVE OFFICE</p>
          <h2>Welcome to<br/>Command Center.</h2>
          <p>Access is restricted to authorized Rich City League administrators. Use your existing RCH administrator credentials.</p>
        </div>
        {checking?<div className="cmd-entry-checking" role="status">Verifying administrator session…</div>:<form onSubmit={e=>void handleSignIn(e)} className="cmd-entry-form">
          {(message || STATUS_COPY[status]) && <div className="cmd-entry-message" role="alert">{message || STATUS_COPY[status]}</div>}
          {(status==='setup'||status==='profile')&&<Link href="/profile?next=%2Fcommand" className="cmd-entry-help-link">Complete RCH profile <FaArrowRight/></Link>}
          <label><span>ADMIN EMAIL</span><input name="email" type="email" autoComplete="username" placeholder="admin@richcityhoops.com" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label><span>PASSWORD</span><input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <button className="cmd-entry-submit" type="submit" disabled={submitting || !client}>{submitting?'VERIFYING ACCESS…':'ENTER COMMAND CENTER'}<FaArrowRight aria-hidden="true"/></button>
          {signedIn&&<button type="button" className="cmd-entry-switch" onClick={()=>void switchAccount()} disabled={submitting}>Sign out of current account to switch administrators</button>}
          <Link className="cmd-entry-help-link" href="/auth/forgot-password"><FaLock aria-hidden="true"/> Recover account password</Link>
        </form>}
        <div className="cmd-entry-install"><div className="cmd-entry-install-icon"><FaMobileScreenButton/></div><div><b>STANDALONE COMMAND APP</b><p>On iPhone, open this page in Safari and select <strong>Share → Add to Home Screen</strong>. It installs with the bright-red R icon, separate from the RCH social app.</p></div></div>
        <div className="cmd-entry-footer"><span><FaCheck/> ADMINISTRATOR-GATED DATA</span><Link href="https://www.richcityhoops.com">RICH CITY HOOPS <FaArrowUpRightFromSquare/></Link></div>
      </section>
    </div>
  </main>;
}
