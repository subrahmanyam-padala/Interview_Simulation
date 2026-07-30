import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { sendEmail } from '../utils/email.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password is too weak.'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address.'),
  code: z.string().trim().regex(/^\d{6}$/, 'Invalid verification code.'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address.'),
  token: z.string().trim().min(6, 'Reset token is required.'),
  password: z.string().min(6, 'Password is too weak.'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required.'),
});

const VERIFICATION_CODE_TTL_MS = 1000 * 60 * 15;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

const safeClientUrl = () => {
  try {
    return new URL(env.CLIENT_URL).toString();
  } catch (_error) {
    return 'http://localhost:5173';
  }
};

const hashVerificationCode = (email, code) =>
  crypto.createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex');

const hashResetToken = (email, token) =>
  crypto.createHash('sha256').update(`${email.toLowerCase()}:${token}`).digest('hex');

const createVerificationCode = () => crypto.randomInt(100000, 1000000).toString();
const createResetToken = () => crypto.randomBytes(32).toString('hex');

const buildVerificationUrl = (email, code) => {
  const url = new URL('/verify-email', safeClientUrl());
  url.searchParams.set('email', email);
  url.searchParams.set('code', code);
  return url.toString();
};

const buildResetPasswordUrl = (email, token) => {
  const url = new URL('/reset-password', safeClientUrl());
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);
  return url.toString();
};

const sendVerificationEmail = async (user, code) => {
  const verificationUrl = buildVerificationUrl(user.email, code);
  const subject = 'Verify your Interview AI account';
  const text = [
    `Hi ${user.name},`,
    '',
    'Welcome to Interview AI. Use the verification code below to activate your account:',
    '',
    code,
    '',
    `Or verify instantly by opening this link: ${verificationUrl}`,
    '',
    'This code expires in 15 minutes.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Verify your Interview AI account</h2>
      <p style="margin-top: 0;">Hi ${user.name},</p>
      <p>Use the verification code below to activate your account:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; display: inline-block;">${code}</div>
      <p style="margin-top: 24px;">Or verify instantly with this link:</p>
      <p><a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a></p>
      <p>This code expires in 15 minutes.</p>
    </div>
  `;

  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new AppError('OTP could not be sent.', 500);
  }

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });

  return { sent: true };
};

const sendResetPasswordEmail = async (user, token) => {
  const resetUrl = buildResetPasswordUrl(user.email, token);
  const subject = 'Reset your Interview AI password';
  const text = [
    `Hi ${user.name},`,
    '',
    'Use the link below to reset your password:',
    '',
    resetUrl,
    '',
    'This link expires in 30 minutes.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Reset your password</h2>
      <p style="margin-top: 0;">Hi ${user.name},</p>
      <p>Use the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
      <p>This link expires in 30 minutes.</p>
    </div>
  `;

  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new AppError('OTP could not be sent.', 500);
  }

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });

  return { sent: true };
};

const issueVerificationCode = async (user) => {
  const code = createVerificationCode();
  user.emailVerified = false;
  user.emailVerificationCodeHash = hashVerificationCode(user.email, code);
  user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
  await user.save();
  await sendVerificationEmail(user, code);
  return { code, sent: true };
};

const issuePasswordResetToken = async (user) => {
  const token = createResetToken();
  user.passwordResetTokenHash = hashResetToken(user.email, token);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();
  await sendResetPasswordEmail(user, token);
  return { token, sent: true };
};

const clearVerificationFields = (user) => {
  user.emailVerified = true;
  user.emailVerificationCodeHash = null;
  user.emailVerificationExpiresAt = null;
};

const clearResetFields = (user) => {
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
};

const verifyGoogleCredential = async (credential) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google sign-in is not configured.', 503);
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    throw new AppError('Google authentication failed.', 401);
  }

  const profile = await response.json();
  if (profile.aud !== env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google authentication failed.', 401);
  }

  if (profile.email_verified !== 'true' && profile.email_verified !== true) {
    throw new AppError('Google account email is not verified.', 401);
  }

  return profile;
};

const buildAuthResponse = (user, message) => ({
  token: signToken(user),
  user: user.toSafeObject(),
  message,
});

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.emailVerified) {
      throw new AppError('Email already exists.', 409);
    }

    const { code } = await issueVerificationCode(existing);
    res.status(200).json({
      message: 'OTP Sent',
      requiresVerification: true,
      email: existing.email,
      verificationCode: code,
    });
    return;
  }

  const user = await User.create({
    name: payload.name,
    email: normalizedEmail,
    password: payload.password,
    role: 'user',
  });

  const { code } = await issueVerificationCode(user);

  res.status(201).json({
    message: 'Registration Successful',
    requiresVerification: true,
    email: user.email,
    verificationCode: code,
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const payload = verifyEmailSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.emailVerified) {
    res.json(buildAuthResponse(user, 'Email Verified'));
    return;
  }

  if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
    throw new AppError('OTP expired. Please request a new one.', 400);
  }

  if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
    throw new AppError('OTP expired. Please request a new one.', 400);
  }

  const providedHash = hashVerificationCode(normalizedEmail, payload.code);
  if (providedHash !== user.emailVerificationCodeHash) {
    throw new AppError('Invalid verification code.', 400);
  }

  clearVerificationFields(user);
  await user.save();

  res.json(buildAuthResponse(user, 'Email Verified'));
});

export const resendVerification = asyncHandler(async (req, res) => {
  const payload = resendVerificationSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.emailVerified) {
    throw new AppError('Email is already verified.', 400);
  }

  const { code } = await issueVerificationCode(user);

  res.json({
    message: 'OTP Sent',
    requiresVerification: true,
    email: user.email,
    verificationCode: code,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const payload = forgotPasswordSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await issuePasswordResetToken(user);

  res.json({
    message: 'Reset link sent.',
    email: user.email,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const payload = resetPasswordSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (!user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
    throw new AppError('Reset token expired. Please request a new one.', 400);
  }

  if (user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw new AppError('Reset token expired. Please request a new one.', 400);
  }

  const providedHash = hashResetToken(normalizedEmail, payload.token);
  if (providedHash !== user.passwordResetTokenHash) {
    throw new AppError('Invalid reset token.', 400);
  }

  user.password = payload.password;
  clearResetFields(user);
  await user.save();

  res.json(buildAuthResponse(user, 'Password Reset Successful'));
});

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (!user.emailVerified) {
    throw new AppError('Please verify your email first.', 403);
  }

  const isMatch = await user.comparePassword(payload.password);
  if (!isMatch) {
    throw new AppError('Incorrect email or password.', 401);
  }

  res.json(buildAuthResponse(user, 'Login Successful'));
});

export const googleLogin = asyncHandler(async (req, res) => {
  const payload = googleAuthSchema.parse(req.body);
  const profile = await verifyGoogleCredential(payload.credential);
  const email = profile.email?.toLowerCase();

  if (!email) {
    throw new AppError('Google authentication failed.', 401);
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: profile.name || profile.given_name || 'Google User',
      email,
      password: crypto.randomBytes(32).toString('hex'),
      role: 'user',
      googleId: profile.sub,
      emailVerified: true,
    });
  } else {
    user.googleId = user.googleId || profile.sub;
    user.emailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
  }

  res.json(buildAuthResponse(user, 'Login Successful'));
});

export const sendOtp = register;
export const verifyOtp = verifyEmail;
export const resendOtp = resendVerification;

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

