import { redirect } from 'next/navigation';

export default function ProfileResetPasswordPage() {
  redirect('/auth/forgot-password');
}
