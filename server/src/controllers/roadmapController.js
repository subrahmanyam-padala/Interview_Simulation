import { z } from 'zod';
import Interview from '../models/Interview.js';
import Roadmap from '../models/Roadmap.js';
import { generateRoadmapWithAI } from '../services/roadmapService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generate a new roadmap from an interview or manual weak topics
export const generateRoadmap = asyncHandler(async (req, res) => {
  const schema = z.object({
    interviewId: z.string().optional(),
    weakTopics: z.array(z.string()).optional(),
    targetRole: z.string().min(1),
  });

  const { interviewId, weakTopics: manualTopics, targetRole } = schema.parse(req.body);

  let weakTopics = manualTopics || [];
  let strengths = [];
  let sourceInterview = null;

  // If an interviewId was passed, extract weak topics from the report
  if (interviewId) {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw new AppError('Interview not found', 404);
    if (String(interview.user) !== String(req.user._id)) throw new AppError('Forbidden', 403);

    sourceInterview = interview._id;
    weakTopics = interview.weaknesses || [];
    strengths = interview.strengths || [];
    // Also add question tags from low-scoring responses
    interview.responses.forEach(r => {
      if (r.aiEvaluation?.contentScore < 60) {
        weakTopics.push(...(r.questionId ? [] : []));
      }
      if (r.aiEvaluation?.weaknesses) {
        weakTopics.push(...r.aiEvaluation.weaknesses);
      }
    });
    weakTopics = [...new Set(weakTopics)].slice(0, 8); // deduplicate & limit
  }

  if (weakTopics.length === 0) {
    weakTopics = [targetRole, 'data structures', 'system design'];
  }

  const aiData = await generateRoadmapWithAI({ weakTopics, targetRole, strengths });

  const roadmap = await Roadmap.create({
    user: req.user._id,
    sourceInterview,
    weakTopics,
    targetRole,
    title: aiData.title,
    summary: aiData.summary,
    days: aiData.days,
    totalDays: 30,
  });

  res.status(201).json({ success: true, roadmap });
});

// Get all roadmaps for the current user
export const getMyRoadmaps = asyncHandler(async (req, res) => {
  const roadmaps = await Roadmap.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, roadmaps });
});

// Get a single roadmap by ID
export const getRoadmap = asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id);
  if (!roadmap) throw new AppError('Roadmap not found', 404);
  if (String(roadmap.user) !== String(req.user._id)) throw new AppError('Forbidden', 403);
  res.json({ success: true, roadmap });
});

// Mark a day as completed
export const markDayComplete = asyncHandler(async (req, res) => {
  const { day } = req.params;
  const roadmap = await Roadmap.findById(req.params.id);
  if (!roadmap) throw new AppError('Roadmap not found', 404);
  if (String(roadmap.user) !== String(req.user._id)) throw new AppError('Forbidden', 403);

  const dayIndex = roadmap.days.findIndex(d => d.day === parseInt(day));
  if (dayIndex === -1) throw new AppError('Day not found', 404);

  roadmap.days[dayIndex].completed = !roadmap.days[dayIndex].completed;
  roadmap.completedDays = roadmap.days.filter(d => d.completed).length;
  if (roadmap.completedDays === roadmap.totalDays) roadmap.status = 'completed';

  await roadmap.save();
  res.json({ success: true, roadmap });
});

// Delete a roadmap
export const deleteRoadmap = asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id);
  if (!roadmap) throw new AppError('Roadmap not found', 404);
  if (String(roadmap.user) !== String(req.user._id)) throw new AppError('Forbidden', 403);
  await roadmap.deleteOne();
  res.json({ success: true, message: 'Roadmap deleted' });
});
