import { useEffect, useState, useRef } from 'react';

export default function InterviewerAvatar({ textToSpeak, onSpeechEnd, isActive, gender = 'female' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Avatar container */}
        <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 flex items-center justify-center bg-slate-800 shadow-2xl transition-all duration-300 ${
          isSpeaking 
            ? 'border-brand-500 shadow-[0_0_40px_rgba(14,165,233,0.6)]' 
            : isActive 
              ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' 
              : 'border-slate-600'
        }`}>
           {/* Realistic Image with CSS animations */}
           <img 
             src={avatarImage} 
             alt={`AI Interviewer (${gender})`}
             className={`w-full h-full object-cover transition-transform duration-75 ${
                isSpeaking 
                  ? 'animate-interviewer-speak' 
                  : isActive
                    ? 'animate-interviewer-listen'
                    : 'animate-interviewer-idle'
             }`}
           />
        </div>
        
        {/* Pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping opacity-20 pointer-events-none" />
            <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ping opacity-10 pointer-events-none" style={{ animationDelay: '0.2s' }} />
          </>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-bold text-white">AI Interviewer</p>
        <p className={`text-xs mt-1 font-medium ${isSpeaking ? 'text-brand-300 animate-pulse' : isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
          {isSpeaking ? 'Speaking...' : isActive ? 'Listening...' : 'Thinking...'}
        </p>
      </div>
    </div>
  );
}
