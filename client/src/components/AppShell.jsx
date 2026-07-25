import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function AppShell({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on route change or click outside
  useEffect(() => {
    setActiveDropdown(null);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 72px Fixed Compact Header */}
      <header ref={dropdownRef} className="sticky top-0 z-50 h-[72px] border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* LEFT: Back Button */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold bg-slate-900/50 hover:bg-slate-800 px-3 py-2 rounded-lg border border-slate-800/50">
              <ArrowLeft size={16} />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* RIGHT: Notifications, Theme Toggle, User Profile Dropdown */}
          <div className="flex items-center gap-3">
            
            {/* Notifications Icon & Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all duration-200 cursor-pointer"
                title="Notifications"
              >
                <span>🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                    <span className="text-[10px] text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded-full">2 New</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <p className="font-semibold text-slate-200">⚔️ Battle Challenge Received</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">A peer invited you to a Competitive Battle room.</p>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <p className="font-semibold text-slate-200">📊 AI Feedback Report</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Your interview report has been generated successfully.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all duration-200 cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('profile')}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'Candidate'}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {activeDropdown === 'profile' && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-800 mb-1">
                    <p className="text-xs font-bold text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <NavLink to="/history" className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors text-slate-300 hover:bg-slate-800/80 hover:text-white">
                    <span>👤</span> My Profile
                  </NavLink>
                  <NavLink to="/setup" className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors text-slate-300 hover:bg-slate-800/80 hover:text-white">
                    <span>⚙️</span> Settings
                  </NavLink>
                  <div className="my-1 border-t border-slate-800"></div>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Body (Untouched) */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
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
