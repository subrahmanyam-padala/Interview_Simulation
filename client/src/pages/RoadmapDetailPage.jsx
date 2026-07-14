import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoadmap, markDayComplete } from '../api/roadmapApi';
import AppShell from '../components/AppShell';

const WEEK_COLORS = [
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-rose-500',
  'from-pink-500 to-fuchsia-500',
];

function ProgressRing({ percent, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-brand-500 transition-all duration-700"
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-slate-100 text-xs font-bold" fontSize={size * 0.18}>
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function DayCard({ dayData, onToggle, isActive, onClick }) {
  const weekIdx = Math.floor((dayData.day - 1) / 7) % WEEK_COLORS.length;
  const color = WEEK_COLORS[weekIdx];

  return (
    <div
      className={`rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden ${
        isActive ? 'border-brand-500 shadow-glow' : dayData.completed ? 'border-emerald-700/50 bg-emerald-900/10' : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-600'
      }`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-3 p-3 bg-gradient-to-r ${color} bg-opacity-10`}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(dayData.day); }}
          className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            dayData.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 hover:border-emerald-400'
          }`}
          title="Mark complete"
        >
          {dayData.completed && <span className="text-xs">✓</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">Day {dayData.day}</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{dayData.title}</p>
        </div>
      </div>

      {isActive && (
        <div className="p-4 space-y-4 animate-fade-in">
          <p className="text-sm text-slate-300">{dayData.focus}</p>

          {dayData.resources?.youtube?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-1.5 uppercase tracking-wide">▶ YouTube</p>
              <div className="space-y-1">
                {dayData.resources.youtube.map((v, i) => (
                  <a key={i} href={v.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition"
                    onClick={e => e.stopPropagation()}>
                    <span className="text-red-400 text-xs">▶</span> {v.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {dayData.resources?.documentation?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-400 mb-1.5 uppercase tracking-wide">📄 Documentation</p>
              <div className="space-y-1">
                {dayData.resources.documentation.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition"
                    onClick={e => e.stopPropagation()}>
                    <span className="text-blue-400 text-xs">📎</span> {d.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {dayData.project && (
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-1.5 uppercase tracking-wide">🔨 Project / Exercise</p>
              <p className="text-sm text-slate-300 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">{dayData.project}</p>
            </div>
          )}

          {dayData.practiceQuestions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-violet-400 mb-1.5 uppercase tracking-wide">❓ Practice Questions</p>
              <ul className="space-y-1">
                {dayData.practiceQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-violet-400 font-bold">{i + 1}.</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoadmapDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(null);
  const [activeWeek, setActiveWeek] = useState(0);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    getRoadmap(id)
      .then(r => {
        setRoadmap(r.data.roadmap);
        // Auto-open first incomplete day
        const first = r.data.roadmap.days.find(d => !d.completed);
        if (first) setActiveDay(first.day);
      })
      .catch(() => navigate('/roadmap'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggle = async (day) => {
    setToggling(day);
    try {
      const res = await markDayComplete(id, day);
      setRoadmap(res.data.roadmap);
    } finally {
      setToggling(null);
    }
  };

  if (loading) return (
    <AppShell title="Loading Roadmap..." subtitle="Fetching your learning plan">
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    </AppShell>
  );

  if (!roadmap) return null;

  const weeks = [0, 1, 2, 3].map(w => roadmap.days.slice(w * 7, w * 7 + 7));
  const progress = roadmap.totalDays > 0 ? (roadmap.completedDays / roadmap.totalDays) * 100 : 0;

  return (
    <AppShell title={roadmap.title} subtitle={roadmap.summary}>
      {/* Stats bar */}
      <div className="glass-card p-5 mb-6 flex flex-wrap gap-6 items-center">
        <ProgressRing percent={progress} size={80} />
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{roadmap.completedDays}</p>
            <p className="text-xs text-slate-400">Days Done</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{roadmap.totalDays - roadmap.completedDays}</p>
            <p className="text-xs text-slate-400">Days Left</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{roadmap.totalDays}</p>
            <p className="text-xs text-slate-400">Total Days</p>
          </div>
          <div className="text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              roadmap.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
              roadmap.status === 'active' ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700 text-slate-400'
            }`}>
              {roadmap.status.toUpperCase()}
            </span>
            <p className="text-xs text-slate-400 mt-1">Status</p>
          </div>
        </div>
        {roadmap.weakTopics?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1">Weak Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {roadmap.weakTopics.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs border border-rose-500/30">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Week Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, i) => (
          <button key={i}
            onClick={() => setActiveWeek(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeWeek === i ? 'bg-brand-500 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {w} ({weeks[i]?.filter(d => d.completed).length}/{weeks[i]?.length})
          </button>
        ))}
      </div>

      {/* Day Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(weeks[activeWeek] || []).map(day => (
          <DayCard
            key={day.day}
            dayData={day}
            isActive={activeDay === day.day}
            onClick={() => setActiveDay(activeDay === day.day ? null : day.day)}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </AppShell>
  );
}
