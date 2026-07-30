import { useLayoutEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    body.style.background = '#ffffff';
    body.style.backgroundImage = 'none';
    body.style.color = '#111827';
    body.style.colorScheme = 'light';
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (credential) => {
    try {
      await googleLogin({ credential });
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Google sign-in failed'));
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFFFF] px-4 py-8 text-[#111827] sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center justify-center">
        <form
          className="w-full max-w-[420px] rounded-[20px] border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-8 shadow-[0_18px_44px_-28px_rgba(148,163,184,0.24)] sm:px-8"
          style={{ animation: 'fadeIn 420ms ease-out', backgroundColor: '#FFFFFF' }}
          onSubmit={onSubmit}
        >
          <div className="space-y-2">
            <h1 className="text-[36px] font-bold tracking-tight text-[#111827]">Welcome Back</h1>
            <p className="text-base leading-7 text-[#6B7280]">Sign in to continue your interview practice.</p>
          </div>

          <div className="mt-7 space-y-4">
            <GoogleSignInButton onSuccess={onGoogleSuccess} disabled={loading} />

            <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9CA3AF]">
              <span className="h-px flex-1 bg-[#E5E7EB]" />
              <span>OR</span>
              <span className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-[#2563EB] transition duration-300 hover:text-[#1D4ED8] hover:underline">
                Forgot Password?
              </Link>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            className="mt-7 h-[50px] w-full rounded-xl bg-[#2563EB] text-base font-semibold text-[#FFFFFF] shadow-[0_16px_28px_-18px_rgba(37,99,235,0.45)] transition-all duration-300 hover:bg-[#1D4ED8] hover:shadow-[0_18px_30px_-18px_rgba(37,99,235,0.55)] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            <span className="inline-flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Signing In...' : 'Sign In'}
            </span>
          </button>

          <div className="mt-4 flex items-center gap-2 text-sm text-[#6B7280]">
            <span>New user?</span>
            <Link to="/register" className="font-semibold text-[#2563EB] transition duration-300 hover:text-[#1D4ED8] hover:underline">
              Create account
            </Link>
          </div>
        </form>
      </div>

      <style>{`\n        @keyframes fadeIn {\n          from {\n            opacity: 0;\n            transform: translateY(14px);\n          }\n          to {\n            opacity: 1;\n            transform: translateY(0);\n          }\n        }\n      `}</style>
    </main>
  );
}

export default LoginPage;
