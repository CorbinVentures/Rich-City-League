import { Suspense } from 'react';
import { AuthShell } from '@/components/AuthShell';
import OAuthCallbackClient from './OAuthCallbackClient';

export const metadata = {
  title: 'Connecting your account',
  description: 'Finish connecting your Rich City League account.',
};

export default function OAuthCallbackPage() {
  return (
    <AuthShell mode="sign-in">
      <Suspense fallback={<div className="rounded-2xl border border-rcl-blue/20 bg-white/[.04] p-6 text-center text-sm text-white/45">Connecting your RCL identity…</div>}>
        <OAuthCallbackClient />
      </Suspense>
    </AuthShell>
  );
}
