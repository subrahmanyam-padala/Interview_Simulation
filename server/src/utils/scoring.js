const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

export const buildCompositeScores = ({ aiEvaluation, facialMetrics, voiceMetrics }) => {
  const content = clamp(aiEvaluation.contentScore);
  const communication = clamp(
    aiEvaluation.communicationScore * 0.5 + voiceMetrics.clarityScore * 0.2 + voiceMetrics.fluencyScore * 0.2 + facialMetrics.eyeContactScore * 0.1
  );
  const confidence = clamp(facialMetrics.confidenceScore * 0.6 + facialMetrics.eyeContactScore * 0.4);
  const clarity = clamp(voiceMetrics.clarityScore);
  const fluency = clamp(voiceMetrics.fluencyScore);

  return { content, communication, confidence, clarity, fluency };
};

export const aggregateOverallScores = (responses) => {
  if (!responses.length) {
    return {
      content: 0,
      communication: 0,
      confidence: 0,
      clarity: 0,
      fluency: 0,
    };
  }

  const total = responses.reduce(
    (acc, response) => {
      acc.content += response.responseScores.content;
      acc.communication += response.responseScores.communication;
      acc.confidence += response.responseScores.confidence;
      acc.clarity += response.responseScores.clarity;
      acc.fluency += response.responseScores.fluency;
      return acc;
    },
    { content: 0, communication: 0, confidence: 0, clarity: 0, fluency: 0 }
  );

  return {
    content: clamp(total.content / responses.length),
    communication: clamp(total.communication / responses.length),
    confidence: clamp(total.confidence / responses.length),
    clarity: clamp(total.clarity / responses.length),
    fluency: clamp(total.fluency / responses.length),
  };
};

export const deriveStrengthsAndWeaknesses = (responses) => {
  const strengthsMap = new Map();
  const weaknessesMap = new Map();

  responses.forEach((response) => {
    response.aiEvaluation.strengths.forEach((item) => strengthsMap.set(item, (strengthsMap.get(item) || 0) + 1));
    response.aiEvaluation.weaknesses.forEach((item) => weaknessesMap.set(item, (weaknessesMap.get(item) || 0) + 1));
  });

  const strengths = [...strengthsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([item]) => item);

  const weaknesses = [...weaknessesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([item]) => item);

  return { strengths, weaknesses };
};
