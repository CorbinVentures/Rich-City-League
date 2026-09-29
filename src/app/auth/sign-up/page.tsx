export const metadata = {"title": "Create an account", "description": "Join the Rich City League basketball community."};

import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';
import { SocialAuthOptions } from '@/components/SocialAuthOptions';

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <div className="space-y-4">
        <SocialAuthOptions mode="sign-up" />
        <AuthForm mode="sign-up" />
      </div>
    </AuthShell>
  );
}
