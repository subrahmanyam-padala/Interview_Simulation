import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getMyInterviewHistory } from '../api/interviewApi';
import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import { formatDateTime } from '../utils/format';

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
      if (!completed.length) {
        return 0;
      }
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
      const content = scores.content || 0;
      const communication = scores.communication || 0;
      const confidence = scores.confidence || 0;
      const clarity = scores.clarity || 0;
      const fluency = scores.fluency || 0;
      const averageScore = Math.round((content + communication + confidence + clarity + fluency) / 5);

      return {
        id: item._id,
        session: `S${index + 1}`,
        date: new Date(item.createdAt).toLocaleDateString(),
        content,
        communication,
        confidence,
        averageScore,
        role: item.setup?.jobRole || 'Interview',
      };
    });
  }, [history]);

  return (
    <AppShell title="Dashboard" subtitle="Track your interview preparation performance over time.">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Interviews" value={stats.total} />
        <MetricCard label="Completed" value={stats.completed} />
        <MetricCard label="Average Content" value={stats.content} hint="Out of 100" />
        <MetricCard label="Average Confidence" value={stats.confidence} hint="Out of 100" />
      </section>

      {/* ── AI Coach CTA ─────────────────────────────────────────────────── */}
      <section className="mt-6 glass-card p-5 border-brand-500/30 bg-gradient-to-r from-brand-500/8 to-cyan-500/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
              🤖
            </div>
            <div>
              <p className="font-bold text-white text-base">AI Interview Coach</p>
              <p className="text-sm text-slate-300 mt-0.5">
                Ask about Java Threads, JWT vs OAuth, system design, STAR method — get instant coaching.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/coach"
              className="rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-5 py-2.5 font-bold text-white shadow-lg hover:from-brand-500 hover:to-cyan-400 transition flex items-center gap-2 text-sm"
            >
              <span>✨</span> Open Coach
            </Link>
            <Link to="/setup" className="secondary-btn text-sm">
              Start Interview
            </Link>
          </div>
        </div>

        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['💡 Java Threads', '🔐 JWT vs OAuth', '🎤 Communication Tips', '⚙️ System Design', '🌟 STAR Method', '🧠 DSA Strategy'].map((chip) => (
            <Link
              key={chip}
              to="/coach"
              className="rounded-full bg-slate-800/80 border border-slate-700 hover:border-brand-500/50 px-3 py-1 text-xs text-slate-300 hover:text-white transition"
            >
              {chip}
            </Link>
          ))}
        </div>
      </section>

      <section className="glass-card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Performance History Dashboard</h2>
        </div>

        {!performanceTrend.length ? (
          <p className="text-slate-300">Complete at least one interview to see score history and improvement trend.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="mb-2 text-sm text-slate-300">Line Chart of Improvement</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="session" tick={{ fill: '#cbd5e1' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                    <Tooltip
                      formatter={(value) => [`${value}`, 'Score']}
                      labelFormatter={(label, payload) => {
                        const date = payload?.[0]?.payload?.date || '';
                        return `${label} (${date})`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="averageScore" name="Average Score" stroke="#22d3ee" strokeWidth={3} />
                    <Line type="monotone" dataKey="communication" name="Communication" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="confidence" name="Confidence" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="mb-2 text-sm text-slate-300">Previous Interview Scores</p>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {performanceTrend.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{row.session}</p>
                      <p className="text-xs text-slate-400">{row.date}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{row.role}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200">
                      <span>Avg: {row.averageScore}</span>
                      <span>Content: {row.content}</span>
                      <span>Comm: {row.communication}</span>
                      <span>Confidence: {row.confidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="glass-card mt-6 p-5">
        <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="font-display text-xl text-white">Recent Interviews</h2>
          <div className="flex gap-2">
            <Link to="/schedule" className="secondary-btn flex items-center gap-2">
              <span>📅</span> Schedule
            </Link>
            <Link to="/setup" className="primary-btn">
              Start New Interview
            </Link>
          </div>
        </div>

        {loading ? <p className="text-slate-300">Loading history...</p> : null}
        {!loading && !history.length ? <p className="text-slate-300">No interview found. Start your first one.</p> : null}

        <div className="space-y-3">
          {history.slice(0, 8).map((item) => (
            <div key={item._id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">
                    {item.setup?.jobRole} | {item.setup?.topic} {item.setup?.targetCompany ? `| ${item.setup.targetCompany}` : ''}
                  </p>
                  <p className="text-sm text-slate-400">{formatDateTime(item.createdAt)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                      item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    {item.status}
                  </span>

                  <Link
                    to={item.status === 'completed' ? `/report/${item._id}` : `/interview/${item._id}`}
                    className="text-sm font-semibold text-brand-100 hover:text-white"
                  >
                    {item.status === 'completed' ? 'View Report' : 'Continue'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

export default DashboardPage;
