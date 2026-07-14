import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteRoadmap, generateRoadmap, getMyRoadmaps } from '../api/roadmapApi';
import AppShell from '../components/AppShell';

const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Engineer', 'ML Engineer', 'DevOps Engineer', 'Cloud Engineer', 'Data Analyst'];

function GenerateModal({ onClose, onGenerate, loading }) {
  const [mode, setMode] = useState('manual'); // manual | interview
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [weakTopics, setWeakTopics] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const topics = weakTopics.split(',').map(t => t.trim()).filter(Boolean);
    onGenerate({ targetRole, weakTopics: topics });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-white">Generate Learning Roadmap</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Target Role</label>
            <select
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              className="soft-input"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              Weak Topics <span className="text-slate-500 font-normal">(comma-separated)</span>
            </label>
            <textarea
              value={weakTopics}
              onChange={e => setWeakTopics(e.target.value)}
              className="soft-input resize-none"
              rows={3}
              placeholder="e.g. System Design, React Hooks, SQL Joins, REST APIs"
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank to generate based on your role</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="secondary-btn flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="primary-btn flex-1 flex items-center justify-center gap-2">
              {loading ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : '🗺️ Generate 30-Day Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoadmapCard({ roadmap, onDelete }) {
  const progress = roadmap.totalDays > 0 ? (roadmap.completedDays / roadmap.totalDays) * 100 : 0;

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-brand-400 font-semibold mb-1">📅 30-Day Plan</p>
          <h3 className="font-display text-lg text-white leading-tight">{roadmap.title}</h3>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{roadmap.summary}</p>
        </div>
        <button
          onClick={() => onDelete(roadmap._id)}
          className="text-slate-500 hover:text-rose-400 transition flex-shrink-0"
          title="Delete"
        >
          🗑️
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{roadmap.completedDays}/{roadmap.totalDays} days</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tags */}
      {roadmap.weakTopics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {roadmap.weakTopics.slice(0, 4).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs border border-rose-500/20">{t}</span>
          ))}
          {roadmap.weakTopics.length > 4 && <span className="text-xs text-slate-500">+{roadmap.weakTopics.length - 4}</span>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          roadmap.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
          roadmap.status === 'active' ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700 text-slate-400'
        }`}>
          {roadmap.status.toUpperCase()}
        </span>
        <Link to={`/roadmap/${roadmap._id}`} className="primary-btn text-sm py-1.5 px-4">
          View Plan →
        </Link>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMyRoadmaps()
      .then(r => setRoadmaps(r.data.roadmaps))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (data) => {
    setGenerating(true);
    try {
      const res = await generateRoadmap(data);
      setShowModal(false);
      navigate(`/roadmap/${res.data.roadmap._id}`);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to generate roadmap');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this roadmap?')) return;
    await deleteRoadmap(id);
    setRoadmaps(p => p.filter(r => r._id !== id));
  };

  return (
    <AppShell title="🗺️ Learning Roadmaps" subtitle="AI-generated 30-day personalized plans based on your weak topics">

      {/* Hero CTA */}
      <div className="glass-card p-6 mb-6 bg-gradient-to-r from-brand-900/40 to-violet-900/40 border-brand-500/30 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-white">Generate Your Personalized Roadmap</h2>
          <p className="text-slate-400 text-sm mt-1">
            AI analyzes your weak topics and builds a custom 30-day plan with YouTube videos, docs, projects & practice questions.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="primary-btn whitespace-nowrap">
          ✨ New Roadmap
        </button>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['📺 YouTube Resources', '📄 Official Docs', '🔨 Daily Projects', '❓ Practice Questions', '✅ Progress Tracking'].map(f => (
          <span key={f} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-300">{f}</span>
        ))}
      </div>

      {/* Roadmaps grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-xl font-semibold text-slate-300 mb-2">No roadmaps yet</p>
          <p className="mb-6">Generate your first personalized 30-day learning plan!</p>
          <button onClick={() => setShowModal(true)} className="primary-btn">
            ✨ Generate Roadmap
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map(r => (
            <RoadmapCard key={r._id} roadmap={r} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <GenerateModal
          loading={generating}
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
        />
      )}
    </AppShell>
  );
}
