import { Container } from '@/components/Container';
import { AuthForm } from '@/components/AuthForm';

export default function ForgotPasswordPage() {
  return <main><Container maxWidth="sm" className="py-16"><AuthForm mode="reset" /></Container></main>;
}
