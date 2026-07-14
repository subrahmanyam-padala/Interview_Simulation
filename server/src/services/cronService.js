import cron from 'node-cron';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import { sendInterviewEmail } from './emailService.js';

export const startCronJobs = () => {
  // Run every 1 minute to check for upcoming interviews
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Look ahead 24 hours
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const upcoming = await Schedule.find({
        status: 'upcoming',
        emailReminder: true,
        reminderSent: false,
        date: { $lte: tomorrow, $gt: now },
      }).populate('user');

      for (const schedule of upcoming) {
        if (!schedule.user?.email) continue;
        
        await sendInterviewEmail(schedule, schedule.user);

        schedule.reminderSent = true;
        await schedule.save();
      }
    } catch (error) {
      console.error('[Cron] Error running reminder cron job:', error);
    }
  });

  console.log('[Cron] Interview reminder service started.');
};
