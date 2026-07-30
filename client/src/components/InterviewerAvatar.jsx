import { useEffect, useState, useRef } from 'react';

export default function InterviewerAvatar({ textToSpeak, onSpeechEnd, isListening, isThinking, gender = 'female' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  
  const avatarImage = gender === 'male' ? '/assets/interviewers/male.png' : '/assets/interviewers/female.png';

  useEffect(() => {
    if (!textToSpeak) return;

    // Cancel any ongoing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Try to find a good English voice matching the gender
    const voices = synthRef.current.getVoices();
    
    let preferredVoice;
    if (gender === 'male') {
       preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.toLowerCase().includes('male') || v.name.includes('David') || v.name.includes('Mark')));
       if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('en')); // fallback
    } else {
       preferredVoice = voices.find(v => v.lang.includes('en') && (v.name.toLowerCase().includes('female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google US English')));
    }
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.95; // slightly slower for clearer interview style
    utterance.pitch = gender === 'male' ? 0.9 : 1.0;

    // Fallback timeout in case TTS hangs (common browser bug)
    // Roughly 100ms per character + 3 seconds buffer
    const maxExpectedTimeMs = Math.max(textToSpeak.length * 100, 3000) + 3000;
    let fallbackTimeout;

    const finishSpeech = () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      setIsSpeaking(false);
      if (onSpeechEnd) onSpeechEnd();
    };

    fallbackTimeout = setTimeout(() => {
      console.warn('TTS took too long or failed silently. Using fallback.');
      if (synthRef.current.speaking) synthRef.current.cancel();
      finishSpeech();
    }, maxExpectedTimeMs);

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = finishSpeech;
    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      finishSpeech();
    };

    synthRef.current.speak(utterance);

    return () => {
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, [textToSpeak, onSpeechEnd, gender]);

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
    <div className="flex flex-col items-center justify-center">
      <div className={`relative`}>
        {/* Avatar container */}
        <div className={`w-[140px] h-[140px] rounded-full overflow-hidden border-[3px] flex items-center justify-center bg-white z-10 relative transition-all duration-700 ease-in-out ${
          isSpeaking 
            ? 'border-[#2563EB] shadow-[0_0_20px_rgba(37,99,235,0.6)]' 
            : 'border-[#2563EB] shadow-none'
        }`}>
           {!imageError ? (
             <img 
               src={avatarImage} 
               alt={`AI Interviewer (${gender})`}
               className={`w-full h-full object-cover transition-transform duration-300 ${
                  isSpeaking ? 'scale-105' : 'scale-100'
               }`}
               onError={() => setImageError(true)}
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-300">
               <span className="text-sm font-medium uppercase">{gender}</span>
             </div>
           )}
        </div>
        
        {/* Advanced Pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-[-6px] rounded-full border-[2px] border-[#2563EB]/40 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none z-0" />
          </>
        )}
      </div>

      <div className="text-center mt-4 h-10 flex flex-col justify-center">
        {/* Waveform Animation when speaking */}
        {isSpeaking && (
          <div className="flex items-center justify-center gap-1.5 mb-2 h-5">
            <div className="w-1.5 h-2.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_100ms]" />
            <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-[bounce_1s_infinite_300ms]" />
            <div className="w-1.5 h-5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_150ms]" />
            <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
            <div className="w-1.5 h-2.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
          </div>
        )}
        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center justify-center gap-1.5 mb-2 h-5">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
