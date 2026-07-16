import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setupInterview } from '../api/interviewApi';
import AppShell from '../components/AppShell';

function InterviewSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    interviewType: 'technical',
    jobRole: 'Software Engineer',
    topic: 'System Design',
    difficulty: 'medium',
    interviewerGender: 'female',
    questionCount: 5,
    targetCompany: '',
    resumeBased: false,
    resumeId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.resumeId) {
      setForm((prev) => ({ ...prev, resumeId: location.state.resumeId, resumeBased: true }));
    }
  }, [location]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { 
        ...form, 
        questionCount: Number(form.questionCount),
        resumeId: form.resumeBased ? form.resumeId : undefined 
      };
      const response = await setupInterview(payload);
      navigate(`/interview/${response.interviewId}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to setup interview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Interview Setup" subtitle="Configure your simulation before starting.">
      <section className="glass-card p-6 max-w-3xl">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Interview Type
            <select
              className="soft-input mt-2"
              value={form.interviewType}
              onChange={(event) => setForm((prev) => ({ ...prev, interviewType: event.target.value }))}
            >
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="mixed">Mixed</option>
              <option value="coding">Coding (Algorithm & Data Structures)</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Target Role
            <input
              className="soft-input mt-2"
              value={form.jobRole}
              onChange={(event) => setForm((prev) => ({ ...prev, jobRole: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm text-slate-300">
            Target Company (Optional)
            <select
              className="soft-input mt-2"
              value={form.targetCompany}
              onChange={(event) => setForm((prev) => ({ ...prev, targetCompany: event.target.value }))}
            >
              <option value="">None / General</option>
              <option value="Amazon">Amazon (Leadership Principles)</option>
              <option value="Google">Google (Problem Solving)</option>
              <option value="Microsoft">Microsoft (Design & Arch)</option>
              <option value="Accenture">Accenture (Client-Facing)</option>
              <option value="Infosys">Infosys (Consulting & HR)</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Topic
            <input
              className="soft-input mt-2"
              value={form.topic}
              onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
              required
            />
          </label>

          <label className="text-sm text-slate-300">
            Difficulty
            <select
              className="soft-input mt-2"
              value={form.difficulty}
              onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Interviewer Gender
            <select
              className="soft-input mt-2"
              value={form.interviewerGender}
              onChange={(event) => setForm((prev) => ({ ...prev, interviewerGender: event.target.value }))}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Question Count (5-7)
            <input
              type="number"
              min={5}
              max={7}
              className="soft-input mt-2"
              value={form.questionCount}
              onChange={(event) => setForm((prev) => ({ ...prev, questionCount: event.target.value }))}
            />
          </label>

          <label className="text-sm text-slate-300 flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.resumeBased}
              onChange={(event) => setForm((prev) => ({ ...prev, resumeBased: event.target.checked }))}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-800 border-slate-600"
              disabled={!form.resumeId}
            />
            Use Resume for Personalized Questions (Must upload resume first)
            {!form.resumeId && <button type="button" onClick={() => navigate('/resumes')} className="text-cyan-400 hover:underline ml-2">Upload Resume</button>}
          </label>

          {error ? <p className="text-sm text-rose-400 sm:col-span-2">{error}</p> : null}

          <button type="submit" className="primary-btn sm:col-span-2" disabled={loading}>
            {loading ? 'Generating Questions...' : 'Start Interview'}
          </button>
        </form>
      </section>
    </AppShell>
  );
}

export default InterviewSetupPage;
