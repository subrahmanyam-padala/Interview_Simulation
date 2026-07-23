import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import {
  getRecruiterInterviews,
  scheduleRecruiterInterview,
} from '../api/recruiterApi';

const RecruiterDashboardPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [jobRole, setJobRole] = useState('Senior Full Stack Engineer');
  const [scheduledAt, setScheduledAt] = useState('');

  const navigate = useNavigate();

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await getRecruiterInterviews();
      setInterviews(res.interviews || []);
    } catch (err) {
      console.error('Failed to load recruiter interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await scheduleRecruiterInterview({
        candidateName,
        candidateEmail,
        jobRole,
        scheduledAt,
      });
      alert('Interview scheduled and candidate invitation dispatched!');
      setShowScheduleModal(false);
      setCandidateName('');
      setCandidateEmail('');
      fetchInterviews();
    } catch (err) {
      alert('Failed to schedule interview.');
    }
  };

  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter((i) => i.status === 'completed').length;
  const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled').length;

  return (
    <AppShell
      title="Recruiter Live Interview Portal"
      subtitle="Schedule, conduct, and score live video technical interviews with candidates."
    >
      <div className="space-y-6">
        {/* Metric Cards Header */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Scheduled Interviews" value={totalInterviews} />
          <MetricCard label="Upcoming Interviews" value={scheduledInterviews} />
          <MetricCard label="Completed Evaluations" value={completedInterviews} />
        </div>

        {/* Action Header */}
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Live Candidate Interviews</h2>
            <p className="text-xs text-slate-400">Manage invitations, enter video rooms, and record scores.</p>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="primary-btn py-2 px-4 text-sm font-bold flex items-center gap-2"
          >
            <span>📅</span> Schedule Live Interview
          </button>
        </div>

        {/* Candidate Interviews Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading interview schedule...</div>
          ) : interviews.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No interviews scheduled yet. Click "Schedule Live Interview" to invite candidate.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Scores (C / T / P / Code)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {interviews.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-900/60 transition">
                      <td className="px-4 py-3 font-semibold text-white">
                        {item.candidateName}
                        <span className="block text-[11px] font-normal text-slate-400">{item.candidateEmail}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-brand-300">{item.jobRole}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(item.scheduledAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.scores ? (
                          <span className="font-mono text-emerald-400">
                            {item.scores.communication} / {item.scores.technicalKnowledge} / {item.scores.problemSolving} / {item.scores.coding}
                          </span>
                        ) : (
                          <span className="text-slate-500">Not Scored</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/recruiter/room/${item.roomId}`)}
                          className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold transition shadow"
                        >
                          Join Live Room →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedule Interview Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-xl font-bold text-white">Schedule Candidate Live Interview</h3>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Candidate Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Candidate Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="candidate@company.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Target Job Role
                  </label>
                  <input
                    type="text"
                    required
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="secondary-btn text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn text-sm font-bold">
                    Schedule & Send Email Invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default RecruiterDashboardPage;
