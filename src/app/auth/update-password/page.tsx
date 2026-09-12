'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';

export default function UpdatePasswordPage() {
  const { updatePassword, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
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
          <label className="block text-sm font-semibold">
            New password
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
          </label>
          <label className="block text-sm font-semibold">
            Confirm password
            <input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
          </label>
          {(error || message) && <p className={`text-sm ${error ? 'text-rcl-red' : 'text-rcl-gold'}`}>{error ?? message}</p>}
          <button disabled={submitting} className="w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">
            {submitting ? 'Please wait…' : 'Update password'}
          </button>
          <Link href="/auth/sign-in" className="block text-center text-sm text-gray-400 hover:text-rcl-gold">Back to sign in</Link>
        </form>
      </Container>
    </main>
  );
}
