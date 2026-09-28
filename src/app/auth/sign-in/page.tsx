export const metadata = {"title": "Sign in", "description": "Sign in to your Rich City League account."};

import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export default function SignInPage() {
  return <AuthShell mode="sign-in"><AuthForm mode="sign-in" /></AuthShell>;
}
