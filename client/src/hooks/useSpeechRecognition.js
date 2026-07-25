import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = ({ language = 'en-IN', onSpeechEnd } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState('');
  
  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const restartTimeoutRef = useRef(null);

  const start = useCallback(() => {
    console.log('[SpeechRecognition] Attempting to start...');
    if (!SpeechRecognition) {
      console.error('[SpeechRecognition] Not supported in this browser.');
      setError('Speech recognition is not supported in this browser. Use latest Chrome or Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      console.log('[SpeechRecognition] Already listening. Ignoring start request.');
      return;
    }

    // Cleanup previous instance if any
    if (recognitionRef.current) {
      console.log('[SpeechRecognition] Cleaning up previous instance before starting.');
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    isManuallyStoppedRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('[SpeechRecognition] Speech started successfully.');
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

      const trimmedInterim = interim.trim();
      if (trimmedInterim) {
        console.log(`[SpeechRecognition] Interim Transcript: "${trimmedInterim}"`);
      }
      setInterimText(trimmedInterim);
      
      if (finalChunk) {
        console.log(`[SpeechRecognition] Final Chunk: "${finalChunk.trim()}"`);
        setFinalText((previous) => `${previous} ${finalChunk}`.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('[SpeechRecognition] Error encountered:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
        isManuallyStoppedRef.current = true;
        setIsListening(false);
      } else if (event.error === 'network') {
        setError('Network error occurred during speech recognition.');
        // Don't stop manually, let onend handle restart if possible, but mark error
      } else if (event.error === 'no-speech') {
        console.warn('[SpeechRecognition] No speech detected, will let onend handle it.');
      } else if (event.error === 'aborted') {
        console.warn('[SpeechRecognition] Recognition aborted.');
      }
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition] Speech ended naturally or aborted.');
      if (!isManuallyStoppedRef.current) {
        console.log('[SpeechRecognition] Unexpected stop, scheduling restart...');
        restartTimeoutRef.current = setTimeout(() => {
          try {
            if (!isManuallyStoppedRef.current) {
              console.log('[SpeechRecognition] Restarting recognition now...');
              recognition.start();
            }
          } catch (e) {
            console.error('[SpeechRecognition] Failed to restart automatically', e);
            setIsListening(false);
          }
        }, 100);
      } else {
        console.log('[SpeechRecognition] Manual stop detected, will not restart.');
        setIsListening(false);
        recognitionRef.current = null;
        if (onSpeechEnd) onSpeechEnd();
      }
    };

    recognition.onnomatch = () => {
      console.warn('[SpeechRecognition] No match found.');
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error('[SpeechRecognition] Failed to execute start()', e);
      setError('Failed to start microphone.');
      setIsListening(false);
    }
  }, [language, isListening, onSpeechEnd]);

  const stop = useCallback(() => {
    console.log('[SpeechRecognition] Manually stopping recognition.');
    isManuallyStoppedRef.current = true;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    console.log('[SpeechRecognition] Resetting transcript.');
    setInterimText('');
    setFinalText('');
  }, []);

  useEffect(() => {
    return () => {
      console.log('[SpeechRecognition] Hook unmounting, cleaning up.');
      isManuallyStoppedRef.current = true;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
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
