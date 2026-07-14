import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (val) => {
  if (val >= 80) return '#22c55e';
  if (val >= 60) return '#f97316';
  return '#ef4444';
};

const ScoreBadge = ({ label, value, icon }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 text-center">
    <span className="text-2xl">{icon}</span>
    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.915" fill="none"
          stroke={scoreColor(value)} strokeWidth="3"
          strokeDasharray={`${value} ${100 - value}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{value}</span>
    </div>
  </div>
);

const StatPill = ({ label, value, sub, colorClass = 'text-brand-400' }) => (
  <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function VoiceAnalyticsDashboard({ responses = [] }) {
  // Aggregate voice metrics across all responses
  const aggregate = useMemo(() => {
    if (!responses.length) return null;

    const valid = responses.filter(r => r.voiceMetrics && r.voiceMetrics.wpm > 0);
    if (!valid.length) return null;

    const avg = (key) => Math.round(valid.reduce((s, r) => s + (r.voiceMetrics[key] || 0), 0) / valid.length);
    const sum = (key) => valid.reduce((s, r) => s + (r.voiceMetrics[key] || 0), 0);

    const avgWpm = avg('wpm');
    const classifySpeed = (wpm) => {
      if (wpm < 80)  return { label: 'Too Slow', color: '#f59e0b' };
      if (wpm < 110) return { label: 'Slow', color: '#eab308' };
      if (wpm < 150) return { label: 'Ideal', color: '#22c55e' };
      if (wpm < 180) return { label: 'Fast', color: '#f97316' };
      return { label: 'Too Fast', color: '#ef4444' };
    };

    return {
      avgWpm,
      speedInfo: classifySpeed(avgWpm),
      totalFillers: sum('fillerWordCount'),
      totalPauses: sum('pauseCount'),
      avgClarity: avg('clarityScore'),
      avgFluency: avg('fluencyScore'),
      avgConfidence: avg('confidenceScore') || avg('clarityScore'), // fallback
      avgVolume: avg('volumeStability'),
    };
  }, [responses]);

  // Per-question timeline data
  const timelineData = useMemo(() =>
    responses.map((r, i) => ({
      name: `Q${i + 1}`,
      WPM: r.voiceMetrics?.wpm || 0,
      Clarity: r.voiceMetrics?.clarityScore || 0,
      Fluency: r.voiceMetrics?.fluencyScore || 0,
      Fillers: r.voiceMetrics?.fillerWordCount || 0,
      Pauses: r.voiceMetrics?.pauseCount || 0,
    })),
  [responses]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!aggregate) return [];
    return [
      { metric: 'Clarity', score: aggregate.avgClarity },
      { metric: 'Fluency', score: aggregate.avgFluency },
      { metric: 'Confidence', score: aggregate.avgConfidence },
      { metric: 'Volume', score: aggregate.avgVolume },
      { metric: 'Speed', score: aggregate.speedInfo.label === 'Ideal' ? 90 : 55 },
    ];
  }, [aggregate]);

  // Filler word bar chart
  const fillerData = useMemo(() => {
    const acc = {};
    responses.forEach(r => {
      // If per-response filler breakdown exists
      if (r.voiceMetrics?.fillerBreakdown) {
        Object.entries(r.voiceMetrics.fillerBreakdown).forEach(([word, count]) => {
          acc[word] = (acc[word] || 0) + count;
        });
      }
    });
    return Object.entries(acc)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [responses]);

  if (!responses.length) return null;

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎙️</span>
        <h2 className="font-display text-2xl text-white">Voice Analytics</h2>
      </div>

      {/* Score Badges Row */}
      {aggregate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreBadge label="Clarity" value={aggregate.avgClarity} icon="🔈" />
          <ScoreBadge label="Fluency" value={aggregate.avgFluency} icon="🌊" />
          <ScoreBadge label="Confidence" value={aggregate.avgConfidence} icon="💪" />
          <ScoreBadge label="Volume Stability" value={aggregate.avgVolume} icon="📢" />
        </div>
      )}

      {/* Stat Pills */}
      {aggregate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill
            label="Avg. Speaking Speed"
            value={`${aggregate.avgWpm} WPM`}
            sub={aggregate.speedInfo.label}
            colorClass={aggregate.speedInfo.label === 'Ideal' ? 'text-emerald-400' : 'text-orange-400'}
          />
          <StatPill label="Total Filler Words" value={aggregate.totalFillers} sub="across all answers" colorClass="text-rose-400" />
          <StatPill label="Total Pauses" value={aggregate.totalPauses} sub="detected" colorClass="text-amber-400" />
          <StatPill label="Questions Analyzed" value={responses.filter(r => r.voiceMetrics?.wpm > 0).length} sub={`of ${responses.length}`} colorClass="text-brand-400" />
        </div>
      )}

      {/* Charts Row 1: Radar + WPM Timeline */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Radar Chart */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-semibold text-slate-300">🕸️ Voice Profile</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                <Tooltip formatter={(v) => [`${v}`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WPM Timeline */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-semibold text-slate-300">⏱️ Speaking Speed per Question (WPM)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                <YAxis domain={[0, 250]} tick={{ fill: '#cbd5e1' }} />
                <Tooltip />
                <Line type="monotone" dataKey="WPM" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} isAnimationActive={false} />
                {/* Ideal range reference */}
                <Line type="monotone" data={timelineData.map(d => ({ ...d, Ideal: 130 }))} dataKey="Ideal" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-2">🟢 Dashed line = Ideal speed (130 WPM)</p>
        </div>
      </div>

      {/* Charts Row 2: Clarity/Fluency timeline + Filler Words */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Clarity & Fluency Timeline */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-semibold text-slate-300">📈 Clarity & Fluency Trend</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Clarity" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="Fluency" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filler Words Breakdown */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-semibold text-slate-300">🚧 Filler Word Usage</p>
          {fillerData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#cbd5e1' }} allowDecimals={false} />
                  <YAxis dataKey="word" type="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {fillerData.map((_, i) => (
                      <Cell key={i} fill={['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b'][i % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <span className="text-4xl mb-3">🎉</span>
              <p className="text-sm font-semibold text-emerald-400">No filler words detected!</p>
              <p className="text-xs mt-1">Excellent speaking discipline.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pauses per question bar chart */}
      <div className="glass-card p-4">
        <p className="mb-3 text-sm font-semibold text-slate-300">⏸️ Pauses & Filler Words per Question</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#cbd5e1' }} />
              <YAxis tick={{ fill: '#cbd5e1' }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Pauses" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Fillers" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speed Range Legend */}
      <div className="glass-card p-4">
        <p className="mb-3 text-sm font-semibold text-slate-300">🏃 Speaking Speed Guide</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: '< 80 WPM', tag: 'Too Slow', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { label: '80–110 WPM', tag: 'Slow', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            { label: '110–150 WPM', tag: '✓ Ideal', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { label: '150–180 WPM', tag: 'Fast', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
            { label: '> 180 WPM', tag: 'Too Fast', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
          ].map(s => (
            <div key={s.label} className={`px-3 py-2 rounded-xl border text-xs font-semibold ${s.color}`}>
              <p>{s.label}</p><p className="font-bold">{s.tag}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
