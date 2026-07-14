import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md p-7">
        <h1 className="font-display text-3xl text-white">Welcome Back</h1>
        <p className="mt-1 text-sm text-slate-300">Sign in to continue your interview practice.</p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="soft-input"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="soft-input"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <button type="submit" className="primary-btn mt-5 w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          New user?{' '}
          <Link to="/register" className="font-semibold text-brand-100 hover:text-white">
            Create account
          </Link>
        </p>
      </form>
    </main>
  );
}

export default LoginPage;
