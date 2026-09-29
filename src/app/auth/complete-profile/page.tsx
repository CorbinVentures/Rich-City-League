import { Suspense } from 'react';
import { AuthShell } from '@/components/AuthShell';
import SocialOnboardingForm from './SocialOnboardingForm';

export const metadata = {
  title: 'Finish your RCL profile',
  description: 'Complete your Rich City League basketball identity after secure social sign-in.',
};

export default function CompleteSocialProfilePage() {
  return (
    <AuthShell mode="sign-up">
      <Suspense fallback={<div className="rounded-2xl border border-rcl-blue/20 bg-white/[.04] p-6 text-center text-sm text-white/45">Loading your RCL identity…</div>}>
        <SocialOnboardingForm />
      </Suspense>
    </AuthShell>
  );
}
