import { useCallback, useRef, useState } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = ({ language = 'en-US' } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Use latest Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalChunk = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const segment = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) {
          finalChunk += `${segment} `;
        } else {
          interim += segment;
        }
      }

      setInterimText(interim.trim());
      if (finalChunk) {
        setFinalText((previous) => `${previous} ${finalChunk}`.trim());
      }
    };

    recognition.onerror = (event) => {
      setError(`Speech error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setInterimText('');
    setFinalText('');
  }, []);

  return {
    isSupported: !!SpeechRecognition,
    isListening,
    interimText,
    finalText,
    fullTranscript: `${finalText} ${interimText}`.trim(),
    error,
    start,
    stop,
    resetTranscript,
  };
};
