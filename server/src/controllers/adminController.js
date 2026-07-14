import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const [userCount, interviewCount, completedCount, activeCount] = await Promise.all([
    User.countDocuments(),
    Interview.countDocuments(),
    Interview.countDocuments({ status: 'completed' }),
    Interview.countDocuments({ status: 'in_progress' }),
  ]);

  const [roleDistribution, avgScores, recentActivity] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
    Interview.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          content: { $avg: '$overallScores.content' },
          communication: { $avg: '$overallScores.communication' },
          confidence: { $avg: '$overallScores.confidence' },
          clarity: { $avg: '$overallScores.clarity' },
          fluency: { $avg: '$overallScores.fluency' },
        },
      },
    ]),
    Interview.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    metrics: {
      userCount,
      interviewCount,
      completedCount,
      activeCount,
      completionRate: interviewCount ? Math.round((completedCount / interviewCount) * 100) : 0,
    },
    roleDistribution,
    avgScores: avgScores[0] || {
      content: 0,
      communication: 0,
      confidence: 0,
      clarity: 0,
      fluency: 0,
    },
    recentActivity,
  });
});
