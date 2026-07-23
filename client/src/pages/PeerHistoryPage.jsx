import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { getPeerHistory } from '../api/peerApi';

const PeerHistoryPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getPeerHistory();
        setInterviews(res.interviews || []);
      } catch (err) {
        console.error('Failed to load peer history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <AppShell title="Peer Interview History" subtitle="View ratings, feedback, and report logs from past peer mock interviews.">
      <div className="space-y-6">
        <button
          onClick={() => navigate('/peer')}
          className="secondary-btn text-xs px-3 py-1.5 flex items-center gap-1.5 mb-4"
        >
          ← Back to Candidates Lobby
        </button>

        {loading ? (
          <p className="text-slate-400">Loading history logs...</p>
        ) : interviews.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400">
            No completed peer interviews found yet.
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((item) => (
              <div key={item._id} className="glass-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Room #{item.roomId}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Completed on {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase">
                    {item.status}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <h4 className="text-xs font-bold text-brand-400 uppercase mb-1">
                      Interviewer Evaluation
                    </h4>
                    <p className="text-xs text-slate-300">
                      {item.reports?.interviewerReport || 'No report available'}
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase mb-1">
                      Interviewee Evaluation
                    </h4>
                    <p className="text-xs text-slate-300">
                      {item.reports?.intervieweeReport || 'No report available'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default PeerHistoryPage;
