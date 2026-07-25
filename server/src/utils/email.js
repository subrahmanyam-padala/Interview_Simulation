import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!env.EMAIL_USER || !env.EMAIL_PASS || !to) {
    console.warn('[Email Utility] Missing email configuration or target email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  return await transporter.sendMail({
    from: `"InterviewAI Team" <${env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || (text ? text.replace(/\n/g, '<br>') : ''),
  });
};
