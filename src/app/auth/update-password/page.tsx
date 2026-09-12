'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';

export default function UpdatePasswordPage() {
  const { updatePassword, error, recoverySession, recoveryLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setMessage('Use a password with at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setMessage('Your password has been updated. You can now sign in.');
      setPassword('');
      setConfirmation('');
    } catch {
      // The hook exposes a user-safe error message.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <Container maxWidth="sm" className="py-16">
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
            <p className="mt-2 text-sm text-gray-400">Use at least eight characters for your new RCL password.</p>
          </div>
          {recoveryLoading && <p role="status" className="text-sm text-gray-400">Verifying your recovery link…</p>}
          {!recoveryLoading && !recoverySession && <div className="space-y-3 text-sm text-gray-300">
            <p>This recovery link is missing, expired, or has already been used.</p>
            <Link href="/auth/forgot-password" className="inline-block text-rcl-gold hover:underline">Request another reset email</Link>
          </div>}
          {!recoveryLoading && recoverySession && <><label className="block text-sm font-semibold" htmlFor="new-password">
            New password
            <div className="relative">
              <input id="new-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 pr-20 font-normal outline-none focus:border-rcl-gold" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-4 text-xs text-gray-400 hover:text-rcl-gold" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <label className="block text-sm font-semibold" htmlFor="confirm-password">
            Confirm password
            <input id="confirm-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
          </label></>}
          {(error || message) && <p className={`text-sm ${error ? 'text-rcl-red' : 'text-rcl-gold'}`}>{error ?? message}</p>}
          <button disabled={submitting || recoveryLoading || !recoverySession} className="w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">
            {submitting ? 'Please wait…' : 'Update password'}
          </button>
          <Link href="/auth/sign-in" className="block text-center text-sm text-gray-400 hover:text-rcl-gold">Back to sign in</Link>
        </form>
      </Container>
    </main>
  );
}
