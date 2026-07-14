import { z } from 'zod';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  adminInviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const role =
    payload.adminInviteCode && env.ADMIN_INVITE_CODE && payload.adminInviteCode === env.ADMIN_INVITE_CODE
      ? 'admin'
      : 'user';

  const user = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: payload.password,
    role,
  });

  const token = signToken(user);

  res.status(201).json({
    token,
    user: user.toSafeObject(),
  });
});

export const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);

  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await user.comparePassword(payload.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken(user);

  res.json({
    token,
    user: user.toSafeObject(),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});
