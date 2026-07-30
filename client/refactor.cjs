const fs = require('fs');
const path = 'src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const newLayout = `
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

        {isCodingInterview ? (
          <PanelGroup direction="horizontal" className="flex-1 w-full h-full">
            {/* Code Editor Panel */}
            <Panel defaultSize={60} minSize={30} className="flex flex-col border-r border-[#E2E8F0] bg-[#1E1E1E]">
              <div className="flex-none p-3 border-b border-[#333333] flex justify-between items-center bg-[#252526]">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-bold tracking-wide">Code Editor</span>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-[#3C3C3C] text-white text-xs px-2 py-1 rounded border border-[#555555] outline-none"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <button
                  onClick={onSubmitAnswer}
                  disabled={isSubmitting || isAvatarSpeaking}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Run & Submit'}
                </button>
              </div>
              <div className="flex-1 w-full relative">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
                />
              </div>
            </Panel>
            
            <PanelResizeHandle className="w-1.5 bg-[#E2E8F0] hover:bg-[#2563EB] transition-colors cursor-col-resize flex-none" />
            
            {/* Split Right Panel (Camera + Chat) */}
            <Panel defaultSize={40} minSize={25} className="flex flex-col relative bg-[#F7F9FC]">
               {/* Camera Top Half */}
               <div className="h-[30%] min-h-[150px] relative border-b border-[#E2E8F0] bg-[#000]">
                 <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                 <div className="absolute top-2 right-2 z-10 bg-[#FFFFFF] px-2 py-1 rounded shadow border border-[#E2E8F0] flex items-center gap-2">
                    <span className={\`text-[10px] font-bold uppercase \${face.isFaceDetected ? 'text-[#22C55E]' : 'text-[#EF4444]'}\`}>
                      {face.faceStatus}
                    </span>
                    <span className={\`w-2 h-2 rounded-full \${face.isFaceDetected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}\`} />
                 </div>
               </div>

               {/* Chat Bottom Half */}
               <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-[#FFFFFF]">
                 <div className="flex-none pt-4 pb-2 border-b border-[#E2E8F0] flex flex-col items-center justify-center space-y-1 z-20 bg-[#FFFFFF]">
                   <InterviewerAvatar 
                     textToSpeak={textToSpeak} 
                     onSpeechEnd={handleAvatarSpeechEnd} 
                     isListening={speech.isListening} 
                     isThinking={isSubmitting}
                     gender={interviewerGender}
                   />
                   <div className={\`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full mt-1 \${status.color}\`}>
                     {status.text}
                   </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-[12px] custom-scrollbar relative z-10">
                    {chatHistory.map((msg, idx) => (
                      <div key={idx} className={\`flex flex-col \${msg.role === 'ai' ? 'items-start' : 'items-end'}\`}>
                        <div className={\`p-3 leading-relaxed whitespace-pre-wrap shadow-sm \${msg.role === 'ai' ? 'max-w-[85%] text-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl rounded-tl-sm' : 'max-w-[80%] text-sm bg-[#DBEAFE] text-[#0F172A] rounded-xl rounded-tr-sm'}\`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {speech.isListening && (transcript || speech.interimText) && (
                      <div className="flex flex-col items-end opacity-80">
                        <div className="p-3 max-w-[80%] text-sm bg-[#DBEAFE] text-[#0F172A] rounded-xl rounded-tr-sm">
                          {transcript} {speech.interimText}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                 </div>
               </div>
            </Panel>
          </PanelGroup>
        ) : (
          <>
            {/* Left Column: Interview & Chat */}
`;

const restOfLayout = `
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
                
                <div className={\`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full \${status.color}\`}>
                  {status.text}
                </div>

                {/* Microphone directly below Avatar */}
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={!speech.isSupported || isSubmitting || completedAll || isAvatarSpeaking}
                  className={\`w-[60px] h-[60px] mt-1 flex items-center justify-center rounded-full transition-all duration-300 shadow-[0_4px_10px_rgba(15,23,42,0.06)] border border-[#E2E8F0] bg-[#FFFFFF] \${
                    speech.isListening 
                      ? 'text-[#22C55E] animate-pulse border-[#22C55E]' 
                      : isSubmitting || isAvatarSpeaking
                        ? 'text-[#64748B] opacity-50 cursor-not-allowed'
                        : 'text-[#2563EB] hover:bg-[#EFF6FF]'
                  }\`}
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
                  <div key={idx} className={\`flex flex-col \${msg.role === 'ai' ? 'items-start' : 'items-end'}\`}>
                    <div className="flex items-end gap-2 mb-1">
                      <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">{msg.role === 'ai' ? 'AI Interviewer' : 'You'}</span>
                      <span className="text-[12px] font-medium text-[#64748B]">{msg.time}</span>
                    </div>
                    <div className={\`p-[16px] leading-relaxed whitespace-pre-wrap shadow-[0_4px_10px_rgba(15,23,42,0.06)] \${
                      msg.role === 'ai' 
                        ? 'max-w-[58%] text-[16px] bg-[#FFFFFF] text-[#0F172A] border border-[#E2E8F0] rounded-[18px] rounded-tl-sm' 
                        : 'max-w-[52%] text-[15px] bg-[#DBEAFE] text-[#0F172A] rounded-[18px] rounded-tr-sm'
                    }\`}>
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
                    className={\`flex-none w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 \${
                      !isSubmitting && transcript.trim().length >= 5 && !isAvatarSpeaking
                        ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
                        : 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                    }\`}
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

            {/* Right Column: LIVE Face Recognition */}
            <div className="hidden lg:flex lg:w-[30%] xl:w-[25%] flex-col border-l border-[#E2E8F0] p-6 z-10 bg-[#FFFFFF] text-[#0F172A]">
              
              <div className="mb-6">
                <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-widest flex items-center gap-2 mb-4 bg-[#FFFFFF] border border-[#E2E8F0] px-3 py-1 rounded-full w-max shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  Live Camera
                </h3>
                
                <div className={\`relative w-full aspect-[4/3] bg-[#F7F9FC] rounded-[16px] overflow-hidden shadow-[0_4px_10px_rgba(15,23,42,0.06)] border transition-colors duration-500 flex flex-col justify-end p-3 \${face.isFaceDetected ? 'border-[#22C55E]' : 'border-[#F59E0B]'}\`}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={\`absolute inset-0 w-full h-full object-cover\`} 
                  />
                  
                  {/* Status Overlay */}
                  <div className="relative z-10 bg-[#FFFFFF] px-3 py-2 rounded-xl shadow-[0_4px_10px_rgba(15,23,42,0.06)] border border-[#E2E8F0] flex items-center justify-between">
                    <div className={\`text-xs font-bold uppercase tracking-wider \${face.isFaceDetected ? 'text-[#22C55E]' : 'text-[#EF4444]'}\`}>
                      {face.faceStatus}
                    </div>
                    <span className={\`w-2 h-2 rounded-full \${face.isFaceDetected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}\`} />
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
                      <span className={\`w-2 h-2 flex-none rounded-full \${face.isFaceDetected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}\`}></span>
                      Face Detected
                    </div>
                    <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                      <span className="w-2 h-2 flex-none rounded-full bg-[#22C55E]"></span>
                      Microphone Active
                    </div>
                    <div className="flex items-center gap-3 text-[13px] font-bold text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] p-3 rounded-lg shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
                      <span className={\`w-2 h-2 flex-none rounded-full \${speech.isListening ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'}\`}></span>
                      AI Listening
                    </div>
                 </div>
              </div>
            </div>
          </>
        )}
      </div>
`;

// Find the index of the start of the layout and the end of the return statement
const startIdx = content.indexOf('      {/* ── Main Layout ───────────────────────────────────────────────── */}');
const endIdx = content.lastIndexOf('    </div>');

if (startIdx !== -1 && endIdx !== -1) {
  const topPart = content.substring(0, startIdx);
  const endSearch = content.substring(endIdx);
  
  const modifiedContent = topPart + newLayout + restOfLayout + endSearch;
  fs.writeFileSync(path, modifiedContent, 'utf8');
  console.log("Successfully updated LiveInterviewPage.jsx");
} else {
  console.log("Could not find Main Layout string");
}
