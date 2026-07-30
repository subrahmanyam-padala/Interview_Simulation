const fs = require('fs');
const path = 'src/pages/LiveInterviewPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const newLayout = `
        {isCodingInterview ? (
          <PanelGroup direction="horizontal" className="flex-1 w-full h-full">
            {/* Problem Description Panel */}
            <Panel defaultSize={30} minSize={20} className="flex flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] overflow-y-auto p-6 custom-scrollbar">
              {currentQuestion ? (
                <>
                  <h2 className="text-xl font-bold text-[#0F172A] mb-4">{currentQuestion.title || currentQuestion.text}</h2>
                  <div className="text-[14px] text-[#334155] leading-relaxed whitespace-pre-wrap mb-6">
                    {currentQuestion.description || currentQuestion.text}
                  </div>
                  
                  {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-[#0F172A] mb-2 text-[11px] uppercase tracking-wider">Examples</h3>
                      {currentQuestion.examples.map((ex, i) => (
                        <div key={i} className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] mb-3 text-[13px] font-mono break-words">
                          <p><strong className="text-[#64748B]">Input:</strong> {ex.input}</p>
                          <p><strong className="text-[#64748B]">Output:</strong> {ex.output}</p>
                          {ex.explanation && <p className="mt-1 text-[#64748B]"><strong>Explanation:</strong> {ex.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                    <div>
                      <h3 className="font-bold text-[#0F172A] mb-2 text-[11px] uppercase tracking-wider">Constraints</h3>
                      <ul className="list-disc pl-5 space-y-1 text-[13px] font-mono text-[#334155]">
                        {currentQuestion.constraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[#64748B] text-sm animate-pulse">Loading problem...</div>
              )}
            </Panel>
            
            <PanelResizeHandle className="w-1.5 bg-[#E2E8F0] hover:bg-[#2563EB] transition-colors cursor-col-resize flex-none" />

            {/* Code Editor Panel */}
            <Panel defaultSize={45} minSize={30} className="flex flex-col border-r border-[#E2E8F0] bg-[#1E1E1E]">
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
            <Panel defaultSize={25} minSize={20} className="flex flex-col relative bg-[#F7F9FC]">
               {/* Camera Top Half */}
               <div className="h-[25%] min-h-[120px] relative border-b border-[#E2E8F0] bg-[#000]">
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
                        <div className={\`p-3 leading-relaxed whitespace-pre-wrap shadow-sm \${msg.role === 'ai' ? 'max-w-[85%] text-[13px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl rounded-tl-sm' : 'max-w-[80%] text-[13px] bg-[#DBEAFE] text-[#0F172A] rounded-xl rounded-tr-sm'}\`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {speech.isListening && (transcript || speech.interimText) && (
                      <div className="flex flex-col items-end opacity-80">
                        <div className="p-3 max-w-[80%] text-[13px] bg-[#DBEAFE] text-[#0F172A] rounded-xl rounded-tr-sm">
                          {transcript} {speech.interimText}
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                 </div>
               </div>
            </Panel>
          </PanelGroup>
        ) : (`;

const startString = '{isCodingInterview ? (';
const endString = '        ) : (';

const startIdx = content.indexOf(startString);
const endIdx = content.indexOf(endString, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const topPart = content.substring(0, startIdx);
  const bottomPart = content.substring(endIdx + endString.length);
  const modifiedContent = topPart + newLayout + bottomPart;
  fs.writeFileSync(path, modifiedContent, 'utf8');
  console.log("Successfully updated layout");
} else {
  console.log("Could not find boundaries");
}
