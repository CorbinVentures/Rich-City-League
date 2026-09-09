import { Container } from '@/components/Container';
import { AuthForm } from '@/components/AuthForm';

export default function SignInPage() {
  return <main><Container maxWidth="sm" className="py-16"><AuthForm mode="sign-in" /></Container></main>;
}
