import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const genAI = env.GEMINI_API_KEY ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
const modelCandidates = [...new Set([
  env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
].filter(Boolean))];

const buildFallbackCoachResponse = ({ messages = [], interviewContext }) => {
  const latestUserMessage = [...messages].reverse().find((message) => message.role !== 'assistant' && message.role !== 'model')?.content || '';
  const lowerMessage = latestUserMessage.toLowerCase();

  const isBehavioral = /behavior|team|conflict|leadership|challenge|weakness|strength|tell me about yourself|introduce yourself|project/.test(lowerMessage);
  const isSystemDesign = /system design|scalability|architecture|database|api|microservice|microservices|cache|latency/.test(lowerMessage);
  const isCoding = /code|algorithm|data structure|leetcode|arrays|string|tree|graph|dp|dynamic programming|stack|queue|hash/.test(lowerMessage);

  const topicLine = interviewContext
    ? `For ${interviewContext.jobRole} / ${interviewContext.topic} (${interviewContext.difficulty}).`
    : 'For your interview practice.';

  if (isCoding) {
    return {
      content: `I cannot reach the AI service right now, so here is a quick coding-coach fallback.

${topicLine}

- Start with a brute-force idea, then improve it with a better data structure or traversal.
- State time and space complexity clearly before coding.
- Mention edge cases: empty input, duplicates, single item, and large input.
- If you want, send me your approach and I will help you tighten it step by step.`,
      tokensUsed: 0,
    };
  }

  if (isSystemDesign) {
    return {
      content: `I cannot reach the AI service right now, so here is a quick system-design fallback.

${topicLine}

- Clarify requirements first: scale, users, latency, and consistency.
- Break the system into clients, API layer, services, storage, and cache.
- Call out bottlenecks and trade-offs, especially read/write patterns.
- If you share the exact prompt, I will help you structure a strong interview answer.`,
      tokensUsed: 0,
    };
  }

  if (isBehavioral) {
    return {
      content: `I cannot reach the AI service right now, so here is a quick behavioral-coach fallback.

${topicLine}

- Use STAR: Situation -> Task -> Action -> Result.
- Keep the answer concrete, short, and outcome-focused.
- Highlight what you learned and how you would handle it next time.
- If you paste your draft answer, I will help you make it sharper.`,
      tokensUsed: 0,
    };
  }

  return {
    content: `I cannot reach the AI service right now, so here is a quick coaching fallback.

${topicLine}

- Give a direct answer first.
- Add one example or reason.
- Close with the impact or takeaway.
- Send me your draft and I will help refine it.`,
    tokensUsed: 0,
  };
};

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

const runCoachModel = async ({ modelName, systemInstruction, historyForAI }) => {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
  });

  const chat = model.startChat({
    history: historyForAI.length > 0 ? historyForAI.slice(0, -1) : [],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1500,
    },
  });

  const lastMessage = historyForAI.length > 0 ? historyForAI[historyForAI.length - 1].parts[0].text : 'Hello';
  const result = await chat.sendMessage(lastMessage);

  return {
    content: result.response.text() || 'I could not generate a response. Please try again.',
    tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
  };
};

export const askCoach = async ({ messages, interviewContext }) => {
  const systemInstruction = buildSystemPrompt(interviewContext);

  const rawHistory = (messages || [])
    .slice(-20)
    .map((message) => ({
      role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
      parts: [{ text: message.content || ' ' }],
    }));

  const historyForAI = [];
  for (const message of rawHistory) {
    if (historyForAI.length > 0 && historyForAI[historyForAI.length - 1].role === message.role) {
      historyForAI[historyForAI.length - 1].parts[0].text += `\n\n${message.parts[0].text}`;
    } else {
      historyForAI.push(message);
    }
  }

  if (!genAI) {
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
    for (const modelName of modelCandidates) {
      try {
        return await runCoachModel({ modelName, systemInstruction, historyForAI });
      } catch (error) {
        const status = error?.status || error?.response?.status;
        const retryable = status === 404 || status === 429 || status === 503 || status === 400;
        console.warn(`[coachService] Model ${modelName} failed`, error?.message || error);
        if (!retryable) {
          throw error;
        }
      }
    }

    return buildFallbackCoachResponse({ messages, interviewContext });
  } catch (error) {
    console.error('[coachService] AI request failed:', error?.message || error);
    return buildFallbackCoachResponse({ messages, interviewContext });
  }
};

export const generateSessionTitle = async (firstUserMessage) => {
  if (!genAI) {
    return firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '…' : '');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: modelCandidates[0],
      systemInstruction: 'Generate a very short 4-6 word title for a chat session based on the user message. Return ONLY the title, no punctuation.',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 20,
      },
    });

    const result = await model.generateContent(firstUserMessage.slice(0, 200));
    return result.response.text().trim() || firstUserMessage.slice(0, 50);
  } catch (_) {
    return firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '…' : '');
  }
};
