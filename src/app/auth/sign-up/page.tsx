import { Container } from '@/components/Container';
import { AuthForm } from '@/components/AuthForm';

export default function SignUpPage() {
  return <main><Container maxWidth="sm" className="py-16"><AuthForm mode="sign-up" /></Container></main>;
}
