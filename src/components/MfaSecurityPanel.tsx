'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { getSafePostAuthPath } from '@/lib/auth-redirect';

type TotpFactor = { id: string; friendly_name?: string | null; status?: string };
type Enrollment = { id: string; qrCode: string; secret: string };

export function MfaSecurityPanel({ userId, isAdmin }: { userId: string | null; isAdmin: boolean }) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string>('aal1');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function refresh() {
    if (!client) throw new Error('Authentication is not configured.');
    const [factorResponse, aalResponse] = await Promise.all([
      client.auth.mfa.listFactors(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (factorResponse.error) throw factorResponse.error;
    if (aalResponse.error) throw aalResponse.error;
    setFactors(factorResponse.data.totp ?? []);
    setCurrentLevel(aalResponse.data.currentLevel ?? 'aal1');
  }

  useEffect(() => {
    if (!userId || !client) { setLoading(false); return; }
    let active = true;
    void Promise.all([client.auth.mfa.listFactors(), client.auth.mfa.getAuthenticatorAssuranceLevel()]).then(([factorsResult, aalResult]) => {
      if (!active) return;
      if (factorsResult.error || aalResult.error) setError('Unable to load authenticator settings. Reload the page.');
      else {
        setFactors(factorsResult.data.totp ?? []);
        setCurrentLevel(aalResult.data.currentLevel ?? 'aal1');
      }
    }).catch(() => { if (active) setError('Unable to load authenticator settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, userId]);

  async function startEnrollment() {
    if (!client || !userId || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'RCH Authenticator' });
      if (result.error) throw result.error;
      if (!result.data.totp) throw new Error('No authenticator setup details were returned.');
      setEnrollment({ id: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start two-factor setup.');
    } finally { setBusy(false); }
  }

  async function finishEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !enrollment || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code });
      if (result.error) throw result.error;
      setEnrollment(null); setCode('');
      await refresh();
      setNotice('Two-factor authentication is enabled. Other sessions were signed out.');
      // Admins can continue to the protected destination after they have AAL2.
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next) window.location.replace(getSafePostAuthPath(next, '/dashboard'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid authenticator code.'); }
    finally { setBusy(false); }
  }

  async function cancelEnrollment() {
    if (!client || !enrollment || busy) return;
    setBusy(true); setError('');
    const result = await client.auth.mfa.unenroll({ factorId: enrollment.id });
    if (result.error) setError(result.error.message);
    else { setEnrollment(null); setCode(''); await refresh().catch(() => {}); }
    setBusy(false);
  }

  async function removeFactor(factorId: string) {
    if (!client || !userId || busy || currentLevel !== 'aal2') return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.auth.mfa.unenroll({ factorId });
      if (result.error) throw result.error;
      // Supabase does not immediately downgrade an existing AAL2 JWT when the
      // final factor is removed. Refresh now rather than leaving privileged
      // pages available with a stale session assurance claim.
      if (factors.length === 1) {
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error || !refreshed.data.session) {
          await client.auth.signOut();
          window.location.replace('/auth/sign-in?next=/account/security');
          return;
        }
      }
      setRemoveId(null);
      await refresh();
      setNotice('Authenticator removed. You can register a new authenticator.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove authenticator.'); }
    finally { setBusy(false); }
  }

  const qrSrc = enrollment?.qrCode
    ? (enrollment.qrCode.startsWith('data:image/') ? enrollment.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`)
    : '';
  const inputClass = 'mt-2 w-full max-w-xs rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-rcl-blue';

  return <section aria-labelledby="two-factor-title" className="mt-6 rounded-2xl border border-rcl-blue/20 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 sm:p-8">
    <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Identity protection</p>
    <h2 id="two-factor-title" className="mt-2 font-display text-2xl font-black uppercase">Two-factor authentication</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Protect your RCH account with a 6-digit code from an authenticator app. Optional for regular members; required before administrators can access privileged workspaces.</p>
    {loading && <p role="status" className="mt-5 text-sm text-white/50">Checking authenticator settings…</p>}
    {!loading && !userId && <p className="mt-5 text-sm text-white/60">Sign in to manage your authenticators.</p>}
    {!loading && userId && <>
      <p className="mt-5 text-sm font-semibold text-white/80">{factors.length ? `${factors.length} authenticator${factors.length === 1 ? '' : 's'} enabled` : 'No authenticator configured'} · Session: {currentLevel === 'aal2' ? 'Verified with two factors' : 'Password or social login only'}</p>
      {isAdmin && !factors.length && <p className="mt-3 text-sm text-amber-200">An authenticator is required before you can open the administration and command workspaces.</p>}
      {factors.length > 0 && <ul className="mt-4 space-y-3">{factors.map((factor, index) => <li key={factor.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
        <span className="text-sm text-white/75">{factor.friendly_name || `Authenticator ${index + 1}`}</span>
        {removeId === factor.id
          ? <span className="flex flex-wrap items-center gap-2 text-xs"><span className="text-red-200">Remove this factor?</span><button type="button" disabled={busy || currentLevel !== 'aal2'} onClick={() => void removeFactor(factor.id)} className="rounded-lg bg-red-400 px-3 py-2 font-bold text-black disabled:opacity-50">Confirm removal</button><button type="button" onClick={() => setRemoveId(null)} className="rounded-lg border border-white/20 px-3 py-2">Cancel</button></span>
          : <button type="button" disabled={busy || currentLevel !== 'aal2'} onClick={() => setRemoveId(factor.id)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-50">Remove</button>}
      </li>)}</ul>}
      {factors.length > 0 && currentLevel !== 'aal2' && <Link className="mt-4 inline-flex rounded-xl border border-rcl-blue/40 px-4 py-3 text-sm font-bold text-rcl-blue" href="/auth/mfa?next=/account/security">Verify existing authenticator first</Link>}
      {!enrollment && <button type="button" onClick={() => void startEnrollment()} disabled={busy || !userId || (factors.length > 0 && currentLevel !== 'aal2')} className="mt-5 min-h-11 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{busy ? 'Working…' : factors.length ? 'Add another authenticator' : 'Set up authenticator'}</button>}
      {enrollment && <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5">
        <p className="text-sm font-bold">1. Scan this QR code in your authenticator app</p>
        <div className="mt-4 inline-block rounded-xl bg-white p-3"><img src={qrSrc} alt="Authenticator setup QR code" width={192} height={192} /></div>
        <details className="mt-3 max-w-xl text-xs text-white/65"><summary className="cursor-pointer font-bold">Cannot scan? Enter the secret manually</summary><code className="mt-2 block break-all rounded-lg bg-black p-3 text-white">{enrollment.secret}</code></details>
        <p className="mt-4 text-xs text-white/55">Keep this setup code private. RCH will not ask for it. If you lose your authenticator, a second enrolled device or verified support recovery may be required.</p>
        <form onSubmit={event => void finishEnrollment(event)} className="mt-5">
          <label htmlFor="mfa-enroll-code" className="block text-sm font-bold">2. Enter the 6-digit code from your app</label>
          <input id="mfa-enroll-code" className={inputClass} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy || !/^\d{6}$/.test(code)} className="min-h-11 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black disabled:opacity-50">Verify & enable</button><button type="button" disabled={busy} onClick={() => void cancelEnrollment()} className="min-h-11 rounded-xl border border-white/20 px-5 text-xs font-bold text-white/80 disabled:opacity-50">Cancel setup</button></div>
        </form>
      </div>}
    </>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</p>}
  </section>;
}
