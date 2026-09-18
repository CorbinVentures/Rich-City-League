import { Suspense } from 'react';
import { Container } from '@/components/Container';
import AuthConfirmClient from './AuthConfirmClient';

export default function AuthConfirmPage() {
  return (
    <main>
      <Container maxWidth="sm" className="py-16">
        <Suspense fallback={<div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center"><h1 className="font-display text-3xl font-bold">Verifying your reset link</h1><p className="text-sm text-gray-400">Securely opening your password reset. Please wait…</p></div>}>
          <AuthConfirmClient />
        </Suspense>
      </Container>
    </main>
  );
}
