import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getInterviewReport } from '../api/interviewApi';
import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import VoiceAnalyticsDashboard from '../components/VoiceAnalyticsDashboard';
import { formatDateTime } from '../utils/format';
import { 
  Download, RefreshCw, ArrowLeft, ShieldAlert, FileText, CheckCircle2, 
  TrendingUp, AlertTriangle, Info, Mic, Activity, PieChart as PieChartIcon, 
  BarChart2, LineChart as LineChartIcon, AlertCircle
} from 'lucide-react';

const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showProctoringDetails, setShowProctoringDetails] = useState(false);
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
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F8FAFC',
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

  const onExportAsJson = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `interview-report-${id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const overallData = useMemo(() => {
    if (!report) return [];
    return [
      { metric: 'Content', score: report.overallScores?.content || 0 },
      { metric: 'Communication', score: report.overallScores?.communication || 0 },
      { metric: 'Confidence', score: report.overallScores?.confidence || 0 },
      { metric: 'Clarity', score: report.overallScores?.clarity || 0 },
      { metric: 'Fluency', score: report.overallScores?.fluency || 0 },
    ];
  }, [report]);

  const trendData = useMemo(() => {
    if (!report) return [];
    return (report.responses || []).map((item, index) => ({
      question: `Q${index + 1}`,
      content: item.responseScores?.content || 0,
      communication: item.responseScores?.communication || 0,
      confidence: item.responseScores?.confidence || 0,
    }));
  }, [report]);

  const skillDistributionData = useMemo(() => {
    if (!report) return [];
    return [
      { name: 'Technical', value: report.overallScores?.content || 0 },
      { name: 'Soft Skills', value: report.overallScores?.communication || 0 },
      { name: 'Confidence', value: report.overallScores?.confidence || 0 },
    ];
  }, [report]);

  const cardClass = "bg-[#FFFFFF] p-4 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] border border-[#E2E8F0]";

  return (
    <AppShell title="Interview Feedback" subtitle="Comprehensive analytics and AI feedback from your session.">
      {error && (
        <div className="bg-[#FEE2E2] text-[#EF4444] px-4 py-3 rounded-xl text-[15px] font-bold border border-[#FCA5A5] mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      {!report && !error ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#DBEAFE] border-t-[#2563EB] rounded-full animate-spin" />
          <p className="text-[15px] text-[#64748B] font-medium animate-pulse">Generating your comprehensive report...</p>
        </div>
      ) : report ? (
        <div className="space-y-4 pb-12 max-w-7xl mx-auto">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] border border-[#E2E8F0]">
            <div>
              <h2 className="text-[30px] font-bold text-[#0F172A] tracking-tight">
                {report.setup?.jobRole || 'General'} Interview Results
              </h2>
              <p className="text-[15px] text-[#64748B] mt-1 font-medium">
                Topic: {report.setup?.topic || 'N/A'} • Difficulty: {report.setup?.difficulty || 'N/A'}
              </p>
              <p className="text-[12px] text-[#94A3B8] mt-1">
                Completed on {formatDateTime(report.endedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={() => navigate('/dashboard')} className="h-10 px-4 rounded-lg bg-[#F1F5F9] text-[#475569] text-[15px] font-bold hover:bg-[#E2E8F0] transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </button>
              <button onClick={() => navigate(`/setup?retake=${id}`)} className="h-10 px-4 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[15px] font-bold hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none">
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button onClick={onExportAsJson} className="h-10 px-4 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-[15px] font-bold hover:bg-[#DBEAFE] transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none">
                <FileText className="w-4 h-4" /> JSON
              </button>
              <button onClick={onExportAsPdf} disabled={isExporting} className="h-10 px-4 rounded-lg bg-[#2563EB] text-[#FFFFFF] text-[15px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-1 md:flex-none">
                {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />} 
                {isExporting ? 'Generating...' : 'PDF'}
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-4">
            
            {/* Overall Recommendation */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
              <h3 className="text-[16px] font-bold text-[#1D4ED8] mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Overall Recommendation
              </h3>
              <p className="text-[15px] text-[#1E3A8A] font-medium leading-relaxed line-clamp-3">
                {report.finalFeedback || "Great job completing the interview. Review your detailed metrics below."}
              </p>
            </div>

            {/* Top Level Metrics */}
            <section className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <MetricCard label="Content" value={report.overallScores?.content || 0} />
              <MetricCard label="Communication" value={report.overallScores?.communication || 0} />
              <MetricCard label="Confidence" value={report.overallScores?.confidence || 0} />
              <MetricCard label="Clarity" value={report.overallScores?.clarity || 0} />
              <MetricCard label="Fluency" value={report.overallScores?.fluency || 0} />
            </section>

            {/* Recharts Analytics Dashboard */}
            <section className="grid gap-4 xl:grid-cols-2">
              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2563EB]" />
                  Score Distribution
                </h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={overallData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <PolarGrid stroke="#F1F5F9" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Radar name="Score" dataKey="score" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-[#16A34A]" />
                  Performance Progression
                </h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="question" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="content" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="communication" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="confidence" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#8B5CF6]" />
                  Category Breakdown
                </h3>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overallData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="metric" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                        {overallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#F59E0B]" />
                  Skill Distribution
                </h3>
                <div className="h-[260px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={skillDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {skillDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(15,23,42,0.06)' }} />
                      <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Strengths & Weaknesses */}
            <section className="grid gap-4 xl:grid-cols-2">
              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {report.strengths?.length ? report.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#475569] text-[15px]">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-none mt-0.5" /> {item}
                    </li>
                  )) : <li className="text-[#94A3B8] italic text-[15px]">No significant strengths recorded.</li>}
                </ul>
              </div>

              <div className={cardClass}>
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#EF4444] rotate-180" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {report.weaknesses?.length ? report.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#475569] text-[15px]">
                      <AlertCircle className="w-4 h-4 text-[#EF4444] flex-none mt-0.5" /> {item}
                    </li>
                  )) : <li className="text-[#94A3B8] italic text-[15px]">No significant weaknesses recorded.</li>}
                </ul>
              </div>
            </section>

            {/* Voice Analytics Dashboard */}
            <div className={cardClass}>
              <h3 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-2 mb-4">
                <Mic className="w-5 h-5 text-[#8B5CF6]" />
                Voice & Delivery Analytics
              </h3>
              <VoiceAnalyticsDashboard responses={report.responses || []} />
            </div>

            {/* Detailed Question Review */}
            <section className="space-y-4">
              <h3 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-[#F59E0B]" /> Detailed Question Review
              </h3>
              
              {report.responses?.map((item, index) => (
                <div key={index} className={`${cardClass} max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-2`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-[16px] font-bold text-[#0F172A]">
                      <span className="text-[#2563EB] mr-1">Q{index + 1}.</span> 
                      {item.question?.text || item.questionText || "Question text not available"}
                    </h4>
                    <span className="px-2 py-1 bg-[#F1F5F9] text-[#475569] text-[12px] font-bold rounded-full whitespace-nowrap">
                      Score: {item.evaluation?.score || item.responseScores?.content || 0}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 flex items-center gap-1"><Mic className="w-3 h-3"/> Your Answer</p>
                      <p className="text-[12px] text-[#334155] leading-relaxed italic line-clamp-4">
                        "{item.transcript || "No answer provided."}"
                      </p>
                    </div>
                    <div className="bg-[#EFF6FF] p-3 rounded-xl border border-[#BFDBFE]">
                      <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider mb-1 flex items-center gap-1"><Info className="w-3 h-3"/> AI Feedback</p>
                      <p className="text-[12px] text-[#1E3A8A] leading-relaxed line-clamp-4">
                        {item.evaluation?.feedback || "No specific feedback generated."}
                      </p>
                    </div>
                    <div className="bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A]">
                      <p className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Suggestion</p>
                      <p className="text-[12px] text-[#92400E] leading-relaxed line-clamp-4">
                        {item.evaluation?.improvements || item.evaluation?.improvement || "No specific improvements suggested."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Proctoring Report */}
            {report.proctoringViolations && report.proctoringViolations.length > 0 && (
              <section className="bg-[#FFFFFF] p-4 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] border border-[#FECACA]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
                    <h3 className="text-[16px] font-bold text-[#0F172A]">Proctoring Log</h3>
                    <span className="ml-1 rounded-full bg-[#FEE2E2] border border-[#FCA5A5] px-2 py-0.5 text-[11px] font-bold text-[#EF4444]">
                      {report.proctoringViolations.length} Flags
                    </span>
                  </div>
                  <button onClick={() => setShowProctoringDetails(!showProctoringDetails)} className="text-[12px] font-bold text-[#2563EB] hover:underline text-left">
                    {showProctoringDetails ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(
                    report.proctoringViolations.reduce((acc, v) => {
                      acc[v.type] = (acc[v.type] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => {
                    const labels = {
                      no_face: 'No Face',
                      multiple_faces: 'Multiple Faces',
                      looking_away: 'Looking Away',
                      long_eye_closure: 'Eye Closure',
                      tab_switch: 'Tab Switch',
                      window_blur: 'Window Blur',
                      copy_paste: 'Copy / Paste',
                    };
                    return (
                      <span key={type} className="inline-flex items-center gap-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 text-[12px] font-medium text-[#64748B]">
                        {labels[type] || type} <span className="font-bold text-[#0F172A] ml-1">{count}</span>
                      </span>
                    );
                  })}
                </div>

                {showProctoringDetails && (
                  <div className="space-y-2 max-h-40 overflow-y-auto mt-4 pr-2 custom-scrollbar">
                    {report.proctoringViolations.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2">
                        <AlertTriangle className="w-4 h-4 text-[#EF4444] mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-[#0F172A] font-medium">{v.message}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5">
                            {v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default ReportPage;
