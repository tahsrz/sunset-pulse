import { FaGoogle } from 'react-icons/fa';
import { LoginForm, LoginHeader, LoginPanel } from '@/app/login/LoginForm';
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
    <LoginPanel>
      <LoginHeader />
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="relative w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all mb-6 shadow-xl shadow-white/5"
        >
          <span className="absolute left-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
            <FaGoogle size={14} />
          </span>
          <span className="block text-center">Continue with Google</span>
        </button>
      </form>
      <LoginForm next={next} emailAction={signInWithEmail} />
    </LoginPanel>
  );
}
