import { z } from 'zod';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendInterviewEmail } from '../services/emailService.js';

const createScheduleSchema = z.object({
  date: z.string().datetime(),
  topic: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  emailReminder: z.boolean().default(true),
});

export const createSchedule = asyncHandler(async (req, res) => {
  const data = createScheduleSchema.parse(req.body);
  
  const schedule = await Schedule.create({
    user: req.user._id,
    ...data,
  });

  // Send the email instantly!
  if (schedule.emailReminder) {
    const user = await User.findById(req.user._id);
    // don't await so it doesn't block the API response
    sendInterviewEmail(schedule, user);
    schedule.reminderSent = true;
    await schedule.save();
  }

  res.status(201).json({ success: true, schedule });
});

export const getMySchedules = asyncHandler(async (req, res) => {
  const schedules = await Schedule.find({ user: req.user._id }).sort({ date: 1 });
  res.json({ success: true, schedules });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }
  res.json({ success: true });
});
