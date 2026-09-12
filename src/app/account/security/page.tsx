'use client';

import { FormEvent, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';

export default function SecurityPage() {
  const { updatePassword, error, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) {
      setMessage('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Your password has been updated.');
    } catch {
      // The hook provides a safe error message.
    }
  }

  return <main><Container maxWidth="sm" className="py-16">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <h1 className="font-display text-3xl font-bold">Account security</h1>
      <p className="text-sm text-gray-400">Change your password while signed in. Your current session is required.</p>
      <label className="block text-sm font-semibold" htmlFor="new-password">New password</label>
      <input id="new-password" required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
      <label className="block text-sm font-semibold" htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 font-normal outline-none focus:border-rcl-gold" />
      {(error || message) && <p role="status" className={`text-sm ${error ? 'text-rcl-red' : 'text-rcl-gold'}`}>{error ?? message}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black disabled:opacity-60">{loading ? 'Please wait…' : 'Change password'}</button>
    </form>
  </Container></main>;
}
