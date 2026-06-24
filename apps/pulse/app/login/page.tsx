import { FaGoogle } from 'react-icons/fa';
import { LoginForm, LoginHeader, LoginPanel } from '@/app/login/LoginForm';
import { sanitizeAuthNext } from '@/lib/core/auth_redirect';
import { signInWithEmail, signInWithGoogle } from './actions';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    redirect?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const next = sanitizeAuthNext(resolvedParams?.redirect || resolvedParams?.next || '/');
  const errorMessage = getLoginErrorMessage(resolvedParams?.error || resolvedParams?.message);

  return (
    <LoginPanel>
      <LoginHeader />
      {errorMessage ? (
        <p className="mb-6 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-red-100">
          {errorMessage}
        </p>
      ) : null}
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

function getLoginErrorMessage(message?: string) {
  if (!message) return '';

  const normalized = safelyDecode(message).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  if (normalized === 'missing-auth-params') {
    return 'That sign-in link is missing its security token. Please start a fresh sign-in from this page.';
  }

  if (/pkce|code verifier/i.test(normalized)) {
    return 'That sign-in session expired or started in a different browser. Please try signing in again from this device.';
  }

  if (/expired/i.test(normalized)) {
    return 'That sign-in link has expired. Please request a fresh one or sign in again.';
  }

  return normalized.slice(0, 220);
}

function safelyDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
