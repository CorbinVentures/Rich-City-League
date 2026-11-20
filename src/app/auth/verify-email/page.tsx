'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaEnvelope, FaArrowRight } from 'react-icons/fa6';
import { AuthShell } from '@/components/AuthShell';
import { useAuth } from '@/hooks/useAuth';

const SENDER = 'notifications@mail.richcityhoops.com';
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const { user, resendConfirmation, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || cooldown > 0) return;
    setMessage('');
    setIsError(false);
    setSending(true);
    try {
      await resendConfirmation(email.trim() || user?.email || '');
      // A successful Auth response is not a receipt from the recipient's inbox.
      setMessage('Request accepted. If this address has a pending account, a confirmation message will be sent. Check All Mail and the sender below; delivery to an inbox cannot be guaranteed.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const safeMessage = err instanceof Error ? err.message : 'The confirmation request failed. Please try again later.';
      setMessage(safeMessage);
      setIsError(true);
      if (safeMessage.includes('Too many attempts')) setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  }

  return <AuthShell mode="verify">
    <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#07111b]/90 p-6 shadow-2xl sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rcl-blue/10 text-rcl-blue"><FaEnvelope /></span>
      <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-rcl-orange">EMAIL VERIFICATION</p>
      <h1 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Confirm your email</h1>
      <p className="mt-3 text-sm leading-6 text-white/65">Your email confirmation protects your account. If you haven't received it, try one fresh request below.</p>

      <label className="mt-7 block text-xs font-black uppercase tracking-wider text-white/65" htmlFor="verify-email">Email address</label>
      <input id="verify-email" required type="email" autoComplete="email" value={email || user?.email || ''} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-sm font-normal text-white outline-none transition focus:border-rcl-blue/55" />

      {message && <p role={isError ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${isError ? 'border-amber-300/30 bg-amber-300/5 text-amber-100' : 'border-rcl-blue/20 bg-rcl-blue/5 text-white/80'}`}>{message}</p>}

      <button disabled={loading || sending || cooldown > 0} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-widest text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{sending ? 'Requesting…' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Resend confirmation email'} <FaArrowRight /></button>
      <Link href="/auth/sign-in" className="mt-4 block min-h-11 text-center text-xs font-black uppercase tracking-wider leading-[44px] text-white/60 transition hover:text-rcl-blue">Back to sign in</Link>
    </form>

    <section aria-label="Trouble receiving email" className="mt-5 rounded-2xl border border-white/10 bg-[#07111b]/70 p-6 text-sm leading-6 text-white/75">
      <h2 className="text-lg font-black text-white">Still not seeing it?</h2>
      <p className="mt-3">In Gmail, search All Mail for <strong className="break-all text-white">{SENDER}</strong> or the subject <strong className="text-white">Confirm your email address</strong>. Also check Spam and Promotions.</p>
      <p className="mt-3">A delivery-provider status of “delivered” means the mail server accepted the message, not that it landed in your inbox.</p>
      <p className="mt-3">If it still doesn't appear, <a className="font-bold text-rcl-blue underline underline-offset-4" href="mailto:info@richcityhoops.com?subject=RCH%20email%20verification%20support">contact RCH support</a>. Never send your password or verification links. Our team can review an account recovery request without automatically bypassing email ownership checks.</p>
    </section>
  </AuthShell>;
}
