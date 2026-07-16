import { z } from 'zod';
import Interview from '../models/Interview.js';
import Resume from '../models/Resume.js';
import {
  evaluateCandidateAnswer,
  generateAdaptiveQuestion,
  generateDynamicQuestions,
  generateFinalSummary,
  generateCodingQuestions,
  evaluateCodeAnswer,
  generateCareerRecommendation,
} from '../services/openaiService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { aggregateOverallScores, buildCompositeScores, deriveStrengthsAndWeaknesses } from '../utils/scoring.js';

const setupSchema = z.object({
  interviewType: z.enum(['technical', 'hr', 'mixed', 'coding']).default('technical'),
  jobRole: z.string().min(2),
  topic: z.string().min(2),
  targetCompany: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  interviewerGender: z.enum(['male', 'female']).default('female'),
  questionCount: z.number().int().min(5).max(7).default(5),
  resumeId: z.string().optional(),
});

const answerSchema = z.object({
  questionId: z.string().min(1),
  transcript: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  durationSec: z.number().min(0).max(900).default(60),
  facialMetrics: z
    .object({
      eyeContactScore: z.number().min(0).max(100).default(50),
      confidenceScore: z.number().min(0).max(100).default(50),
      expressionStability: z.number().min(0).max(100).default(50),
      averageSmileIntensity: z.number().min(0).max(100).default(20),
    })
    .default({}),
  voiceMetrics: z
    .object({
      wpm: z.number().min(0).max(260).default(120),
      fillerWordCount: z.number().min(0).max(100).default(0),
      pauseCount: z.number().min(0).max(100).default(0),
      clarityScore: z.number().min(0).max(100).default(60),
      fluencyScore: z.number().min(0).max(100).default(60),
      volumeStability: z.number().min(0).max(100).default(70),
    })
    .default({}),
});

const skipSchema = z.object({
  questionId: z.string().min(1),
  reason: z.string().max(240).optional(),
});

const canAccessInterview = (interview, user) => {
  return user.role === 'admin' || interview.user.toString() === user._id.toString();
};

const getNextQuestionIfAny = (interview) => {
  return interview.questions[interview.responses.length] || null;
};

const adaptNextQuestion = async ({ interview, latestResponse }) => {
  const nextIndex = interview.responses.length;
  const existingNext = interview.questions[nextIndex];
  if (!existingNext) {
    return null;
  }

  const askedQuestions = interview.questions
    .slice(0, nextIndex)
    .map((item) => item.text)
    .filter(Boolean);

  const adaptiveQuestion = await generateAdaptiveQuestion({
    setup: interview.setup,
    askedQuestions,
    latestResponse,
    nextQuestionId: existingNext.questionId,
  });

  interview.questions[nextIndex] = {
    questionId: existingNext.questionId,
    text: adaptiveQuestion.text,
    tags: Array.isArray(adaptiveQuestion.tags) ? adaptiveQuestion.tags : existingNext.tags,
    difficulty: adaptiveQuestion.difficulty || existingNext.difficulty,
  };

  const nextQuestionDoc = interview.questions[nextIndex];
  const nextQuestionPayload =
    typeof nextQuestionDoc?.toObject === 'function' ? nextQuestionDoc.toObject() : { ...nextQuestionDoc };

  return {
    ...nextQuestionPayload,
    encouragement: adaptiveQuestion.encouragement || '',
  };
};

const buildReportPayload = (interview) => ({
  id: interview._id,
  setup: interview.setup,
  status: interview.status,
  startedAt: interview.startedAt,
  endedAt: interview.endedAt,
  overallScores: interview.overallScores,
  strengths: interview.strengths,
  weaknesses: interview.weaknesses,
  finalFeedback: interview.finalFeedback,
  recommendations: interview.recommendations,
  questions: interview.questions,
  responses: interview.responses,
  proctoringViolations: interview.proctoringViolations || [],
});

export const setupInterview = asyncHandler(async (req, res) => {
  const payload = setupSchema.parse(req.body);

  let resumeData = null;
  if (payload.resumeId) {
    const resume = await Resume.findById(payload.resumeId);
    if (resume && resume.user.toString() === req.user._id.toString()) {
      resumeData = resume.parsedData;
    }
  }

  let questions;
  if (payload.interviewType === 'coding') {
    questions = await generateCodingQuestions(payload);
  } else {
    questions = await generateDynamicQuestions({ ...payload, resumeData });
  }

  const interview = await Interview.create({
    user: req.user._id,
    setup: payload,
    questions,
  });

  res.status(201).json({
    interviewId: interview._id,
    setup: interview.setup,
    totalQuestions: interview.questions.length,
    currentQuestion: interview.questions[0],
  });
});

export const getInterviewById = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  res.json({ interview: buildReportPayload(interview) });
});

