import { LoginForm } from '@/app/login/LoginForm';
import { sanitizeAuthNext } from '@/lib/core/auth_redirect';
import { signInWithEmail, signInWithGoogle } from './actions';

type LoginPageProps = {
  searchParams?: Promise<{
    redirect?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const next = sanitizeAuthNext(resolvedParams?.redirect || resolvedParams?.next || '/');

  return (
    <LoginForm
      next={next}
      emailAction={signInWithEmail}
      googleAction={signInWithGoogle}
    />
  );
}
