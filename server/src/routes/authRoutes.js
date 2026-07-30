import { Router } from 'express';
import {
  forgotPassword,
  getCurrentUser,
  googleLogin,
  login,
  register,
  resendOtp,
  resendVerification,
  resetPassword,
  sendOtp,
  verifyEmail,
  verifyOtp,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/send-otp', sendOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOtp);
router.post('/resend-verification', resendVerification);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getCurrentUser);

export default router;