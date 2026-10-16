import { Suspense } from 'react';
import MfaChallenge from './MfaChallenge';

export const metadata = {
  title: 'Confirm your identity | Rich City Hoops',
  robots: { index: false, follow: false },
};

export default function MfaPage() {
  return <main className="min-h-screen bg-rcl-black px-4 py-12 text-white sm:py-20">
    <Suspense fallback={<p className="text-center text-sm text-white/50">Checking account security…</p>}><MfaChallenge /></Suspense>
  </main>;
}
