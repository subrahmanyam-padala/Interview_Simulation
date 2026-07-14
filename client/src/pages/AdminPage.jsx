import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAdminOverview } from '../api/adminApi';
import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';

function AdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getAdminOverview();
        setData(response);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load admin analytics');
      }
    };

    load();
  }, []);

  return (
    <AppShell title="Admin Analytics" subtitle="Platform-level usage and performance overview.">
      {error ? <p className="glass-card p-4 text-rose-400">{error}</p> : null}

      {data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Users" value={data.metrics.userCount} />
            <MetricCard label="Interviews" value={data.metrics.interviewCount} />
            <MetricCard label="Completed" value={data.metrics.completedCount} />
            <MetricCard label="Completion Rate" value={`${data.metrics.completionRate}%`} />
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="glass-card p-4">
              <p className="mb-3 text-sm text-slate-300">Role Distribution</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(data.roleDistribution || []).map((item) => ({ name: item._id, value: item.count }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      fill="#06b6d4"
                      label
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="mb-3 text-sm text-slate-300">Recent Activity (7 days)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.recentActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="_id" tick={{ fill: '#cbd5e1' }} />
                    <YAxis tick={{ fill: '#cbd5e1' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#f97316" fill="#fdba74" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      ) : (
        <p className="glass-card p-4 text-slate-300">Loading analytics...</p>
      )}
    </AppShell>
  );
}

export default AdminPage;
