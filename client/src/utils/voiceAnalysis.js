const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally',
  'sort of', 'kind of', 'right', 'okay', 'so', 'well', 'just',
  'i mean', 'honestly', 'obviously', 'pretty much', 'stuff', 'things',
];

const GRAMMAR_ERRORS = [
  { pattern: /\bi seen\b/gi, label: 'i seen → i saw' },
  { pattern: /\bhe don't\b/gi, label: "he don't → he doesn't" },
  { pattern: /\bthey was\b/gi, label: 'they was → they were' },
  { pattern: /\bwe was\b/gi, label: 'we was → we were' },
  { pattern: /\bi done\b/gi, label: 'i done → i did' },
  { pattern: /\bgone did\b/gi, label: 'gone did → went and did' },
  { pattern: /\bmore better\b/gi, label: 'more better → better' },
  { pattern: /\bmost best\b/gi, label: 'most best → best' },
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const estimatePauseDuration = (transcript) => {
  const longPauses = (transcript.match(/\.{3}/g) || []).length;
  const shortPauses = (transcript.match(/,\s/g) || []).length;
  return { longPauses, shortPauses, estimatedSec: longPauses * 1.5 + shortPauses * 0.3 };
};

const detectFillerWords = (text) => {
  const result = {};
  let total = 0;
  const normalized = text.toLowerCase();
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = (normalized.match(regex) || []).length;
    if (matches > 0) {
      result[filler] = matches;
      total += matches;
    }
  });
  return { breakdown: result, total };
};

const detectGrammarIssues = (text) => {
  const issues = [];
  GRAMMAR_ERRORS.forEach(({ pattern, label }) => {
    if (pattern.test(text)) issues.push(label);
  });
  return issues;
};

const classifySpeed = (wpm) => {
  if (wpm < 80)  return { label: 'Too Slow', color: 'text-amber-400' };
  if (wpm < 110) return { label: 'Slow', color: 'text-yellow-400' };
  if (wpm < 150) return { label: 'Ideal', color: 'text-emerald-400' };
  if (wpm < 180) return { label: 'Fast', color: 'text-orange-400' };
  return { label: 'Too Fast', color: 'text-rose-400' };
};

export const analyzeVoiceMetrics = ({ transcript, durationSec }) => {
  const normalized = transcript.toLowerCase();
  const words = normalized.match(/\b[\w']+\b/g) || [];
  const wordCount = words.length;
  const safeDuration = durationSec > 0 ? durationSec : 1;
  const wpm = Math.round((wordCount / safeDuration) * 60);

  const { breakdown: fillerBreakdown, total: fillerWordCount } = detectFillerWords(transcript);
  const { longPauses, shortPauses, estimatedSec: pauseDurationSec } = estimatePauseDuration(transcript);
  const grammarIssues = detectGrammarIssues(transcript);
  const speedInfo = classifySpeed(wpm);
  const pauseCount = longPauses + shortPauses;

  const targetWpm = 130;
  const wpmPenalty = Math.min(35, Math.abs(wpm - targetWpm) * 0.5);
  const fillerPenalty = Math.min(30, fillerWordCount * 2.2);
  const pausePenalty = Math.min(20, pauseCount * 1.5);
  const grammarPenalty = Math.min(25, grammarIssues.length * 5);

  const clarityScore = clamp(92 - wpmPenalty - fillerPenalty * 0.4 - grammarPenalty * 0.3);
  const fluencyScore = clamp(90 - fillerPenalty - pausePenalty);
  const confidenceScore = clamp(88 - fillerPenalty * 0.5 - wpmPenalty * 0.3 - grammarPenalty * 0.5);
  const grammarScore = clamp(100 - grammarPenalty * 4);

  return {
    wpm,
    wordCount,
    fillerWordCount,
    fillerBreakdown,
    pauseCount,
    pauseDurationSec: Math.round(pauseDurationSec * 10) / 10,
    longPauses,
    shortPauses,
    grammarIssues,
    grammarScore,
    speedInfo,
    clarityScore,
    fluencyScore,
    confidenceScore,
    volumeStability: 72,
  };
};
