import OpenAI from 'openai';
import { env } from '../config/env.js';

const openai = env.GEMINI_API_KEY
  ? new OpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    })
  : null;

const modelToUse = env.GEMINI_MODEL;

// ─── System prompt ────────────────────────────────────────────────────────────
const buildSystemPrompt = (interviewContext) => {
  let base = `You are an expert AI Interview Coach named "Coach AI". You help candidates:
1. Understand and answer technical interview questions (DSA, System Design, OOP, Web, Cloud, AI/ML, etc.)
2. Improve communication, clarity, and confidence in responses
3. Practice behavioral questions using the STAR method
4. Prepare for specific companies or roles
5. Get feedback on their answers

Guidelines:
- Be encouraging, specific, and actionable in your feedback
- Format answers with clear headings, bullet points, and code blocks when relevant
- For technical questions: explain clearly with examples and analogies
- For behavioral questions: guide using STAR (Situation, Task, Action, Result)
- For communication improvement: highlight what to add, remove, or restructure
- Keep answers concise but complete — aim for interview-ready responses
- When the user shares an answer, give a score (0-10), identify strengths and gaps, and suggest a better version`;

  if (interviewContext) {
    base += `\n\nInterview Context (use this to personalize advice):
Role: ${interviewContext.jobRole}
Topic: ${interviewContext.topic}
Difficulty: ${interviewContext.difficulty}
Interview Type: ${interviewContext.interviewType}
Overall Scores: Content ${interviewContext.scores?.content ?? 'N/A'}/100, Communication ${interviewContext.scores?.communication ?? 'N/A'}/100
Strengths: ${(interviewContext.strengths || []).join(', ') || 'Not available'}
Weaknesses: ${(interviewContext.weaknesses || []).join(', ') || 'Not available'}

Tailor your coaching to address the weaknesses above and build on the strengths.`;
  }

  return base;
};

// ─── Main coach function ──────────────────────────────────────────────────────
export const askCoach = async ({ messages, interviewContext }) => {
  const systemPrompt = buildSystemPrompt(interviewContext);

  // Convert stored messages to OpenAI format (take last 20 for token budget)
  const historyForAI = (messages || [])
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (!openai) {
    return {
      content: `👋 Coach AI here! I'd love to help, but the AI API key is not configured. Please set **GEMINI_API_KEY** in the server environment.

In the meantime, here are some quick tips:
- **STAR Method**: Always structure behavioral answers as Situation → Task → Action → Result
- **Technical questions**: Start with the brute-force approach, then optimise
- **Communication**: Pause, breathe, and speak in clear complete sentences`,
      tokensUsed: 0,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      temperature: 0.6,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyForAI,
      ],
    });

    const content = completion.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return { content, tokensUsed };
  } catch (error) {
    console.error('[coachService] AI request failed:', error.message);
    return {
      content: `⚠️ I ran into a temporary issue connecting to the AI. Please try again in a moment.\n\nError: ${error.message}`,
      tokensUsed: 0,
    };
  }
};

// ─── Auto-generate a chat session title from first message ──────────────────
export const generateSessionTitle = async (firstUserMessage) => {
  if (!openai) {
    return firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '…' : '');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      temperature: 0.3,
      max_tokens: 20,
      messages: [
        {
          role: 'system',
          content: 'Generate a very short 4-6 word title for a chat session based on the user message. Return ONLY the title, no punctuation.',
        },
        { role: 'user', content: firstUserMessage.slice(0, 200) },
      ],
    });
    return completion.choices?.[0]?.message?.content?.trim() || firstUserMessage.slice(0, 50);
  } catch (_) {
    return firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '…' : '');
  }
};
