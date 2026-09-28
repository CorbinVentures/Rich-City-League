export const metadata = {"title": "Create an account", "description": "Join the Rich City League basketball community."};

import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export default function SignUpPage() {
  return <AuthShell mode="sign-up"><AuthForm mode="sign-up" /></AuthShell>;
}
