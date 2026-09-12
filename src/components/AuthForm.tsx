'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSafeNextPath } from '@/lib/auth-redirect';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' | 'reset' }) {
  const { signIn, signUp, resetPassword, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
        router.push(getSafeNextPath(new URLSearchParams(window.location.search).get('next')));
      } else if (mode === 'sign-up') {
        if (password !== confirmation) {
          setMessage('Passwords do not match.');
          return;
        }
        const { session } = await signUp(email, password);
        setMessage(session
          ? 'Your account is ready. Welcome to RCL.'
          : 'Account created. Check your email to confirm your address before signing in.');
      } else {
        await resetPassword(email);
        setMessage('Password recovery instructions have been sent if this email exists.');
      }
    } catch {
      // The hook exposes a user-safe error message.
    }
  }

  const title = mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Join RCL' : 'Reset your password';
  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">Use your RCL account to access league tools.</p>
      </div>
      <label className="block text-sm font-semibold" htmlFor="auth-email">Email</label>
      <input id="auth-email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
      {mode !== 'reset' && <div>
        <label className="block text-sm font-semibold" htmlFor="auth-password">Password</label>
        <div className="relative">
          <input id="auth-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 pr-20 font-normal outline-none focus:border-rcl-gold" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-4 text-xs text-gray-400 hover:text-rcl-gold" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        {mode === 'sign-up' && <p className="mt-2 text-xs text-gray-400">Use at least 8 characters.</p>}
      </div>}
      {mode === 'sign-up' && <label className="block text-sm font-semibold" htmlFor="auth-confirmation">Confirm password<input id="auth-confirmation" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" /></label>}
      {(error || message) && <p className={`text-sm ${error ? 'text-rcl-red' : 'text-rcl-gold'}`}>{error ?? message}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">{loading ? 'Please wait…' : mode === 'reset' ? 'Send recovery email' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      <div className="flex flex-wrap justify-between gap-3 text-sm text-gray-400">
        {mode === 'sign-in' ? <><Link href="/auth/sign-up" className="hover:text-rcl-gold">Create account</Link><Link href="/auth/forgot-password" className="hover:text-rcl-gold">Forgot password?</Link></> : <Link href="/auth/sign-in" className="hover:text-rcl-gold">Back to sign in</Link>}
      </div>
    </form>
  );
}
