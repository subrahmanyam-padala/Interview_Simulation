import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyInterviewHistory } from '../api/interviewApi';
import AppShell from '../components/AppShell';
import { difficultyBadge, formatDateTime } from '../utils/format';

function HistoryPage() {
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

  return (
    <AppShell title="Interview History" subtitle="Review all your interview sessions and scores.">
      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Topic</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-300" colSpan={7}>
                    Loading history...
                  </td>
                </tr>
              ) : null}

              {!loading && !history.length ? (
                <tr>
                  <td className="px-4 py-4 text-slate-300" colSpan={7}>
                    No records found.
                  </td>
                </tr>
              ) : null}

              {history.map((item) => (
                <tr key={item._id} className="border-t border-slate-700/60 text-slate-200">
                  <td className="px-4 py-3">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">{item.setup?.jobRole}</td>
                  <td className="px-4 py-3">{item.setup?.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs ${difficultyBadge(item.setup?.difficulty)}`}>
                      {item.setup?.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.overallScores?.communication || 0}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={item.status === 'completed' ? `/report/${item._id}` : `/interview/${item._id}`}
                      className="font-semibold text-brand-100 hover:text-white"
                    >
                      {item.status === 'completed' ? 'Report' : 'Continue'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

export default HistoryPage;
