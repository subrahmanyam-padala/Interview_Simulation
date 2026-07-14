import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    adminInviteCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md p-7">
        <h1 className="font-display text-3xl text-white">Create Account</h1>
        <p className="mt-1 text-sm text-slate-300">Start simulating interviews with AI evaluation.</p>

        <div className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="soft-input"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
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
          <input
            type="text"
            placeholder="Admin Invite Code (optional)"
            className="soft-input"
            value={form.adminInviteCode}
            onChange={(event) => setForm((prev) => ({ ...prev, adminInviteCode: event.target.value }))}
          />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <button type="submit" className="primary-btn mt-5 w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="mt-4 text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-100 hover:text-white">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default RegisterPage;
