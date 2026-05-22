import { LoginForm } from '@/app/login/LoginForm';
import { sanitizeAuthNext } from '@/lib/core/auth_redirect';
import { signInWithEmail, signInWithGoogle } from './actions';

type LoginPageProps = {
  searchParams?: {
    redirect?: string;
    next?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const next = sanitizeAuthNext(searchParams?.redirect || searchParams?.next || '/');

  return (
    <LoginForm
      next={next}
      emailAction={signInWithEmail}
      googleAction={signInWithGoogle}
    />
  );
}
