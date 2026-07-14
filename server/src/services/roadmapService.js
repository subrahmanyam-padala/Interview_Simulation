import { env } from '../config/env.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const generateRoadmapWithAI = async ({ weakTopics, targetRole, strengths = [] }) => {
  const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

  const prompt = `You are an expert career coach and technical mentor.

A candidate preparing for a **${targetRole}** role has completed a mock interview.

**Weak Topics Identified:** ${weakTopics.join(', ')}
**Strengths:** ${strengths.length > 0 ? strengths.join(', ') : 'Not specified'}

Generate a **structured 30-day personalized learning roadmap** to help them improve.

Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this exact structure:
{
  "title": "30-Day Learning Roadmap for [Role]",
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
- Create exactly 30 day objects
- Each day must have 1-2 youtube links (real, relevant YouTube search URLs like https://www.youtube.com/results?search_query=... are fine)
- Each day must have 1-2 documentation links (use official docs: MDN, React docs, official GitHub, etc.)
- Each day must have 1 mini project or coding exercise
- Each day must have 2-3 practice interview questions
- Organize days in a logical learning progression: foundations → core concepts → advanced → projects → interview prep
- Focus heavily on the weak topics but ensure a well-rounded curriculum
- Vary the content daily, do not repeat topics`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  const data = JSON.parse(cleaned);
  return data;
};
