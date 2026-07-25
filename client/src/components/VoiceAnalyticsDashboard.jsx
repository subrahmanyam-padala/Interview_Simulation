import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { Mic, Activity, Volume2, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (val) => {
  if (val >= 80) return '#16A34A'; // Success green
  if (val >= 60) return '#F59E0B'; // Warning orange
  return '#EF4444'; // Danger red
};

const ScoreBadge = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-2 rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2 text-[#64748B]">
        <Icon className="w-4 h-4 text-[#2563EB]" />
        <span className="text-[12px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-[14px] font-bold`} style={{ color: scoreColor(value) }}>{value}</span>
    </div>
    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 mt-1 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value}%`, backgroundColor: scoreColor(value) }} />
    </div>
  </div>
);

const StatPill = ({ label, value, sub, colorClass = 'text-[#2563EB]' }) => (
  <div className="rounded-[12px] border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
    <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-[20px] font-bold ${colorClass}`}>{value}</p>
    {sub && <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">{sub}</p>}
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
      if (wpm < 80)  return { label: 'Too Slow', color: '#F59E0B', textClass: 'text-[#F59E0B]' };
      if (wpm < 110) return { label: 'Slow', color: '#FCD34D', textClass: 'text-[#F59E0B]' };
      if (wpm < 150) return { label: 'Ideal', color: '#16A34A', textClass: 'text-[#16A34A]' };
      if (wpm < 180) return { label: 'Fast', color: '#F97316', textClass: 'text-[#F59E0B]' };
      return { label: 'Too Fast', color: '#EF4444', textClass: 'text-[#EF4444]' };
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

  const cardStyle = "bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)]";

  return (
    <div className="space-y-4">
      {/* Score Badges Row */}
      {aggregate && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ScoreBadge label="Clarity" value={aggregate.avgClarity} icon={Activity} />
          <ScoreBadge label="Fluency" value={aggregate.avgFluency} icon={TrendingUp} />
          <ScoreBadge label="Confidence" value={aggregate.avgConfidence} icon={CheckCircle} />
          <ScoreBadge label="Volume" value={aggregate.avgVolume} icon={Volume2} />
        </div>
      )}

      {/* Stat Pills */}
      {aggregate && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            label="Avg. Speed"
            value={`${aggregate.avgWpm} WPM`}
            sub={aggregate.speedInfo.label}
            colorClass={aggregate.speedInfo.textClass}
          />
          <StatPill label="Filler Words" value={aggregate.totalFillers} sub="across all answers" colorClass="text-[#EF4444]" />
          <StatPill label="Total Pauses" value={aggregate.totalPauses} sub="detected" colorClass="text-[#F59E0B]" />
          <StatPill label="Questions" value={responses.filter(r => r.voiceMetrics?.wpm > 0).length} sub={`of ${responses.length}`} colorClass="text-[#2563EB]" />
        </div>
      )}

      {/* Charts Row 1: Radar + WPM Timeline */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Radar Chart */}
        <div className={cardStyle}>
          <p className="mb-2 text-[13px] font-bold text-[#64748B] flex items-center gap-2"><Activity className="w-4 h-4"/> Voice Profile</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <PolarGrid stroke="#F1F5F9" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Radar name="Score" dataKey="score" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WPM Timeline */}
        <div className={cardStyle}>
          <p className="mb-2 text-[13px] font-bold text-[#64748B] flex items-center gap-2"><Clock className="w-4 h-4"/> Speaking Speed (WPM)</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 250]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                <Line type="monotone" dataKey="WPM" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, fill: '#2563EB' }} isAnimationActive={false} />
                <Line type="monotone" data={timelineData.map(d => ({ ...d, Ideal: 130 }))} dataKey="Ideal" stroke="#16A34A" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Clarity/Fluency timeline + Filler Words */}
      <div className="grid gap-3 xl:grid-cols-2">
        {/* Clarity & Fluency Timeline */}
        <div className={cardStyle}>
          <p className="mb-2 text-[13px] font-bold text-[#64748B] flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Clarity & Fluency Trend</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Clarity" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="Fluency" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filler Words Breakdown */}
        <div className={cardStyle}>
          <p className="mb-2 text-[13px] font-bold text-[#64748B] flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Filler Word Usage</p>
          {fillerData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillerData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis dataKey="word" type="category" tick={{ fill: '#64748B', fontSize: 11 }} width={50} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {fillerData.map((_, i) => (
                      <Cell key={i} fill={['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B'][i % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-[#64748B]">
              <CheckCircle className="w-8 h-8 text-[#16A34A] mb-2" />
              <p className="text-[14px] font-bold text-[#16A34A]">No filler words detected!</p>
              <p className="text-[12px] mt-1">Excellent speaking discipline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
