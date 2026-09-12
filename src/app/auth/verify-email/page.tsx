'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
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

  return <main><Container maxWidth="sm" className="py-16">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h1 className="font-display text-3xl font-bold">Confirm your email</h1>
      <p className="text-sm text-gray-400">Check your inbox for the RCL confirmation link. You can request another message below.</p>
      <label className="block text-sm font-semibold" htmlFor="verify-email">Email</label>
      <input id="verify-email" required type="email" autoComplete="email" value={email || user?.email || ''} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
      {message && <p role="status" className="text-sm text-rcl-gold">{message}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">{loading ? 'Please wait…' : 'Resend confirmation email'}</button>
      <Link href="/auth/sign-in" className="block text-center text-sm text-gray-400 hover:text-rcl-gold">Back to sign in</Link>
    </form>
  </Container></main>;
}
