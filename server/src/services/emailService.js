import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export const sendInterviewEmail = async (schedule, user) => {
  if (!env.EMAIL_USER || !env.EMAIL_PASS || !user?.email) {
    console.warn('[EmailService] Missing email configuration or user email.');
    return;
  }

  const interviewDate = new Date(schedule.date);

  try {
    await transporter.sendMail({
      from: `"InterviewAI Team" <${env.EMAIL_USER}>`,
      to: user.email,
      subject: `Thank You for Registering for the Interview`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; line-height: 1.6;">
          <p>Dear <strong>${user.name}</strong>,</p>
          
          <p>Thank you for registering for the interview. We are pleased to invite you to participate in the interview process.</p>
          
          <h3 style="color: #0ea5e9; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Interview Details:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 6px;"><strong>Date:</strong> ${interviewDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li style="margin-bottom: 6px;"><strong>Time:</strong> ${interviewDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</li>
          </ul>
          
          <p>To ensure a smooth interview experience, please:</p>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Join the meeting <strong>5 minutes before</strong> the scheduled interview time.</li>
            <li style="margin-bottom: 6px;">Check that your <strong>microphone and camera</strong> are working properly.</li>
            <li style="margin-bottom: 6px;">Ensure you have a <strong>stable internet connection</strong> throughout the interview.</li>
          </ul>
          
          <p>We look forward to speaking with you and wish you the very best.</p>
          
          <p>If you have any questions or require assistance, please feel free to contact us.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 2px 0;">Kind regards,</p>
            <p style="margin: 2px 0;"><strong>InterviewAI Team</strong></p>
            <p style="margin: 2px 0;"><strong>Interview Simulation Platform</strong></p>
            <p style="margin: 2px 0;"><a href="mailto:${env.EMAIL_USER}" style="color: #0ea5e9;">${env.EMAIL_USER}</a></p>
          </div>
        </div>
      `
    });
    console.log(`[EmailService] Email sent successfully to ${user.email}`);
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${user.email}:`, error.message);
  }
};
