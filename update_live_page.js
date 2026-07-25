const fs = require('fs');
const file = 'client/src/pages/LiveInterviewPage.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'setTextToSpeak(`${interviewerLine ? interviewerLine + \\' \\' : \\'\\'}$\{currentQuestion.text}`);',
  'setTextToSpeak(answeredCount === 0 ? "Hello. Welcome to your interview. I am your AI interviewer. Let\\'s begin. Tell me about yourself." : currentQuestion.text);'
);

const returnMatch = code.indexOf('  return (');
if (returnMatch !== -1) {
  code = code.substring(0, returnMatch);
  
  const newReturn = `  const displayQuestionText = answeredCount === 0 
    ? "Hello. Welcome to your interview. I am your AI interviewer. Let's begin. Tell me about yourself." 
    : currentQuestion?.text || 'No pending question';

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">AI Interview</h1>
          <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {interview?.setup?.jobRole || 'Loading...'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Timer</span>
            <span className="text-lg font-mono font-bold text-slate-700">{timer.display}</span>
          </div>
          <button
            type="button"
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-full font-semibold shadow-sm transition-colors disabled:opacity-50"
            onClick={onFinishInterview}
            disabled={isSubmitting || isSkipping || isGeneratingReport}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        {!interview ? (
          <p className="text-slate-500 text-lg">Loading your interview experience...</p>
        ) : (
          <div className="w-full flex flex-col items-center space-y-12">
            
            {/* Avatar Section */}
            <InterviewerAvatar 
              textToSpeak={textToSpeak} 
              onSpeechEnd={() => setIsAvatarSpeaking(false)} 
              isActive={speech.isListening} 
              gender={interview.setup.interviewerGender || 'female'}
            />

            {/* Question Card */}
            <div className="w-full bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center relative overflow-hidden">
              <p className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-4">Current Question</p>
              <h2 className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed max-w-3xl mx-auto">
                {displayQuestionText}
              </h2>
            </div>

            {/* Interaction Controls */}
            {completedAll ? (
              <div className="flex flex-col items-center space-y-4">
                <p className="text-lg text-slate-600">Interview completed. Please generate your report.</p>
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                  onClick={onGenerateInterviewReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-8">
                {/* Microphone Button */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={speech.isListening ? onStopListening : onStartListening}
                    disabled={!speech.isSupported || isSubmitting || completedAll}
                    className={\`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl \${
                      speech.isListening 
                        ? 'bg-rose-500 hover:bg-rose-600 animate-pulse scale-110 shadow-[0_0_30px_rgba(244,63,94,0.4)]' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                    }\`}
                  >
                    {speech.isListening ? (
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 2a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                    {speech.isListening ? 'Recording...' : isSubmitting ? 'Processing...' : 'Tap to Speak'}
                  </span>
                </div>
                
                {/* Text Fallback */}
                <div className="w-full max-w-2xl relative">
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-16 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm placeholder:text-slate-400"
                    placeholder="Type your answer..."
                    rows={3}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={completedAll || isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (transcript.trim().length >= 10) onSubmitAnswer();
                      }
                    }}
                  />
                  <button
                    onClick={onSubmitAnswer}
                    disabled={isSubmitting || !transcript || transcript.trim().length < 10}
                    className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>

                {error && <p className="text-rose-500 font-medium text-sm">{error}</p>}
                
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default LiveInterviewPage;
`;
  fs.writeFileSync(file, code + newReturn);
}
