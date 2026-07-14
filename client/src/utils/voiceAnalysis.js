const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export const analyzeVoiceMetrics = ({ transcript, durationSec }) => {
  const normalized = transcript.toLowerCase();
  const words = normalized.match(/\b[\w']+\b/g) || [];
  const wordCount = words.length;
  const safeDuration = durationSec > 0 ? durationSec : 1;
  const wpm = Math.round((wordCount / safeDuration) * 60);

  let fillerWordCount = 0;
  FILLER_WORDS.forEach((filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    fillerWordCount += (normalized.match(regex) || []).length;
  });

  const pauseCount = (transcript.match(/\.\.\.|\s-\s|,\s/g) || []).length;

  const targetWpm = 130;
  const wpmPenalty = Math.min(35, Math.abs(wpm - targetWpm) * 0.5);
  const fillerPenalty = Math.min(30, fillerWordCount * 2.2);
  const pausePenalty = Math.min(20, pauseCount * 1.5);

  const clarityScore = clamp(92 - wpmPenalty - fillerPenalty * 0.4);
  const fluencyScore = clamp(90 - fillerPenalty - pausePenalty);

  return {
    wpm,
    fillerWordCount,
    pauseCount,
    clarityScore,
    fluencyScore,
    volumeStability: 72,
  };
};