export const submitAnswer = asyncHandler(async (req, res) => {
  const payload = answerSchema.parse(req.body);

  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  if (interview.status === 'completed') {
    throw new AppError('Interview already completed', 400);
  }

  const question = interview.questions.find((item) => item.questionId === payload.questionId);
  if (!question) {
    throw new AppError('Question not found in this interview', 400);
  }

  const alreadyAnswered = interview.responses.some((response) => response.questionId === payload.questionId);
  if (alreadyAnswered) {
    throw new AppError('This question is already answered', 409);
  }

  let aiEvaluation, responseScores;
  
  if (interview.setup.interviewType === 'coding') {
    aiEvaluation = await evaluateCodeAnswer({
      question,
      code: payload.code,
      language: payload.language,
    });
    
    responseScores = {
      codeCorrectness: aiEvaluation.correctnessScore,
      content: aiEvaluation.complexityScore,
      communication: aiEvaluation.qualityScore,
      confidence: 0,
      clarity: 0,
      fluency: 0,
    };
  } else {
    if (!payload.transcript || payload.transcript.length < 10) {
      throw new AppError('Transcript must be at least 10 characters long', 400);
    }
    aiEvaluation = await evaluateCandidateAnswer({
      question,
      transcript: payload.transcript,
      setup: interview.setup,
      voiceMetrics: payload.voiceMetrics,
      facialMetrics: payload.facialMetrics,
    });

    responseScores = buildCompositeScores({
      aiEvaluation,
      facialMetrics: payload.facialMetrics,
      voiceMetrics: payload.voiceMetrics,
    });
  }

  interview.responses.push({
    questionId: payload.questionId,
    questionText: question.text,
    transcript: payload.transcript || '',
    code: payload.code,
    language: payload.language,
    durationSec: payload.durationSec,
    facialMetrics: payload.facialMetrics,
    voiceMetrics: payload.voiceMetrics,
    aiEvaluation: interview.setup.interviewType === 'coding' ? undefined : aiEvaluation,
    codeEvaluation: interview.setup.interviewType === 'coding' ? aiEvaluation : undefined,
    responseScores,
  });

  const latestResponse = interview.responses[interview.responses.length - 1];
  const adaptiveNext = await adaptNextQuestion({ interview, latestResponse });
  await interview.save();
  const nextQuestion = adaptiveNext || getNextQuestionIfAny(interview);

  res.json({
    evaluation: aiEvaluation,
    responseScores,
    answered: interview.responses.length,
    totalQuestions: interview.questions.length,
    nextQuestion,
    isCompleted: !nextQuestion,
  });
});

export const skipQuestion = asyncHandler(async (req, res) => {
  const payload = skipSchema.parse(req.body);

  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  if (interview.status === 'completed') {
    throw new AppError('Interview already completed', 400);
  }

  const question = interview.questions.find((item) => item.questionId === payload.questionId);
  if (!question) {
    throw new AppError('Question not found in this interview', 400);
  }

  const alreadyAnswered = interview.responses.some((response) => response.questionId === payload.questionId);
  if (alreadyAnswered) {
    throw new AppError('This question is already answered or skipped', 409);
  }

  interview.responses.push({
    questionId: payload.questionId,
    questionText: question.text,
    transcript: '[Skipped by candidate]',
    skipped: true,
    skipReason: payload.reason || '',
    durationSec: 0,
    facialMetrics: {
      eyeContactScore: 0,
      confidenceScore: 0,
      expressionStability: 0,
      averageSmileIntensity: 0,
    },
    voiceMetrics: {
      wpm: 0,
      fillerWordCount: 0,
      pauseCount: 0,
      clarityScore: 0,
      fluencyScore: 0,
      volumeStability: 0,
    },
    aiEvaluation: {
      contentScore: 0,
      communicationScore: 0,
      strengths: [],
      weaknesses: [],
      feedback: 'Question skipped by candidate.',
    },
    responseScores: {
      content: 0,
      communication: 0,
      confidence: 0,
      clarity: 0,
      fluency: 0,
    },
  });

  const latestResponse = interview.responses[interview.responses.length - 1];
  const adaptiveNext = await adaptNextQuestion({ interview, latestResponse });
  await interview.save();
  const nextQuestion = adaptiveNext || getNextQuestionIfAny(interview);

  res.json({
    skipped: true,
    answered: interview.responses.length,
    totalQuestions: interview.questions.length,
    nextQuestion,
    isCompleted: !nextQuestion,
  });
});

export const completeInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  if (!interview.responses.length) {
    throw new AppError('No answers submitted for this interview', 400);
  }

  if (interview.status === 'completed') {
    return res.json({ report: buildReportPayload(interview) });
  }

  const overallScores = aggregateOverallScores(interview.responses);
  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(interview.responses);

  const finalSummary = await generateFinalSummary({
    setup: interview.setup,
    overallScores,
    strengths,
    weaknesses,
  });

  interview.status = 'completed';
  interview.endedAt = new Date();
  interview.overallScores = overallScores;
  interview.strengths = strengths;
  interview.weaknesses = weaknesses;
  interview.finalFeedback = finalSummary.finalFeedback;
  interview.recommendations = finalSummary.recommendations;

  await interview.save();

  res.json({ report: buildReportPayload(interview) });
});

export const getInterviewReport = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview report not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  if (interview.status !== 'completed') {
    throw new AppError('Interview is not completed yet', 400);
  }

  res.json({ report: buildReportPayload(interview) });
});

export const getMyInterviewHistory = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('setup status overallScores startedAt endedAt createdAt');

  res.json({ interviews });
});

export const logProctoringViolation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, message } = req.body;

  if (!type || !message) {
    return res.status(400).json({ success: false, message: 'Type and message are required' });
  }

  const interview = await Interview.findOne({ _id: id, user: req.user._id });
  if (!interview) {
    return res.status(404).json({ success: false, message: 'Interview not found' });
  }

  interview.proctoringViolations.push({ type, message, timestamp: new Date() });
  await interview.save();

  res.json({ success: true });
});

export const getCareerRecommendation = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  if (!canAccessInterview(interview, req.user)) {
    throw new AppError('Unauthorized interview access', 403);
  }

  if (interview.status !== 'completed') {
    throw new AppError('Interview must be completed before generating a career recommendation', 400);
  }

  const recommendation = await generateCareerRecommendation({
    setup: interview.setup,
    overallScores: interview.overallScores,
    strengths: interview.strengths || [],
    weaknesses: interview.weaknesses || [],
    responses: interview.responses || [],
    proctoringViolations: interview.proctoringViolations || [],
  });

  res.json({ recommendation });
});
