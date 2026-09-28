'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { FaEnvelope, FaArrowRight } from 'react-icons/fa6';
import { AuthShell } from '@/components/AuthShell';
import { useAuth } from '@/hooks/useAuth';

export default function VerifyEmailPage() {
  const { user, resendConfirmation, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    try {
      await resendConfirmation(email || user?.email || '');
      setMessage('Confirmation instructions have been sent if this email exists.');
    } catch {
      setMessage('Unable to resend confirmation instructions. Please try again later.');
    }
  }

  return <AuthShell mode="verify">
    <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#07111b]/90 p-6 shadow-2xl sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rcl-blue/10 text-rcl-blue"><FaEnvelope /></span>
      <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-rcl-orange">EMAIL VERIFICATION</p>
      <h1 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Confirm your email</h1>
      <p className="mt-3 text-sm leading-6 text-white/45">Check your inbox for the RCL confirmation link. If the original message expired or never arrived, request a fresh one below.</p>

      <label className="mt-7 block text-xs font-black uppercase tracking-wider text-white/45" htmlFor="verify-email">Email address</label>
      <input id="verify-email" required type="email" autoComplete="email" value={email || user?.email || ''} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-normal text-white outline-none transition focus:border-rcl-blue/55" />

      {message && <p role="status" className="mt-4 rounded-xl border border-rcl-blue/15 bg-rcl-blue/5 p-3 text-sm leading-6 text-white/65">{message}</p>}

      <button disabled={loading} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-widest text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Sending…' : 'Resend confirmation email'} <FaArrowRight /></button>
      <Link href="/auth/sign-in" className="mt-4 block min-h-11 text-center text-xs font-black uppercase tracking-wider leading-[44px] text-white/40 transition hover:text-rcl-blue">Back to sign in</Link>
    </form>
  </AuthShell>;
}
