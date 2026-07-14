import { z } from 'zod';
import Interview from '../models/Interview.js';
import ChatSession from '../models/ChatSession.js';
import { askCoach, generateSessionTitle } from '../services/coachService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';

// ─── Validation schemas ───────────────────────────────────────────────────────
const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  interviewId: z.string().optional().nullable(),
});

const createSessionSchema = z.object({
  interviewId: z.string().optional().nullable(),
});

const updateTitleSchema = z.object({
  title: z.string().min(1).max(120),
});

// ─── GET /coach/sessions — list user's chat sessions ─────────────────────────
export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await ChatSession.find({ user: req.user._id })
    .sort({ updatedAt: -1 })
    .select('title tags createdAt updatedAt messages')
    .lean();

  // Return lightweight list (last message preview only)
  const list = sessions.map((s) => ({
    _id: s._id,
    title: s.title,
    tags: s.tags,
    messageCount: s.messages.length,
    lastMessage: s.messages[s.messages.length - 1]?.content?.slice(0, 80) || '',
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));

  res.json({ sessions: list });
});

// ─── POST /coach/sessions — create a new session ─────────────────────────────
export const createSession = asyncHandler(async (req, res) => {
  const { interviewId } = createSessionSchema.parse(req.body);

  const session = await ChatSession.create({
    user: req.user._id,
    interviewId: interviewId || null,
    title: 'New Chat',
    messages: [],
  });

  res.status(201).json({ session });
});

// ─── GET /coach/sessions/:sessionId — get full session with all messages ──────
export const getSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id,
  });

  if (!session) throw new AppError('Chat session not found', 404);

  res.json({ session });
});

// ─── POST /coach/sessions/:sessionId/message — send a message ────────────────
export const sendMessage = asyncHandler(async (req, res) => {
  const { content, interviewId } = sendMessageSchema.parse(req.body);

  const session = await ChatSession.findOne({
    _id: req.params.sessionId,
    user: req.user._id,
  });

  if (!session) throw new AppError('Chat session not found', 404);

  // Optionally load interview context
  let interviewContext = null;
  const contextId = interviewId || session.interviewId;
  if (contextId) {
    try {
      const interview = await Interview.findOne({
        _id: contextId,
        user: req.user._id,
        status: 'completed',
      }).select('setup overallScores strengths weaknesses').lean();

      if (interview) {
        interviewContext = {
          jobRole: interview.setup.jobRole,
          topic: interview.setup.topic,
          difficulty: interview.setup.difficulty,
          interviewType: interview.setup.interviewType,
          scores: interview.overallScores,
          strengths: interview.strengths,
          weaknesses: interview.weaknesses,
        };
      }
    } catch (_) {
      // Interview context is optional — don't fail the request
    }
  }

  // Append user message
  session.messages.push({ role: 'user', content });

  // Auto-generate title from first message
  if (session.messages.length === 1 && session.title === 'New Chat') {
    session.title = await generateSessionTitle(content);
  }

  // Get AI response using full history
  const { content: aiContent } = await askCoach({
    messages: session.messages,
    interviewContext,
  });

  // Append assistant message
  session.messages.push({ role: 'assistant', content: aiContent });

  // Auto-tag session based on keywords in latest user message
  const lower = content.toLowerCase();
  const topicMap = {
    'system design': 'System Design',
    behavioral: 'Behavioral',
    dsa: 'DSA',
    algorithm: 'DSA',
    'data structure': 'DSA',
    communication: 'Communication',
    java: 'Java',
    python: 'Python',
    javascript: 'JavaScript',
    react: 'React',
    node: 'Node.js',
    sql: 'SQL',
    database: 'Database',
    aws: 'Cloud',
    cloud: 'Cloud',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    'machine learning': 'ML/AI',
    'deep learning': 'ML/AI',
    jwt: 'Security',
    oauth: 'Security',
    authentication: 'Security',
    api: 'API Design',
    rest: 'API Design',
    graphql: 'API Design',
  };
  for (const [keyword, tag] of Object.entries(topicMap)) {
    if (lower.includes(keyword) && !session.tags.includes(tag)) {
      session.tags.push(tag);
    }
  }
  // Keep max 5 tags
  session.tags = session.tags.slice(0, 5);

  await session.save();

  // Return only the new assistant message (client already has user message)
  res.json({
    message: { role: 'assistant', content: aiContent },
    sessionTitle: session.title,
    tags: session.tags,
  });
});

// ─── PATCH /coach/sessions/:sessionId — rename session ───────────────────────
export const updateSessionTitle = asyncHandler(async (req, res) => {
  const { title } = updateTitleSchema.parse(req.body);

  const session = await ChatSession.findOneAndUpdate(
    { _id: req.params.sessionId, user: req.user._id },
    { title },
    { new: true, select: '_id title updatedAt' }
  );

  if (!session) throw new AppError('Chat session not found', 404);

  res.json({ session });
});

// ─── DELETE /coach/sessions/:sessionId — delete session ──────────────────────
export const deleteSession = asyncHandler(async (req, res) => {
  const result = await ChatSession.findOneAndDelete({
    _id: req.params.sessionId,
    user: req.user._id,
  });

  if (!result) throw new AppError('Chat session not found', 404);

  res.json({ success: true });
});

// ─── DELETE /coach/sessions/:sessionId/messages — clear chat history ─────────
export const clearMessages = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOneAndUpdate(
    { _id: req.params.sessionId, user: req.user._id },
    { messages: [], tags: [], title: 'New Chat' },
    { new: true, select: '_id title messages tags' }
  );

  if (!session) throw new AppError('Chat session not found', 404);

  res.json({ session });
});
