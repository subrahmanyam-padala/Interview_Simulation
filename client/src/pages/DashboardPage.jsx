import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getMyInterviewHistory } from '../api/interviewApi';
import { formatDateTime } from '../utils/format';
import { 
  LayoutDashboard, Video, Briefcase, FileText, Users, 
  Bell, LogOut, CheckCircle2, Target, TrendingUp, Award, 
  ChevronDown, Calendar, Play, FileLineChart, Sparkles,
  Bot, Code2, BriefcaseBusiness, CalendarDays, History, Map, BotMessageSquare, FolderOpen, Swords
} from 'lucide-react';

// ─── DROPDOWN ITEM COMPONENT ──────────────────────────────────────────────────
function DropdownItem({ to, icon: Icon, label, onClick }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className="flex items-center gap-3 p-[12px] h-[44px] text-[14px] font-medium text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] rounded-md transition-colors border-l-[3px] border-transparent hover:border-[#2563EB]"
    >
      <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

// ─── NAV COMPONENT (Isolated for Dashboard) ──────────────────────────────────
function DashboardNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = (isActive, isOpen) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-[14px] font-medium transition-colors cursor-pointer select-none ${
      isActive || isOpen
        ? 'bg-[#EFF6FF] text-[#2563EB]'
        : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
    }`;

  const isGroupActive = (paths) => paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  const toggleDropdown = (name) => {
    if (activeDropdown === name) setActiveDropdown(null);
    else setActiveDropdown(name);
    setProfileOpen(false);
  };

  const closeMenu = () => setActiveDropdown(null);

  return (
    <header ref={navRef} className="sticky top-0 z-50 h-[72px] bg-[#FFFFFF] border-b border-[#E2E8F0]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[18px] tracking-tight text-[#0F172A]">
            InterviewAI
          </span>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Dashboard (Direct Link) */}
          <NavLink to="/" end className={({ isActive }) => navItemClass(isActive, false)} onClick={closeMenu}>
            <LayoutDashboard size={20} strokeWidth={2} />
            <span>Dashboard</span>
          </NavLink>

          {/* Interviews Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('interviews')}
              className={navItemClass(isGroupActive(['/setup', '/schedule', '/history', '/interview', '/recruiter']), activeDropdown === 'interviews')}
            >
              <Video size={20} strokeWidth={2} />
              <span>Interviews</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'interviews' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'interviews' && (
              <div className="absolute left-0 mt-2 w-[260px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[12px] shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <DropdownItem to="/setup" icon={Bot} label="AI Interview" onClick={closeMenu} />
                <DropdownItem to="/setup" icon={Code2} label="Coding Interview" onClick={closeMenu} />
                <DropdownItem to="/recruiter" icon={BriefcaseBusiness} label="Recruiter Portal" onClick={closeMenu} />
                <DropdownItem to="/schedule" icon={CalendarDays} label="Schedule Interview" onClick={closeMenu} />
                <DropdownItem to="/history" icon={History} label="Interview History" onClick={closeMenu} />
              </div>
            )}
          </div>

          {/* Career Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('career')}
              className={navItemClass(isGroupActive(['/roadmap', '/coach']), activeDropdown === 'career')}
            >
              <Briefcase size={20} strokeWidth={2} />
              <span>Career</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'career' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'career' && (
              <div className="absolute left-0 mt-2 w-[260px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[12px] shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <DropdownItem to="/roadmap" icon={Map} label="Career Roadmap" onClick={closeMenu} />
                <DropdownItem to="/coach" icon={BotMessageSquare} label="AI Coach" onClick={closeMenu} />
              </div>
            )}
          </div>

          {/* Resume Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('resume')}
              className={navItemClass(isGroupActive(['/resumes']), activeDropdown === 'resume')}
            >
              <FileText size={20} strokeWidth={2} />
              <span>Resume</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'resume' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'resume' && (
              <div className="absolute left-0 mt-2 w-[260px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[12px] shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <DropdownItem to="/resumes" icon={FolderOpen} label="Resume Library" onClick={closeMenu} />
              </div>
            )}
          </div>

          {/* Community Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('community')}
              className={navItemClass(isGroupActive(['/battle', '/peer']), activeDropdown === 'community')}
            >
              <Users size={20} strokeWidth={2} />
              <span>Community</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'community' ? 'rotate-180' : ''}`} />
            </button>
            {activeDropdown === 'community' && (
              <div className="absolute left-0 mt-2 w-[260px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-[12px] shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <DropdownItem to="/battle" icon={Swords} label="Coding Battle" onClick={closeMenu} />
                <DropdownItem to="/peer" icon={Users} label="Peer Mock Interview" onClick={closeMenu} />
              </div>
            )}
          </div>
        </nav>

        {/* Right: Profile & Notifications */}
        <div className="flex items-center gap-4">
          <button className="text-[#64748B] hover:text-[#0F172A] transition-colors relative">
            <Bell size={20} strokeWidth={2} />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#EF4444]"></span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => {
                setProfileOpen(!profileOpen);
                setActiveDropdown(null);
              }}
              className="flex items-center gap-2 hover:bg-[#F8FAFC] p-1.5 rounded-md transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#F6F8FB] border border-[#E2E8F0] flex items-center justify-center text-[#2563EB] font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown size={16} className="text-[#64748B]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#FFFFFF] border border-[#E2E8F0] rounded-md shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-[#E2E8F0]">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{user?.name}</p>
                  <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────────────
function DashboardPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyInterviewHistory();
        setHistory(data.interviews || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const completed = history.filter((item) => item.status === 'completed');
    const avg = (key) => {
      if (!completed.length) return 0;
      return Math.round(completed.reduce((acc, item) => acc + (item.overallScores?.[key] || 0), 0) / completed.length);
    };

    return {
      total: history.length,
      completed: completed.length,
      content: avg('content'),
      confidence: avg('confidence'),
    };
  }, [history]);

  const performanceTrend = useMemo(() => {
    const completed = history
      .filter((item) => item.status === 'completed')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return completed.map((item, index) => {
      const scores = item.overallScores || {};
      const avgScore = Math.round(((scores.content || 0) + (scores.communication || 0) + (scores.confidence || 0) + (scores.clarity || 0) + (scores.fluency || 0)) / 5);
      
      return {
        id: item._id,
        session: `S${index + 1}`,
        date: new Date(item.createdAt).toLocaleDateString(),
        averageScore: avgScore,
        content: scores.content || 0,
        confidence: scores.confidence || 0,
      };
    });
  }, [history]);

  return (
    <div className="min-h-screen bg-[#F6F8FB] font-sans text-[#475569]">
      <DashboardNav />
      
      <main className="mx-auto max-w-7xl px-6 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-[#0F172A] tracking-tight">Dashboard</h1>
          <p className="mt-1 text-[15px] text-[#64748B]">Track your interview performance and career progress.</p>
        </div>

        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-8">
          
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Total Interviews</h3>
              <Target size={18} className="text-[#64748B]" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#0F172A]">{stats.total}</p>
            </div>
            <p className="text-xs text-[#64748B] mt-1">All scheduled & completed</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Completed</h3>
              <CheckCircle2 size={18} className="text-[#22C55E]" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#0F172A]">{stats.completed}</p>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Successfully finished</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Avg Content Score</h3>
              <TrendingUp size={18} className="text-[#2563EB]" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#0F172A]">{stats.content}</p>
              <span className="text-sm font-medium text-[#64748B]">/100</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Technical accuracy</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#64748B]">Avg Confidence</h3>
              <Award size={18} className="text-[#F59E0B]" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[#0F172A]">{stats.confidence}</p>
              <span className="text-sm font-medium text-[#64748B]">/100</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">Delivery and posture</p>
          </div>

        </section>

        {/* ── AI Coach Banner ────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <Sparkles size={24} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#0F172A]">AI Interview Coach</h2>
                <p className="text-sm text-[#475569] mt-1 max-w-xl">
                  Get instant feedback on your resume, practice technical questions, and refine your soft skills with our AI mentor.
                </p>
              </div>
            </div>
            <Link
              to="/coach"
              className="flex-shrink-0 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm px-6 py-2.5 rounded-md transition-colors shadow-sm"
            >
              Open Coach
            </Link>
          </div>
        </section>

        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left: Chart */}
          <section className="xl:col-span-2">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm h-full flex flex-col">
              <div className="px-6 py-5 border-b border-[#E2E8F0]">
                <h2 className="text-[16px] font-semibold text-[#0F172A]">Performance Trends</h2>
              </div>
              <div className="p-6 flex-1 min-h-[350px]">
                {!performanceTrend.length ? (
                  <div className="h-full flex items-center justify-center text-sm text-[#64748B]">
                    Complete an interview to see your progress.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="session" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                        labelStyle={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}
                      />
                      <Line type="monotone" dataKey="averageScore" name="Average" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="content" name="Content" stroke="#60A5FA" strokeWidth={2} dot={{ r: 0 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Right: Recent Interviews */}
          <section className="xl:col-span-1">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm h-full flex flex-col">
              <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-[#0F172A]">Recent Interviews</h2>
                <Link to="/setup" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">
                  + New
                </Link>
              </div>
              <div className="p-2 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                {loading ? (
                  <p className="p-4 text-sm text-[#64748B] text-center">Loading...</p>
                ) : !history.length ? (
                  <p className="p-4 text-sm text-[#64748B] text-center">No recent interviews.</p>
                ) : (
                  <div className="space-y-1">
                    {history.slice(0, 6).map((item) => (
                      <div key={item._id} className="group p-4 rounded-lg hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-[#E2E8F0]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-[#0F172A] truncate">
                              {item.setup?.jobRole || 'General Interview'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#64748B]">
                              <Calendar size={12} />
                              <span>{formatDateTime(item.createdAt).split(',')[0]}</span>
                            </div>
                          </div>
                          
                          {item.status === 'completed' ? (
                            <Link 
                              to={`/report/${item._id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs font-medium hover:bg-[#DCFCE7] transition-colors"
                            >
                              <FileLineChart size={14} /> Report
                            </Link>
                          ) : (
                            <Link 
                              to={`/interview/${item._id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-xs font-medium hover:bg-[#DBEAFE] transition-colors"
                            >
                              <Play size={14} /> Resume
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
