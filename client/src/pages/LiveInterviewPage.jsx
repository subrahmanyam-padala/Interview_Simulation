import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeInterview, getInterview, logProctoringViolation, skipInterviewQuestion, submitInterviewAnswer } from '../api/interviewApi';
import AppShell from '../components/AppShell';
import InterviewerAvatar from '../components/InterviewerAvatar';
import { useFaceAnalysis } from '../hooks/useFaceAnalysis';
import { useInterviewTimer } from '../hooks/useInterviewTimer';
import { useProctoring } from '../hooks/useProctoring';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzeVoiceMetrics } from '../utils/voiceAnalysis';

const ANSWER_TIME_LIMIT = 120;

function SignalBar({ label, value, colorClass = 'bg-cyan-500' }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-white">{safeValue}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className={`h-2 rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function LiveInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recordingUrl, setRecordingUrl] = useState(null);

  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [latestEvaluation, setLatestEvaluation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [interviewerLine, setInterviewerLine] = useState('');
  const [textToSpeak, setTextToSpeak] = useState('');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');

  const isCodingInterview = interview?.setup?.interviewType === 'coding';

  const speech = useSpeechRecognition();
  const face = useFaceAnalysis(videoRef);
  const timer = useInterviewTimer(ANSWER_TIME_LIMIT, speech.isListening);

  const pushEvent = (message) => {
    const stamp = new Date().toLocaleTimeString();
    setEvents((prev) => [{ stamp, message }, ...prev].slice(0, 8));
  };

  // ── Proctoring ────────────────────────────────────────────────────────────
  const handleViolation = useCallback(async (violation) => {
    pushEvent(violation.message);
    if (id) {
      try {
        await logProctoringViolation(id, { type: violation.type, message: violation.message });
      } catch (_) {
        // non-blocking – violations are best-effort
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const proctoring = useProctoring({
    videoRef,
    interviewId: id,
    onViolation: handleViolation,
    enabled: !!interview && interview.status !== 'completed',
  });

  useEffect(() => {
    const loadInterview = async () => {
      try {
        const data = await getInterview(id);
        const payload = data.interview;

        if (payload.status === 'completed') {
          navigate(`/report/${id}`, { replace: true });
          return;
        }

        const next = payload.questions[payload.responses.length] || null;
        setInterview(payload);
        setAnsweredCount(payload.responses.length);
        setCurrentQuestion(next);
        setInterviewerLine('Welcome. Let us begin the interview. Please answer clearly and concisely.');
        pushEvent('Interview session loaded');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load interview session');
      }
    };

    loadInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    const bootCamera = async () => {
      const ok = await face.startCamera();
      if (ok) {
        pushEvent('Camera connected');
        if (videoRef.current && videoRef.current.srcObject) {
          try {
            const stream = videoRef.current.srcObject;
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'video/webm' });
              setRecordingUrl(URL.createObjectURL(blob));
            };
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            pushEvent('Recording started');
          } catch (err) {
            console.error('Recording failed to start', err);
          }
        }
      }
    };

    bootCamera();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      face.stopCamera();
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTranscript(speech.fullTranscript);
  }, [speech.fullTranscript]);

  useEffect(() => {
    if (timer.isExpired && speech.isListening) {
      speech.stop();
      pushEvent('Time limit reached - voice capture stopped');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isExpired, speech.isListening]);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }
    setTranscript('');
    setCode('// Write your solution here...\n');
    speech.resetTranscript();
    timer.reset();
    setLatestEvaluation(null);
    pushEvent(`Question ${answeredCount + 1} ready`);
    
    setTextToSpeak(`${interviewerLine ? interviewerLine + ' ' : ''}${currentQuestion.text}`);
    setIsAvatarSpeaking(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.questionId]);

  const liveVoiceMetrics = useMemo(() => {
    if (!transcript.trim()) {
      return {
        wpm: 0,
        clarityScore: 0,
        fluencyScore: 0,
      };
    }
    const activeDuration = Math.max(1, ANSWER_TIME_LIMIT - timer.timeLeft);
    const metrics = analyzeVoiceMetrics({ transcript, durationSec: activeDuration });
    return {
      wpm: metrics.wpm || 0,
      clarityScore: metrics.clarityScore || 0,
      fluencyScore: metrics.fluencyScore || 0,
    };
  }, [transcript, timer.timeLeft]);

  const totalQuestions = interview?.questions?.length || 0;
  const currentIndex = currentQuestion ? answeredCount + 1 : answeredCount;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const completedAll = !currentQuestion && answeredCount >= totalQuestions && totalQuestions > 0;

  useEffect(() => {
    if (completedAll) {
      setTextToSpeak('Interview completed. Please generate your final report.');
      setIsAvatarSpeaking(true);
    }
  }, [completedAll]);

  const onStartListening = () => {
    setError('');
    speech.start();
    pushEvent('Voice capture started');
  };

  const onStopListening = () => {
    speech.stop();
    pushEvent('Voice capture stopped');
  };

  const onSubmitAnswer = async () => {
    if (!currentQuestion) {
      return;
    }

    if (!transcript || transcript.trim().length < 10) {
      setError('Answer is too short. Please speak or type a detailed response.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const durationSec = ANSWER_TIME_LIMIT - timer.timeLeft;
      const voiceMetrics = analyzeVoiceMetrics({ transcript, durationSec });

      const payload = isCodingInterview
        ? {
            questionId: currentQuestion.questionId,
            code,
            language,
            durationSec,
          }
        : {
            questionId: currentQuestion.questionId,
            transcript,
            durationSec,
            facialMetrics: face.metrics,
            voiceMetrics,
          };

      const result = await submitInterviewAnswer(id, payload);

      setLatestEvaluation(result.evaluation);
      setAnsweredCount(result.answered);
      setInterviewerLine(result.nextQuestion?.encouragement || result.evaluation?.encouragement || '');
      pushEvent(`Question ${result.answered} submitted`);

      if (result.isCompleted || !result.nextQuestion) {
        setCurrentQuestion(null);
        pushEvent('All questions completed');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        return;
      }

      setCurrentQuestion(result.nextQuestion);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
      speech.stop();
    }
  };

  const onFinishInterview = async () => {
    try {
      await completeInterview(id);
      navigate(`/report/${id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Need at least one answer before finishing');
    }
  };

  const onGenerateInterviewReport = async () => {
    setError('');
    setIsGeneratingReport(true);
    try {
      await completeInterview(id);
      navigate(`/report/${id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate interview report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const onSkipQuestion = async () => {
    if (!currentQuestion) {
      return;
    }

    setError('');
    setIsSkipping(true);

    try {
      const result = await skipInterviewQuestion(id, {
        questionId: currentQuestion.questionId,
        reason: 'Skipped by candidate from live interview screen',
      });

      setAnsweredCount(result.answered);
      setLatestEvaluation(null);
      setInterviewerLine(result.nextQuestion?.encouragement || 'No problem, let us continue with a simpler follow-up.');
      speech.stop();
      pushEvent(`Question ${result.answered} skipped`);

      if (result.isCompleted || !result.nextQuestion) {
        setCurrentQuestion(null);
        pushEvent('All questions completed');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        return;
      }

      setCurrentQuestion(result.nextQuestion);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to skip question');
    } finally {
      setIsSkipping(false);
    }
  };

  // ── Violation type → display colour map ─────────────────────────────────
  const violationColor = {
    no_face: 'from-rose-700 to-rose-500',
    multiple_faces: 'from-fuchsia-700 to-fuchsia-500',
    looking_away: 'from-amber-700 to-amber-500',
    long_eye_closure: 'from-orange-700 to-orange-500',
    tab_switch: 'from-red-700 to-red-500',
    window_blur: 'from-red-700 to-red-500',
    copy_paste: 'from-violet-700 to-violet-500',
  };

  return (
    <AppShell title="Live Interview" subtitle="Real-time interview simulation with voice, face, and instant feedback.">
      {/* ── Proctoring Warning Banner ───────────────────────────────────── */}
      {proctoring.activeWarning && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] animate-bounce-once`}
          style={{ minWidth: '340px', maxWidth: '96vw' }}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r ${
              violationColor[proctoring.activeWarning.type] || 'from-rose-700 to-rose-500'
            } px-5 py-3.5 shadow-2xl border border-white/20`}
          >
            <span className="text-2xl animate-pulse">🚨</span>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{proctoring.activeWarning.message}</p>
              <p className="text-xs text-white/70 mt-0.5">This violation has been recorded in your interview report.</p>
            </div>
          </div>
        </div>
      )}

      {!interview ? (
        <p className="glass-card p-4 text-slate-300">Loading interview session...</p>
      ) : (
        <div className="relative grid gap-4 lg:pr-56">
          <section className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Interview Session</p>
                  <p className="mt-1 text-sm text-slate-200">
                    {(interview.setup.interviewType || 'technical').toUpperCase()} | {interview.setup.jobRole} | {interview.setup.topic} | {interview.setup.difficulty}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-100">
                    <span className={`${speech.isListening ? 'animate-pulse' : ''}`}>●</span>
                    {speech.isListening ? 'Recording Live' : 'Idle'}
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">{timer.display}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Progress: {currentIndex}/{totalQuestions}
                  </span>
                  <span>{progressPercent}% completed</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {interview.questions.map((question, index) => {
                  const isDone = index < answeredCount;
                  const isActive = currentQuestion && question.questionId === currentQuestion.questionId;
                  return (
                    <span
                      key={question.questionId}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        isDone
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                          : isActive
                            ? 'border-brand-500/40 bg-brand-500/15 text-brand-100'
                            : 'border-slate-600 bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      Q{index + 1}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex flex-col md:flex-row gap-6 items-center md:items-start">
                <InterviewerAvatar 
                  textToSpeak={textToSpeak} 
                  onSpeechEnd={() => setIsAvatarSpeaking(false)} 
                  isActive={speech.isListening} 
                  gender={interview.setup.interviewerGender || 'female'}
                />
                <div className="flex-1 w-full">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Current Question</p>
                  <p className="mt-2 text-lg text-white">{currentQuestion?.text || 'No pending question'}</p>
                  {isCodingInterview && currentQuestion && (
                    <div className="mt-2 text-sm text-slate-300">
                      <p className="mb-2 whitespace-pre-wrap">{currentQuestion.description}</p>
                      <div className="grid grid-cols-2 gap-4 mt-2 p-2 bg-slate-800 rounded">
                        <div><strong className="text-white">Input:</strong> <br/>{currentQuestion.sampleInput}</div>
                        <div><strong className="text-white">Output:</strong> <br/>{currentQuestion.sampleOutput}</div>
                      </div>
                      <p className="mt-2 text-slate-400 text-xs">Constraints: {currentQuestion.constraints}</p>
                    </div>
                  )}
                  {interviewerLine ? <p className="mt-4 text-sm font-semibold text-brand-300 italic">"{interviewerLine}"</p> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!isCodingInterview && (
                  <>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={onStartListening}
                      disabled={!speech.isSupported || isSubmitting || isSkipping || isGeneratingReport || completedAll}
                    >
                      {speech.isListening ? 'Listening...' : 'Start Voice Capture'}
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={onStopListening}
                      disabled={isSubmitting || isSkipping || isGeneratingReport || completedAll}
                    >
                      Stop Voice Capture
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={onFinishInterview}
                  disabled={isSubmitting || isSkipping || isGeneratingReport}
                >
                  End Interview
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-500 transition disabled:opacity-60"
                  onClick={onSkipQuestion}
                  disabled={!currentQuestion || isSubmitting || isSkipping || isGeneratingReport}
                >
                  {isSkipping ? 'Skipping...' : 'Skip Question'}
                </button>
              </div>

              {isCodingInterview ? (
                <div className="mt-4">
                  <div className="flex gap-2 mb-2">
                    <select className="soft-input py-1 text-sm w-40" value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-slate-700 h-[400px]">
                    <Editor
                      height="100%"
                      language={language}
                      theme="vs-dark"
                      value={code}
                      onChange={(value) => setCode(value || '')}
                      options={{ minimap: { enabled: false }, fontSize: 14 }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <textarea
                    className="soft-input mt-4 h-44 resize-none"
                    placeholder="Your transcript appears here. You can edit before submitting."
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    disabled={completedAll}
                  />
                  {speech.interimText ? <p className="mt-2 text-xs text-slate-400">Live draft: {speech.interimText}</p> : null}
                  {speech.error ? <p className="mt-2 text-sm text-rose-400">{speech.error}</p> : null}
                </>
              )}

              {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

              <button
                type="button"
                className="primary-btn mt-4"
                onClick={onSubmitAnswer}
                disabled={isSubmitting || isSkipping || isGeneratingReport || !currentQuestion}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
              </button>

              {completedAll ? (
                <div className="mt-5 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4">
                  <p className="text-sm text-brand-100">Interview completed. Generate your final report.</p>
                  <button
                    type="button"
                    className="primary-btn mt-3 mr-3"
                    onClick={onGenerateInterviewReport}
                    disabled={isGeneratingReport}
                  >
                    {isGeneratingReport ? 'Generating Report...' : 'Generate Interview Report'}
                  </button>
                  {recordingUrl && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                      <p className="text-sm text-slate-300 mb-2">Session Recording (Stored locally):</p>
                      <video src={recordingUrl} controls className="w-full rounded mb-3 max-h-60" />
                      <a 
                        href={recordingUrl} 
                        download="interview_recording.webm"
                        className="secondary-btn inline-block text-center"
                      >
                        Download Recording
                      </a>
                    </div>
                  )}
                </div>
              ) : null}

              {latestEvaluation ? (
                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  {isCodingInterview ? (
                    <>
                      <p className="text-emerald-200 font-semibold">
                        Correctness: {latestEvaluation.correctnessScore} | Complexity: {latestEvaluation.complexityScore} | Quality: {latestEvaluation.qualityScore}
                      </p>
                      <p className="mt-2 text-emerald-100">{latestEvaluation.feedback}</p>
                      {latestEvaluation.suggestions?.length > 0 && (
                        <ul className="mt-2 list-disc list-inside text-emerald-100/80">
                          {latestEvaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-emerald-200 font-semibold">
                        Content: {latestEvaluation.contentScore} | Communication: {latestEvaluation.communicationScore}
                      </p>
                      <p className="mt-2 text-emerald-100">{latestEvaluation.feedback}</p>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {!isCodingInterview && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="glass-card p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">Live Signals</p>
                  <SignalBar label="Eye Contact" value={face.metrics.eyeContactScore} colorClass="bg-cyan-500" />
                  <SignalBar label="Confidence" value={face.metrics.confidenceScore} colorClass="bg-emerald-500" />
                  <SignalBar label="Clarity" value={liveVoiceMetrics.clarityScore} colorClass="bg-blue-500" />
                  <SignalBar label="Fluency" value={liveVoiceMetrics.fluencyScore} colorClass="bg-indigo-500" />
                  <div className="rounded-lg bg-slate-800/80 p-2 text-xs text-slate-200">Speech Pace (WPM): {liveVoiceMetrics.wpm}</div>
                  <p className="text-xs text-slate-400">{face.status}</p>
                  {face.error ? <p className="text-xs text-rose-400">{face.error}</p> : null}
                </div>

                <div className="glass-card p-4">
                  <p className="text-sm font-semibold text-white">Session Timeline</p>
                  <div className="mt-3 space-y-2">
                    {events.length ? (
                      events.map((event, index) => (
                        <div key={`${event.stamp}-${index}`} className="rounded-lg bg-slate-800/70 p-2">
                          <p className="text-xs text-slate-200">{event.message}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{event.stamp}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Events will appear as you interact.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Proctoring Violations Log ─────────────────────────────── */}
            {proctoring.violations.length > 0 && (
              <div className="glass-card p-4 border-rose-500/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-rose-300 flex items-center gap-2">
                    <span>🛡️</span> Proctoring Violations ({proctoring.violations.length})
                  </p>
                  <span className="text-xs text-slate-400">Recorded in report</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {proctoring.violations.map((v, i) => (
                    <div
                      key={`${v.type}-${i}`}
                      className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2"
                    >
                      <span className="text-base mt-0.5">⚠</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-rose-200 font-medium">{v.message}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {!isCodingInterview && (
            <section
              className="z-[9999]"
              style={{
                position: 'fixed',
                top: '84px',
                right: '16px',
                width: '180px',
                height: '180px',
              }}
            >
              <div className="glass-card h-full w-full overflow-hidden p-1 shadow-2xl">
                <div className="relative h-full w-full">
                  <video ref={videoRef} autoPlay muted playsInline className="h-full w-full rounded-lg bg-slate-900 object-cover" />
                  {speech.isListening ? (
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-rose-500/90 px-3 py-1 text-xs font-semibold text-white">
                      <span className="animate-pulse">●</span> LIVE
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default LiveInterviewPage;
