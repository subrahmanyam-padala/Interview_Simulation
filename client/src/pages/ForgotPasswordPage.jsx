import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword({ email });
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Server unavailable.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#eff6ff_100%)] px-4 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center justify-center">
        <form className="w-full max-w-[480px] rounded-[20px] border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/70" onSubmit={onSubmit}>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Forgot Password</h1>
            <p className="text-base leading-7 text-slate-600">We’ll send a reset link to your email.</p>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="h-[52px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            className="mt-8 h-[52px] w-full rounded-xl bg-[linear-gradient(135deg,#2563EB_0%,#7C3AED_100%)] text-base font-semibold text-white shadow-[0_16px_32px_-16px_rgba(124,58,237,0.45)] transition-all duration-300 hover:bg-[linear-gradient(135deg,#1D4ED8_0%,#6D28D9_100%)] focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            <span className="inline-flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Sending OTP...' : 'Send Reset Link'}
            </span>
          </button>

          <div className="mt-5 text-sm text-slate-600">
            <Link to="/login" className="font-semibold text-[#4F46E5] transition duration-300 hover:text-[#3730A3] hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;