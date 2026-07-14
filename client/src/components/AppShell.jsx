import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-semibold transition ${
    isActive ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`;

function AppShell({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-display text-xl text-white">
              InterviewAI
            </Link>
            <nav className="hidden gap-2 md:flex">
              <NavLink to="/" className={linkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/setup" className={linkClass}>
                Setup
              </NavLink>
              <NavLink to="/schedule" className={linkClass}>
                📅 Schedule
              </NavLink>
              <NavLink to="/coach" className={linkClass}>
                🤖 Coach
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                History
              </NavLink>
              <NavLink to="/resumes" className={linkClass}>
                Resumes
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={linkClass}>
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Toggle Theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button type="button" onClick={onLogout} className="secondary-btn text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-slate-300">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}

export default AppShell;
