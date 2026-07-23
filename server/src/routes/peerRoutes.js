import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  searchCandidates,
  updateProfile,
  sendInvitation,
  getInvitations,
  respondInvitation,
  getInterviewRoom,
  submitFeedback,
  getHistory,
} from '../controllers/peerController.js';

const router = express.Router();

router.use(authenticate);

router.get('/candidates', searchCandidates);
router.put('/profile', updateProfile);
router.post('/invite', sendInvitation);
router.get('/invitations', getInvitations);
router.post('/invitations/:id/respond', respondInvitation);
router.get('/room/:roomId', getInterviewRoom);
router.post('/room/:roomId/feedback', submitFeedback);
router.get('/history', getHistory);

export default router;
