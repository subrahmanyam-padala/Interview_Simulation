import RecruiterInterview from '../models/RecruiterInterview.js';
import { sendEmail } from '../utils/email.js';

export const scheduleInterview = async (req, res, next) => {
  try {
    const { candidateEmail, candidateName, jobRole, scheduledAt } = req.body;
    const roomId = `recruiter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const interview = await RecruiterInterview.create({
      recruiter: req.user._id,
      candidateEmail,
      candidateName,
      jobRole,
      scheduledAt: new Date(scheduledAt),
      roomId,
    });

    // Try sending email invitation if email utility is available
    try {
      await sendEmail({
        to: candidateEmail,
        subject: `Live Interview Invitation for ${jobRole}`,
        text: `Hello ${candidateName},\n\nYou have been invited to a Live Interview by ${req.user.name}.\n\nScheduled Date: ${new Date(scheduledAt).toLocaleString()}\nRoom Link: http://localhost:5173/recruiter/room/${roomId}\n\nBest regards,\nRecruitment Team`,
      });
    } catch (e) {
      console.warn('Could not send invitation email, proceeding:', e.message);
    }

    res.status(201).json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

export const getRecruiterInterviews = async (req, res, next) => {
  try {
    const interviews = await RecruiterInterview.find({ recruiter: req.user._id })
      .sort({ scheduledAt: -1 });

    res.json({ success: true, interviews });
  } catch (error) {
    next(error);
  }
};

export const getInterviewByRoomId = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const interview = await RecruiterInterview.findOne({ roomId }).populate('recruiter', 'name email');

    if (!interview) {
      return res.status(404).json({ message: 'Interview room not found' });
    }

    res.json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

export const submitScoreAndFeedback = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { scores, feedback } = req.body;

    const interview = await RecruiterInterview.findOne({ roomId });
    if (!interview) {
      return res.status(404).json({ message: 'Interview room not found' });
    }

    if (scores) {
      interview.scores = {
        communication: scores.communication || 0,
        technicalKnowledge: scores.technicalKnowledge || 0,
        problemSolving: scores.problemSolving || 0,
        coding: scores.coding || 0,
      };
    }
    if (feedback !== undefined) interview.feedback = feedback;
    interview.status = 'completed';

    await interview.save();
    res.json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

export const updateRecordingStatus = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { recordingStatus } = req.body;

    const interview = await RecruiterInterview.findOneAndUpdate(
      { roomId },
      { recordingStatus },
      { new: true }
    );

    res.json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};
