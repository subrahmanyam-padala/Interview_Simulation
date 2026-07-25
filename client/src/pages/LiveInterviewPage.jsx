import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeInterview, getInterview, logProctoringViolation, submitInterviewAnswer } from '../api/interviewApi';
import InterviewerAvatar from '../components/InterviewerAvatar';
import { useFaceAnalysis } from '../hooks/useFaceAnalysis';
import { useInterviewTimer } from '../hooks/useInterviewTimer';
import { useProctoring } from '../hooks/useProctoring';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { analyzeVoiceMetrics } from '../utils/voiceAnalysis';

const ANSWER_TIME_LIMIT = 300;

function LiveInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [hasStarted, setHasStarted] = useState(false);
  const [interviewerGender, setInterviewerGender] = useState('female');

  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [textToSpeak, setTextToSpeak] = useState('');
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  
  const handleAvatarSpeechEnd = useCallback(() => {
    setIsAvatarSpeaking(false);
  }, []);
  
  const [isFacePaused, setIsFacePaused] = useState(false);
  const facePauseTimeoutRef = useRef(null);
  const noResponseTimeoutRef = useRef(null);
  const hasRepeatedRef = useRef(false);

  // Hook initializations
  const speech = useSpeechRecognition();
  const face = useFaceAnalysis(videoRef);
  const timer = useInterviewTimer(ANSWER_TIME_LIMIT, speech.isListening);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, transcript, speech.interimText]);

  // Focus input when AI finishes speaking, and AUTO-START microphone
  useEffect(() => {
    if (!hasStarted) return;
    
    if (isAvatarSpeaking) {
      console.log('[Interview Flow] AI is speaking. Pausing recognition.');
      if (speech.isListening) speech.stop();
      return;
    }

    if (!isAvatarSpeaking && !isSubmitting && currentQuestion && !speech.isListening && !isFacePaused) {
      console.log('[Interview Flow] AI finished speaking. AUTO-STARTING microphone.');
      inputRef.current?.focus();
      try {
        speech.start();
      } catch (err) {
        console.error('[Interview Flow] Auto start speech failed', err);
      }

      // Start No-Response timer
      if (!noResponseTimeoutRef.current) {
        noResponseTimeoutRef.current = setTimeout(() => {
          if (!transcript.trim()) {
            if (!hasRepeatedRef.current) {
              console.log('[Interview Flow] 30s with no response. Repeating question.');
              hasRepeatedRef.current = true;
              setTextToSpeak(currentQuestion.text);
              setIsAvatarSpeaking(true);
            } else {
              console.log('[Interview Flow] Another 30s with no response. Moving to next question.');
              onSubmitAnswer(true); // Force submit
            }
          }
        }, 30000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvatarSpeaking, hasStarted, isSubmitting, currentQuestion, speech.isListening, isFacePaused, transcript]);

  // Auto-submit logic based on transcript pause
  useEffect(() => {
    const textLength = transcript.trim().length;
    
    // If user started speaking, clear the no-response timer
    if (textLength > 0 && noResponseTimeoutRef.current) {
      clearTimeout(noResponseTimeoutRef.current);
      noResponseTimeoutRef.current = null;
    }

    if (speech.isListening && textLength >= 4 && !isAvatarSpeaking) {
      console.log(`[Interview Flow] Transcript length ${textLength}, scheduling auto-submit in 5 seconds...`);
      const timeout = setTimeout(() => {
        console.log('[Interview Flow] Auto-submitting answer due to silence pause.');
        onSubmitAnswer();
      }, 5000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, speech.interimText, speech.isListening, isAvatarSpeaking]);

  // Face Recognition pause logic
  useEffect(() => {
    if (!hasStarted) return;
    
    if (!face.isFaceDetected && face.faceStatus && (face.faceStatus.includes('No Face') || face.faceStatus.includes('Multiple'))) {
      if (!facePauseTimeoutRef.current) {
        console.log('[Proctoring] Face not detected, starting 10s timer...');
        facePauseTimeoutRef.current = setTimeout(() => {
          console.log('[Proctoring] 10s passed with no face. Pausing interview.');
          setIsFacePaused(true);
          if (speech.isListening) speech.stop();
        }, 10000);
      }
    } else if (face.isFaceDetected) {
      if (facePauseTimeoutRef.current) {
        clearTimeout(facePauseTimeoutRef.current);
        facePauseTimeoutRef.current = null;
      }
      if (isFacePaused) {
        console.log('[Proctoring] Face detected again. Resuming interview.');
        setIsFacePaused(false);
      }
    }
  }, [face.isFaceDetected, face.faceStatus, hasStarted, isFacePaused, speech.isListening]);

  // ── Proctoring ────────────────────────────────────────────────────────────
  const handleViolation = useCallback(async (violation) => {
    if (id) {
      try {
        await logProctoringViolation(id, { type: violation.type, message: violation.message });
      } catch (_) {
        // non-blocking
      }
    }
  }, [id]);

  useProctoring({
    videoRef,
    interviewId: id,
    onViolation: handleViolation,
    enabled: !!interview && interview.status !== 'completed' && hasStarted,
  });

  // Load Interview
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
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load interview session');
      }
    };
    loadInterview();
  }, [id, navigate]);

  // Start Camera & Media Recorder
  useEffect(() => {
    if (!hasStarted) return;
    const bootCamera = async () => {
      // Explicitly request microphone permission first to ensure SpeechRecognition works flawlessly
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // We just needed permission, we can stop this specific stream since useSpeechRecognition handles its own
        audioStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Microphone permission denied', err);
        setError('Microphone permission is required for the AI to hear you.');
      }

      const ok = await face.startCamera();
      if (ok && videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject;
          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
        } catch (err) {
          console.error('Recording failed to start', err);
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
  }, [hasStarted]);

  // Sync transcript from speech recognition
  useEffect(() => {
    if (speech.fullTranscript) {
      setTranscript(speech.fullTranscript);
    }
  }, [speech.fullTranscript]);

  // Stop if timer expires
  useEffect(() => {
    if (timer.isExpired && speech.isListening) {
      speech.stop();
    }
  }, [timer.isExpired, speech.isListening]);

  // Handle Next Question setup
  useEffect(() => {
    if (!currentQuestion || !hasStarted) return;
    
    console.log(`[Interview Flow] Setting up question ${answeredCount + 1}`);
    setTranscript('');
    speech.resetTranscript();
    timer.reset();
    
    const aiText = answeredCount === 0 
      ? "Hello. Welcome to your interview. I am your AI interviewer. Let's begin. Tell me about yourself." 
      : currentQuestion.text;

    setChatHistory(prev => [...prev, { role: 'ai', text: aiText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setTextToSpeak(aiText);
    setIsAvatarSpeaking(true);
    hasRepeatedRef.current = false;
    if (noResponseTimeoutRef.current) {
      clearTimeout(noResponseTimeoutRef.current);
      noResponseTimeoutRef.current = null;
    }
  }, [currentQuestion?.questionId, hasStarted]);

  const totalQuestions = interview?.questions?.length || 0;
  const completedAll = !currentQuestion && answeredCount >= totalQuestions && totalQuestions > 0;

  useEffect(() => {
    if (completedAll && hasStarted) {
      const msg = 'Interview completed. Please end the interview to see your feedback.';
      setChatHistory(prev => [...prev, { role: 'ai', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setTextToSpeak(msg);
      setIsAvatarSpeaking(true);
    }
  }, [completedAll, hasStarted]);

  // Toggle listening state
  const toggleListening = () => {
    setError('');
    if (speech.isListening) {
      speech.stop();
    } else {
      speech.start();
    }
  };

  const onSubmitAnswer = async (forced = false) => {
    const isForced = typeof forced === 'boolean' ? forced : false;
    if (!currentQuestion || isSubmitting) return;
    if (!isForced && (!transcript || transcript.trim().length < 4)) {
      setError('Answer is too short. Please speak or type a detailed response.');
      return;
    }

    if (noResponseTimeoutRef.current) {
      clearTimeout(noResponseTimeoutRef.current);
      noResponseTimeoutRef.current = null;
    }

    console.log('[Interview Flow] Submitting answer to backend...', transcript);
    setIsSubmitting(true);
    setError('');
    speech.stop();

    const answerText = transcript.trim() || 'No response provided.';
    setChatHistory(prev => [...prev, { role: 'candidate', text: answerText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setTranscript('');
    speech.resetTranscript();

    try {
      const durationSec = ANSWER_TIME_LIMIT - timer.timeLeft;
      const voiceMetrics = analyzeVoiceMetrics({ transcript: answerText, durationSec });

      const payload = {
        questionId: currentQuestion.questionId,
        transcript: answerText,
        durationSec,
        facialMetrics: face.metrics,
        voiceMetrics,
      };

      console.log('[Interview Flow] API Call: submitInterviewAnswer');
      const result = await submitInterviewAnswer(id, payload);
      console.log('[Interview Flow] API Response received, next question:', result.nextQuestion?.text);
      setAnsweredCount(result.answered);

      if (result.isCompleted || !result.nextQuestion) {
        setCurrentQuestion(null);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        return;
      }
      setCurrentQuestion(result.nextQuestion);
    } catch (requestError) {
      console.error('[Interview Flow] API Error:', requestError);
      setError(requestError.response?.data?.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
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

  if (!interview) {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#DBEAFE] border-t-[#2563EB] rounded-full animate-spin mb-4" />
        <p className="text-[#64748B] font-medium animate-pulse">Loading interview...</p>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-6">
        <div className="max-w-xl w-full bg-[#FFFFFF] rounded-[32px] p-10 shadow-[0_4px_10px_rgba(15,23,42,0.06)] text-center space-y-10 border border-[#E2E8F0]">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4 tracking-tight">AI Interview</h1>
            <p className="text-[#64748B] text-lg">Please select your preferred AI interviewer.</p>
          </div>
          
          <div className="flex justify-center gap-8">
            <button
              onClick={() => setInterviewerGender('female')}
              className={`flex flex-col items-center p-6 rounded-[24px] border-2 transition-all w-40 ${
                interviewerGender === 'female' 
                  ? 'border-[#2563EB] bg-[#EFF6FF] shadow-[0_4px_10px_rgba(15,23,42,0.06)] scale-105' 
                  : 'border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F7F9FC]'
              }`}
            >
              <img src="/assets/interviewers/female.png" alt="Female" className="w-24 h-24 rounded-full object-cover mb-4 shadow-sm" />
              <span className={`font-bold text-lg ${interviewerGender === 'female' ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>Female</span>
            </button>
            <button
              onClick={() => setInterviewerGender('male')}
              className={`flex flex-col items-center p-6 rounded-[24px] border-2 transition-all w-40 ${
                interviewerGender === 'male' 
                  ? 'border-[#2563EB] bg-[#EFF6FF] shadow-[0_4px_10px_rgba(15,23,42,0.06)] scale-105' 
                  : 'border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F7F9FC]'
              }`}
            >
              <img src="/assets/interviewers/male.png" alt="Male" className="w-24 h-24 rounded-full object-cover mb-4 shadow-sm" />
              <span className={`font-bold text-lg ${interviewerGender === 'male' ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>Male</span>
            </button>
          </div>

          <button
            onClick={() => setHasStarted(true)}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-lg py-4 rounded-[16px] shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // UI Status
  const getAvatarStatus = () => {
    if (isSubmitting) return { text: 'Processing...', color: 'bg-[#F59E0B] text-white' };
    if (isAvatarSpeaking) return { text: 'Speaking...', color: 'bg-[#2563EB] text-white' };
    if (speech.isListening) return { text: 'Listening...', color: 'bg-[#22C55E] text-white' };
    return { text: 'Thinking...', color: 'bg-[#F59E0B] text-white' };
  };
  const status = getAvatarStatus();

  return (
    <div className="h-screen w-full font-sans flex flex-col overflow-hidden bg-[#F7F9FC] text-[#0F172A]">
      
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] z-20 shadow-sm bg-[#FFFFFF]">
        <div className="flex items-center gap-4">
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">AI Interview</h1>
          <span className="text-[13px] px-3 py-1 bg-[#DBEAFE] border border-[#BFDBFE] text-[#1D4ED8] rounded-full font-bold uppercase tracking-wider">
            {interview?.setup?.jobRole || 'Interview'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-[#FFFFFF] border border-[#E2E8F0] px-4 py-2 rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest">Timer</span>
            <span className={`text-lg font-mono font-bold leading-none ${timer.timeLeft <= 30 ? 'text-[#EF4444]' : timer.timeLeft <= 60 ? 'text-[#F59E0B]' : 'text-[#2563EB]'}`}>{timer.display}</span>
          </div>
          <button
            type="button"
            className="bg-[#EF4444] text-white hover:bg-red-600 px-5 py-2 rounded-[12px] font-bold transition-all disabled:opacity-50 text-[13px] shadow-[0_4px_10px_rgba(15,23,42,0.06)]"
            onClick={onFinishInterview}
            disabled={isSubmitting || isGeneratingReport}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {isFacePaused && (
          <div className="absolute inset-0 z-50 bg-[#FFFFFF]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
             <div className="w-20 h-20 mb-6 bg-[#FEE2E2] text-[#EF4444] rounded-full flex items-center justify-center animate-pulse">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
             </div>
             <h2 className="text-3xl font-bold text-[#0F172A] mb-4 tracking-tight">Face Not Detected</h2>
             <p className="text-lg text-[#64748B] max-w-md font-medium leading-relaxed">
               We haven't detected your face for 10 seconds. The interview is paused. Please return to the camera view to continue.
             </p>
          </div>
        )}

        {/* Left Column: Interview & Chat */}
        <div className="flex-1 lg:w-[70%] xl:w-[75%] flex flex-col relative w-full h-full border-r border-[#E2E8F0] bg-[#FFFFFF]">
          
          {/* FIXED Avatar & Microphone Center Container */}
          <div className="flex-none pt-5 pb-3 border-b border-[#E2E8F0] flex flex-col items-center justify-center space-y-1.5 z-20 bg-[#FFFFFF]">
            <InterviewerAvatar 
              textToSpeak={textToSpeak} 
              onSpeechEnd={handleAvatarSpeechEnd} 
              isListening={speech.isListening} 
              isThinking={isSubmitting}
              gender={interviewerGender}
            />
            
            <div className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full ${status.color}`}>
              {status.text}
            </div>

            {/* Microphone directly below Avatar */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!speech.isSupported || isSubmitting || completedAll || isAvatarSpeaking}
              className={`w-[60px] h-[60px] mt-1 flex items-center justify-center rounded-full transition-all duration-300 shadow-[0_4px_10px_rgba(15,23,42,0.06)] border border-[#E2E8F0] bg-[#FFFFFF] ${
                speech.isListening 
                  ? 'text-[#22C55E] animate-pulse border-[#22C55E]' 
                  : isSubmitting || isAvatarSpeaking
                    ? 'text-[#64748B] opacity-50 cursor-not-allowed'
                    : 'text-[#2563EB] hover:bg-[#EFF6FF]'
              }`}
            >
              {speech.isListening ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 2a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
          </div>

          {/* Scrollable Conversation Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-[12px] custom-scrollbar relative z-10 pb-40">
            
            {/* Chat Bubbles */}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">{msg.role === 'ai' ? 'AI Interviewer' : 'You'}</span>
                  <span className="text-[12px] font-medium text-[#64748B]">{msg.time}</span>
                </div>
                <div className={`p-[16px] leading-relaxed whitespace-pre-wrap shadow-[0_4px_10px_rgba(15,23,42,0.06)] ${
                  msg.role === 'ai' 
                    ? 'max-w-[58%] text-[16px] bg-[#FFFFFF] text-[#0F172A] border border-[#E2E8F0] rounded-[18px] rounded-tl-sm' 
                    : 'max-w-[52%] text-[15px] bg-[#DBEAFE] text-[#0F172A] rounded-[18px] rounded-tr-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Real-time speech transcript placeholder */}
            {speech.isListening && (transcript || speech.interimText) && (
              <div className="flex flex-col items-end opacity-80">
                <div className="p-[16px] max-w-[52%] text-[15px] leading-relaxed whitespace-pre-wrap shadow-[0_4px_10px_rgba(15,23,42,0.06)] bg-[#DBEAFE] text-[#0F172A] rounded-[18px] rounded-tr-sm">
                  {transcript} {speech.interimText}
                  <span className="ml-1 inline-block w-1.5 h-4 bg-[#2563EB] animate-pulse align-middle"></span>
                </div>
              </div>
            )}

            {isSubmitting && (
              <div className="flex flex-col items-end">
                <div className="p-[16px] rounded-[18px] rounded-tr-sm bg-[#FFFFFF] border border-[#E2E8F0] text-[#64748B] text-[15px] font-medium flex items-center gap-2 shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <div className="w-4 h-4 border-2 border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin" />
                  Processing...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Fixed Input Area at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#E2E8F0] p-4 z-20 flex justify-center bg-[#F7F9FC]">
            <div className="w-[78%] flex flex-col items-center">
              {error && (
              <div className="mb-2 w-full bg-[#FEE2E2] text-[#EF4444] px-4 py-2 rounded-lg text-[13px] font-bold border border-[#FCA5A5] flex items-center justify-between shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                <span>{error}</span>
                <button onClick={() => setError('')} className="p-1 hover:bg-[#FECACA] rounded-full"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}
            
            <div className="w-full relative flex items-center gap-3 px-3 py-2 min-h-[56px] rounded-[16px] border border-[#CBD5E1] transition-all focus-within:bg-[#FFFFFF] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-50 bg-[#FFFFFF] shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
              
              {/* Text Input */}
              <textarea
                ref={inputRef}
                className="flex-1 max-h-32 bg-transparent border-0 py-2 text-[15px] focus:outline-none focus:ring-0 resize-none placeholder:text-[#64748B] font-medium text-[#0F172A]"
                placeholder={isAvatarSpeaking ? "Listen to the question..." : "Speak or type your answer..."}
                rows={1}
                value={transcript}
                onChange={(e) => {
                  if (speech.isListening) {
                    speech.stop();
                  }
                  setTranscript(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                disabled={completedAll || isSubmitting || isAvatarSpeaking}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (transcript.trim().length >= 5) onSubmitAnswer();
                  }
                }}
              />

              {/* Send Button */}
              <button
                onClick={onSubmitAnswer}
                disabled={isSubmitting || !transcript || transcript.trim().length < 5 || isAvatarSpeaking}
                className={`flex-none w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
                  !isSubmitting && transcript.trim().length >= 5 && !isAvatarSpeaking
                    ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
                    : 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-2 px-2 text-[10px] font-bold text-[#64748B] tracking-wider uppercase">
              <span>Voice inputs automatically submit after a brief pause</span>
              <span>
                <kbd className="font-mono bg-[#E2E8F0] px-1 py-0.5 rounded text-[#64748B]">Enter</kbd> to send, <kbd className="font-mono bg-[#E2E8F0] px-1 py-0.5 rounded text-[#64748B]">Shift+Enter</kbd> for new line
              </span>
            </div>
          </div>
        </div>
      </div>

        {/* Right Column: LIVE Face Recognition */}
        <div className="hidden lg:flex lg:w-[30%] xl:w-[25%] flex-col border-l border-[#E2E8F0] p-6 z-10 bg-[#FFFFFF] text-[#0F172A]">
          
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-widest flex items-center gap-2 mb-4 bg-[#FFFFFF] border border-[#E2E8F0] px-3 py-1 rounded-full w-max shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              Live Camera
            </h3>
            
            <div className={`relative w-full aspect-[4/3] bg-[#F7F9FC] rounded-[16px] overflow-hidden shadow-[0_4px_10px_rgba(15,23,42,0.06)] border transition-colors duration-500 flex flex-col justify-end p-3 ${face.isFaceDetected ? 'border-[#22C55E]' : 'border-[#F59E0B]'}`}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${face.status === 'Idle' ? 'opacity-0' : 'opacity-100'}`} 
              />
              
              {/* Status Overlay */}
              <div className="relative z-10 bg-[#FFFFFF] px-3 py-2 rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.06)] border border-[#E2E8F0] flex items-center justify-between">
                <div className={`text-xs font-bold uppercase tracking-wider ${face.isFaceDetected ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {face.faceStatus}
                </div>
                <span className={`w-2 h-2 rounded-full ${face.isFaceDetected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex-1">
             <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <span className="w-2 h-2 flex-none rounded-full bg-[#22C55E]"></span>
                  Camera Active
                </div>
                <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <span className={`w-2 h-2 flex-none rounded-full ${face.isFaceDetected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}></span>
                  Face Detected
                </div>
                <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <span className="w-2 h-2 flex-none rounded-full bg-[#22C55E]"></span>
                  Microphone Active
                </div>
                <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <span className={`w-2 h-2 flex-none rounded-full ${speech.isListening ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'}`}></span>
                  AI Listening
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveInterviewPage;
