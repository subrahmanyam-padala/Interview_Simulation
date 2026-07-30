import { env } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const roadmapModelCandidates = [...new Set([
  env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
].filter(Boolean))];

const parseRoadmapJson = (text) => {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let cleaned = jsonMatch ? jsonMatch[1].trim() : trimmed;
  if (!jsonMatch) {
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }
  return JSON.parse(cleaned);
};

export const generateRoadmapWithAI = async ({ weakTopics, targetRole, strengths = [] }) => {
  if (!genAI) {
    throw new Error('Roadmap AI is not configured.');
  }

  const prompt = `You are an expert career coach and technical mentor.

A candidate preparing for a **${targetRole}** role has completed a mock interview.

**Weak Topics Identified:** ${weakTopics.join(', ')}
**Strengths:** ${strengths.length > 0 ? strengths.join(', ') : 'Not specified'}

Generate a **structured 14-day personalized learning roadmap** to help them improve.

Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "title": "14-Day Learning Roadmap for [Role]",
  "summary": "A 2-3 sentence overview of the plan",
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "focus": "What topic to focus on today",
      "resources": {
        "youtube": [
          { "title": "Video title", "url": "https://youtube.com/..." }
        ],
        "documentation": [
          { "title": "Doc title", "url": "https://..." }
        ]
      },
      "project": "Mini project or exercise for today",
      "practiceQuestions": [
        "Practice question 1?",
        "Practice question 2?"
      ]
    }
  ]
}

Rules:
- Create exactly 14 day objects
- Each day must have 1-2 youtube links (real, relevant YouTube search URLs like https://www.youtube.com/results?search_query=... are fine)
- Each day must have 1-2 documentation links (use official docs: MDN, React docs, official GitHub, etc.)
- Each day must have 1 mini project or coding exercise
- Each day must have 2-3 practice interview questions
- Organize days in a logical learning progression: foundations → core concepts → advanced → projects → interview prep
- Focus heavily on the weak topics but ensure a well-rounded curriculum
- Vary the content daily, do not repeat topics`;

  let lastError;

  for (const modelName of roadmapModelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return parseRoadmapJson(text);
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const retryable = status === 404 || status === 429 || status === 503 || status === 400;
      console.warn(`[roadmapService] Model ${modelName} failed`, error?.message || error);
      if (!retryable) {
        throw error;
      }
    }
  }

  console.error('[Roadmap generation failed]', lastError);
  throw new Error('Failed to generate roadmap: ' + (lastError?.message || 'AI service unavailable.'));
};
