import { useLayoutEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

function RegisterPage() {
  const { register, googleLogin, confirmEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('register');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    code: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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

  const onRegister = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await register({ name: form.name, email: form.email, password: form.password });
      setStep('verify');
      setMessage(response.message || 'We sent a verification code to your email.');
      setForm((previous) => ({
        ...previous,
        code: response.verificationCode || '',
        email: response.email || previous.email,
      }));
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmEmail({ email: form.email, code: form.code });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!form.email) {
      setError('Please enter your email first.');
      return;
    }

    setError('');
    setMessage('');
    setResendLoading(true);

    try {
      const response = await resendCode({ email: form.email });
      setMessage(response.message || 'OTP Sent');
      if (response.verificationCode) {
        setForm((previous) => ({ ...previous, code: response.verificationCode }));
      }
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Could not resend code'));
    } finally {
      setResendLoading(false);
    }
  };

  const onGoogleSuccess = async (credential) => {
    try {
      await googleLogin({ credential });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'Google sign-in failed'));
    }
  };

  const isVerificationStep = step === 'verify';

  return (
    <main className="min-h-screen bg-[#FFFFFF] px-4 py-8 text-[#111827] sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center justify-center">
        <form
          className="w-full max-w-[420px] rounded-[20px] border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-8 shadow-[0_18px_44px_-28px_rgba(148,163,184,0.24)] sm:px-8"
          style={{ animation: 'fadeIn 420ms ease-out', backgroundColor: '#FFFFFF' }}
          onSubmit={isVerificationStep ? onVerify : onRegister}
        >
          <div className="space-y-2">
            <p className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              {isVerificationStep ? 'Email Verification' : 'Create Account'}
            </p>
            <h1 className="text-[36px] font-bold tracking-tight text-[#111827]">
              {isVerificationStep ? 'Check your inbox' : 'Create Account'}
            </h1>
            <p className="text-base leading-7 text-[#6B7280]">
              {isVerificationStep
                ? 'Enter the code we sent to your email address to finish creating your account.'
                : 'Start simulating interviews with AI evaluation.'}
            </p>
          </div>

          {!isVerificationStep ? (
            <div className="mt-7 space-y-4">
              <GoogleSignInButton onSuccess={onGoogleSuccess} disabled={loading} />

              <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9CA3AF]">
                <span className="h-px flex-1 bg-[#E5E7EB]" />
                <span>OR</span>
                <span className="h-px flex-1 bg-[#E5E7EB]" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#374151]">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  value={form.name}
                  onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#374151]">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  value={form.email}
                  onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#374151]">Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  value={form.password}
                  onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {message ? <p className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#374151]">{message}</p> : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#374151]">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  value={form.email}
                  onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#374151]">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit code"
                  className="h-[52px] w-full rounded-xl border border-[#D1D5DB] bg-[#FFFFFF] px-4 text-sm tracking-[0.3em] text-[#111827] placeholder:text-[#9CA3AF] outline-none transition duration-300 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100"
                  value={form.code}
                  onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value.replace(/\D/g, '') }))}
                  required
                />
              </div>
            </div>
          )}

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            className="mt-7 h-[50px] w-full rounded-xl bg-[#2563EB] text-base font-semibold text-[#FFFFFF] shadow-[0_16px_28px_-18px_rgba(37,99,235,0.45)] transition-all duration-300 hover:bg-[#1D4ED8] hover:shadow-[0_18px_30px_-18px_rgba(37,99,235,0.55)] focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading || resendLoading}
          >
            <span className="inline-flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? (isVerificationStep ? 'Verifying...' : 'Creating Account...') : isVerificationStep ? 'Verify OTP' : 'Create Account'}
            </span>
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B7280]">
            {isVerificationStep ? (
              <button
                type="button"
                onClick={onResend}
                className="font-semibold text-[#2563EB] transition duration-300 hover:text-[#1D4ED8] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                disabled={resendLoading || loading}
              >
                {resendLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            ) : (
              <span>Already have an account?</span>
            )}

            {!isVerificationStep ? (
              <Link to="/login" className="font-semibold text-[#2563EB] transition duration-300 hover:text-[#1D4ED8] hover:underline">
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep('register');
                  setError('');
                  setMessage('');
                }}
                className="font-semibold text-[#2563EB] transition duration-300 hover:text-[#1D4ED8] hover:underline"
              >
                Back to registration
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`\n        @keyframes fadeIn {\n          from {\n            opacity: 0;\n            transform: translateY(14px);\n          }\n          to {\n            opacity: 1;\n            transform: translateY(0);\n          }\n        }\n      `}</style>
    </main>
  );
}

export default RegisterPage;


