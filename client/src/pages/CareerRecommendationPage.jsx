import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCareerRecommendation } from '../api/interviewApi';
import AppShell from '../components/AppShell';

// ─── Tiny helpers ────────────────────────────────────────────────────────────
const priorityColor = {
  High: 'bg-rose-500/20 border-rose-500/40 text-rose-200',
  Medium: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
  Low: 'bg-slate-700/60 border-slate-600 text-slate-300',
};

const difficultyColor = {
  Beginner: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
  Intermediate: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
  Advanced: 'bg-rose-500/20 border-rose-500/40 text-rose-200',
};

const resourceTypeIcon = {
  Practice: '💻',
  Reading: '📖',
  'Mock Interview': '🎤',
  'Problem List': '📋',
};

function ScoreMeter({ value, label, colorClass = 'from-brand-600 to-cyan-400' }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-bold text-white">{safe}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function ReadinessGauge({ score }) {
  const safe = Math.max(0, Math.min(100, Math.round(score || 0)));
  const color = safe >= 75 ? '#22c55e' : safe >= 50 ? '#f97316' : '#f43f5e';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white">{safe}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color }}>
        {safe >= 75 ? 'Interview Ready 🚀' : safe >= 50 ? 'Getting There 💪' : 'Needs Work 📚'}
      </p>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function CareerRecommendationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('paths');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getCareerRecommendation(id);
        setRecommendation(data.recommendation);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate career recommendation.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const tabs = [
    { key: 'paths', label: 'Career Paths', icon: '🎯' },
    { key: 'roadmap', label: 'Learning Roadmap', icon: '🗺️' },
    { key: 'certifications', label: 'Certifications', icon: '🏅' },
    { key: 'projects', label: 'Projects', icon: '🛠️' },
    { key: 'prep', label: 'Interview Prep', icon: '🎤' },
  ];

  const r = recommendation;

  return (
    <AppShell
      title="AI Career Recommendation"
      subtitle="Personalised career guidance based on your interview performance."
    >
      {/* Back button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(`/report/${id}`)}
          className="secondary-btn text-sm flex items-center gap-2"
        >
          ← Back to Report
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <div>
            <p className="text-white font-semibold text-lg">Analysing Your Performance…</p>
            <p className="text-slate-400 text-sm mt-1">Our AI is crafting your personalised career roadmap.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-6 text-rose-400 border border-rose-500/30">
          <p className="font-semibold">⚠ {error}</p>
          <button type="button" className="secondary-btn mt-4 text-sm" onClick={() => navigate(`/report/${id}`)}>
            Return to Report
          </button>
        </div>
      )}

      {/* Content */}
      {r && !isLoading && (
        <div className="space-y-6">

          {/* ── Hero summary ─────────────────────────────────────────────── */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap gap-6 items-center justify-between">
              <div className="flex-1 min-w-64">
                <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">AI Summary</p>
                <p className="text-slate-100 leading-relaxed text-sm">{r.summary}</p>

                {/* Weak skills */}
                {r.weakSkills?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Skills to Strengthen</p>
                    <div className="flex flex-wrap gap-2">
                      {r.weakSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-0.5 text-xs font-medium text-rose-200"
                        >
                          ⚠ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
                <ReadinessGauge score={r.overallReadinessScore} />
                <p className="text-xs text-slate-400 text-center">Overall Readiness</p>
              </div>
            </div>
          </div>

          {/* ── Tab bar ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Career Paths ─────────────────────────────────────────── */}
          {activeTab === 'paths' && (
            <div className="space-y-4">
              <SectionHeader
                icon="🎯"
                title="Recommended Career Paths"
                subtitle="AI-matched roles based on your skills, answers, and performance scores."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {r.careerPaths?.map((path, i) => (
                  <div
                    key={path.title}
                    className={`glass-card p-5 ${i === 0 ? 'border-brand-500/40 ring-1 ring-brand-500/20' : ''}`}
                  >
                    {i === 0 && (
                      <span className="inline-block rounded-full bg-brand-500/20 border border-brand-500/40 px-2.5 py-0.5 text-[11px] font-bold text-brand-200 mb-3">
                        ⭐ Best Match
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{path.icon}</span>
                      <div>
                        <p className="font-bold text-white text-base">{path.title}</p>
                        <p className="text-xs text-slate-400">Match Score</p>
                      </div>
                      <div className="ml-auto text-right">
                        <span className="text-2xl font-black text-brand-300">{path.matchScore}</span>
                        <span className="text-slate-400 text-xs">/100</span>
                      </div>
                    </div>

                    <ScoreMeter
                      value={path.matchScore}
                      label=""
                      colorClass={i === 0 ? 'from-brand-600 to-cyan-400' : 'from-slate-600 to-slate-400'}
                    />

                    <p className="text-xs text-slate-300 mt-3 mb-3">{path.description}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {path.requiredSkills?.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-800 border border-slate-600 px-2.5 py-0.5 text-[11px] text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Learning Roadmap ─────────────────────────────────────── */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <SectionHeader
                icon="🗺️"
                title="Learning Roadmap"
                subtitle="A structured month-by-month plan to close your skill gaps."
              />
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-brand-500 via-cyan-500 to-emerald-500 hidden md:block" />
                <div className="space-y-4">
                  {r.learningRoadmap?.map((phase, i) => (
                    <div key={phase.phase} className="flex gap-5 items-start">
                      {/* Circle node */}
                      <div className="hidden md:flex flex-shrink-0 w-11 h-11 rounded-full items-center justify-center text-sm font-black text-white z-10"
                        style={{ background: `hsl(${200 + i * 40}, 80%, 55%)` }}
                      >
                        {i + 1}
                      </div>
                      <div className="glass-card p-4 flex-1">
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <span className="rounded-full bg-brand-500/15 border border-brand-500/30 px-3 py-0.5 text-xs font-bold text-brand-200">
                            {phase.phase}
                          </span>
                          <p className="font-semibold text-white text-sm">{phase.title}</p>
                        </div>
                        <ul className="space-y-1.5">
                          {phase.tasks?.map((task) => (
                            <li key={task} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-brand-400 mt-0.5">✓</span>
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Certifications ───────────────────────────────────────── */}
          {activeTab === 'certifications' && (
            <div className="space-y-4">
              <SectionHeader
                icon="🏅"
                title="Recommended Certifications"
                subtitle="Industry-recognised credentials to strengthen your profile."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {r.certifications?.map((cert) => (
                  <div key={cert.name} className="glass-card p-4 hover:border-brand-500/40 transition group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-white text-sm group-hover:text-brand-200 transition">{cert.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{cert.provider}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityColor[cert.priority] || priorityColor.Low}`}>
                        {cert.priority} Priority
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-800 border border-slate-600 px-2.5 py-0.5 text-[11px] text-slate-300">
                        {cert.level}
                      </span>
                      {cert.url && (
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-400 hover:text-brand-200 font-semibold transition"
                        >
                          Learn More →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Projects ─────────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <SectionHeader
                icon="🛠️"
                title="Portfolio Project Ideas"
                subtitle="Build these to showcase skills and fill gaps in your portfolio."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {r.projects?.map((project) => (
                  <div key={project.title} className="glass-card p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-white text-sm leading-tight">{project.title}</p>
                      <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${difficultyColor[project.difficulty] || difficultyColor.Beginner}`}>
                        {project.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 flex-1 mb-3">{project.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.skills?.map((skill) => (
                        <span key={skill} className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[11px] text-brand-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Interview Prep ───────────────────────────────────────── */}
          {activeTab === 'prep' && r.interviewPrepPlan && (
            <div className="space-y-4">
              <SectionHeader
                icon="🎤"
                title="Interview Preparation Plan"
                subtitle="A daily & weekly action plan to get you ready for your next interview."
              />

              {/* Goals */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">📅 Weekly Goal</p>
                  <p className="text-white font-semibold">{r.interviewPrepPlan.weeklyGoal}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">☀️ Daily Practice</p>
                  <p className="text-white font-semibold">{r.interviewPrepPlan.dailyPractice}</p>
                </div>
              </div>

              {/* Focus Areas */}
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">🎯 Focus Areas</p>
                <div className="flex flex-wrap gap-2">
                  {r.interviewPrepPlan.focusAreas?.map((area) => (
                    <span
                      key={area}
                      className="rounded-xl bg-brand-500/15 border border-brand-500/30 px-3 py-1.5 text-sm font-semibold text-brand-200"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">📚 Recommended Resources</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {r.interviewPrepPlan.resources?.map((res) => (
                    <a
                      key={res.name}
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-slate-800/70 border border-slate-700 px-4 py-3 hover:border-brand-500/40 hover:bg-slate-800 transition group"
                    >
                      <span className="text-xl">{resourceTypeIcon[res.type] || '🔗'}</span>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-brand-200 transition">{res.name}</p>
                        <p className="text-[11px] text-slate-400">{res.type}</p>
                      </div>
                      <span className="ml-auto text-slate-500 group-hover:text-brand-400 transition text-lg">→</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <div className="glass-card p-5 flex flex-wrap gap-3 items-center justify-between border-brand-500/20">
            <div>
              <p className="font-semibold text-white">Ready to start your next interview?</p>
              <p className="text-sm text-slate-400">Apply this roadmap and practice with another AI mock session.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" className="primary-btn" onClick={() => navigate('/setup')}>
                Start New Interview
              </button>
              <button type="button" className="secondary-btn" onClick={() => navigate(`/report/${id}`)}>
                Back to Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default CareerRecommendationPage;
