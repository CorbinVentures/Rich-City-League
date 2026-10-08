export const metadata = {"title": "Reset your password", "description": "Recover access to your Rich City League account."};

import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  return <AuthShell mode="reset"><AuthForm mode="reset" /></AuthShell>;
}
