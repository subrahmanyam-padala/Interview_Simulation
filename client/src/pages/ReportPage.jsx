import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getInterviewReport } from '../api/interviewApi';
import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import { formatDateTime } from '../utils/format';

function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const loadReport = async () => {
    try {
      const data = await getInterviewReport(id);
      setReport(data.report);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load report');
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const onExportAsPdf = async () => {
    if (!reportRef.current) {
      return;
    }

    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`interview-report-${id}.pdf`);
    } catch (exportError) {
      console.error(exportError);
      setError('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const overallData = useMemo(() => {
    if (!report) {
      return [];
    }
    return [
      { metric: 'Content', score: report.overallScores.content },
      { metric: 'Communication', score: report.overallScores.communication },
      { metric: 'Confidence', score: report.overallScores.confidence },
      { metric: 'Clarity', score: report.overallScores.clarity },
      { metric: 'Fluency', score: report.overallScores.fluency },
    ];
  }, [report]);

  const trendData = useMemo(() => {
    if (!report) {
      return [];
    }
    return report.responses.map((item, index) => ({
      question: `Q${index + 1}`,
      content: item.responseScores.content,
      communication: item.responseScores.communication,
      confidence: item.responseScores.confidence,
    }));
  }, [report]);

  return (
    <AppShell title="Final Report" subtitle="AI-evaluated performance insights for your completed interview.">
      {error ? <p className="glass-card p-4 text-rose-400">{error}</p> : null}

      {report ? (
        <>
          <section className="glass-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-slate-300">
                  {report.setup.jobRole} | {report.setup.topic} | {report.setup.difficulty}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Started: {formatDateTime(report.startedAt)} | Completed: {formatDateTime(report.endedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="primary-btn" onClick={onExportAsPdf} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Save PDF Report'}
                </button>
                <button type="button" className="secondary-btn" onClick={onExportAsPdf} disabled={isExporting}>
                  Export as PDF
                </button>
              </div>
            </div>
          </section>

          {/* ── AI Career Recommendation CTA ────────────────────────────── */}
          <div className="glass-card p-5 border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-cyan-500/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white text-base flex items-center gap-2">
                  <span>🤖</span> Get Your AI Career Recommendation
                </p>
                <p className="text-sm text-slate-300 mt-0.5">
                  Career paths · Learning roadmap · Certifications · Projects · Interview prep plan
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 px-5 py-2.5 font-bold text-white shadow-lg hover:from-brand-500 hover:to-cyan-400 transition flex items-center gap-2"
                onClick={() => navigate(`/career/${id}`)}
              >
                <span>✨</span> Generate Career Plan
              </button>
            </div>
          </div>

          <div ref={reportRef} className="mt-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Content" value={report.overallScores.content} />
              <MetricCard label="Communication" value={report.overallScores.communication} />
              <MetricCard label="Confidence" value={report.overallScores.confidence} />
              <MetricCard label="Clarity" value={report.overallScores.clarity} />
              <MetricCard label="Fluency" value={report.overallScores.fluency} />
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="glass-card p-4">
                <p className="mb-3 text-sm text-slate-300">Overall Breakdown</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overallData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="metric" tick={{ fill: '#cbd5e1' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#06b6d4" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-4">
                <p className="mb-3 text-sm text-slate-300">Question-wise Trend</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="question" tick={{ fill: '#cbd5e1' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="content" stroke="#06b6d4" strokeWidth={2} isAnimationActive={false} />
                      <Line type="monotone" dataKey="communication" stroke="#f97316" strokeWidth={2} isAnimationActive={false} />
                      <Line type="monotone" dataKey="confidence" stroke="#22c55e" strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="glass-card p-5">
                <h3 className="font-display text-xl text-white">Strengths</h3>
                <ul className="mt-3 space-y-2 text-slate-200">
                  {report.strengths?.length ? report.strengths.map((item) => <li key={item}>- {item}</li>) : <li>- No strengths found</li>}
                </ul>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display text-xl text-white">Weaknesses</h3>
                <ul className="mt-3 space-y-2 text-slate-200">
                  {report.weaknesses?.length ? report.weaknesses.map((item) => <li key={item}>- {item}</li>) : <li>- No weaknesses found</li>}
                </ul>
              </div>
            </section>

            <section className="glass-card mt-6 p-5">
              <h3 className="font-display text-xl text-white">Final AI Feedback</h3>
              <p className="mt-2 text-slate-200">{report.finalFeedback}</p>
              <h4 className="mt-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Recommendations</h4>
              <ul className="mt-2 space-y-2 text-slate-200">
                {(report.recommendations || []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </section>

            {/* ── Proctoring Violations ──────────────────────────────────── */}
            {report.proctoringViolations && report.proctoringViolations.length > 0 ? (
              <section className="glass-card mt-6 p-5 border-rose-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🛡️</span>
                  <h3 className="font-display text-xl text-rose-300">Proctoring Report</h3>
                  <span className="ml-auto rounded-full bg-rose-500/20 border border-rose-500/30 px-3 py-0.5 text-xs font-semibold text-rose-200">
                    {report.proctoringViolations.length} violation{report.proctoringViolations.length !== 1 ? 's' : ''} detected
                  </span>
                </div>

                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(
                    report.proctoringViolations.reduce((acc, v) => {
                      acc[v.type] = (acc[v.type] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => {
                    const labels = {
                      no_face: '😶 No Face',
                      multiple_faces: '👥 Multiple Faces',
                      looking_away: '👀 Looking Away',
                      long_eye_closure: '😴 Eye Closure',
                      tab_switch: '🔄 Tab Switch',
                      window_blur: '🪟 Window Blur',
                      copy_paste: '📋 Copy / Paste',
                    };
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-200"
                      >
                        {labels[type] || type} × {count}
                      </span>
                    );
                  })}
                </div>

                {/* Detail list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {report.proctoringViolations.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-rose-500/8 border border-rose-500/15 px-4 py-2.5"
                    >
                      <span className="text-base mt-0.5">⚠</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-rose-100 font-medium">{v.message}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="glass-card mt-6 p-5 border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <h3 className="font-display text-xl text-emerald-300">Proctoring Report</h3>
                </div>
                <p className="mt-2 text-slate-300 text-sm">No proctoring violations were detected during this interview. Excellent integrity!</p>
              </section>
            )}
          </div>
        </>
      ) : (
        <p className="glass-card p-4 text-slate-300">Loading report...</p>
      )}
    </AppShell>
  );
}

export default ReportPage;
