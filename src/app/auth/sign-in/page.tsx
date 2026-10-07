export const metadata = {"title": "Sign in", "description": "Sign in to your Rich City League account."};

import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';
import { SocialAuthOptions } from '@/components/SocialAuthOptions';

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <div className="space-y-4">
        <SocialAuthOptions mode="sign-in" />
        <AuthForm mode="sign-in" />
      </div>
    </AuthShell>
  );
}
