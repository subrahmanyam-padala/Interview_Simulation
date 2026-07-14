import { useEffect, useState, useRef } from 'react';

export default function InterviewerAvatar({ textToSpeak, onSpeechEnd, isActive }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    if (!textToSpeak) return;

    // Cancel any ongoing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Try to find a good English voice (preferably a natural-sounding one)
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Natural')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.95; // slightly slower for clearer interview style
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
    };
    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
    };

    synthRef.current.speak(utterance);

    return () => {
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, [textToSpeak, onSpeechEnd]);

  // Handle voices loading asynchronously in some browsers
  useEffect(() => {
    const loadVoices = () => {
      synthRef.current.getVoices();
    };
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Avatar container */}
        <div className={`w-32 h-32 rounded-full overflow-hidden border-4 flex items-center justify-center bg-slate-800 shadow-2xl transition-all duration-300 ${
          isSpeaking 
            ? 'border-brand-500 shadow-[0_0_30px_rgba(14,165,233,0.6)]' 
            : isActive 
              ? 'border-emerald-500' 
              : 'border-slate-600'
        }`}>
          {/* We'll use a dynamic emoji or CSS shapes for the face */}
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Eyes */}
            <div className="flex gap-4 mb-2">
              <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isSpeaking ? 'h-4 bg-brand-200' : 'animate-pulse'}`} />
              <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isSpeaking ? 'h-4 bg-brand-200' : 'animate-pulse'}`} />
            </div>
            {/* Mouth */}
            <div className={`bg-white rounded-full transition-all duration-150 ${
              isSpeaking 
                ? 'w-8 h-4 animate-bounce' // Open mouth when speaking
                : 'w-6 h-1' // Closed mouth when quiet
            }`} />
          </div>
        </div>
        
        {/* Pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-10" style={{ animationDelay: '0.2s' }} />
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-bold text-white">AI Interviewer</p>
        <p className={`text-xs mt-1 ${isSpeaking ? 'text-brand-300 animate-pulse' : 'text-slate-400'}`}>
          {isSpeaking ? 'Speaking...' : isActive ? 'Listening...' : 'Ready'}
        </p>
      </div>
    </div>
  );
}
