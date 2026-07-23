import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  scheduleInterview,
  getRecruiterInterviews,
  getInterviewByRoomId,
  submitScoreAndFeedback,
  updateRecordingStatus,
} from '../controllers/recruiterController.js';

const router = express.Router();

router.use(authenticate);

router.post('/schedule', scheduleInterview);
router.get('/interviews', getRecruiterInterviews);
router.get('/room/:roomId', getInterviewByRoomId);
router.post('/room/:roomId/score', submitScoreAndFeedback);
router.put('/room/:roomId/recording', updateRecordingStatus);

export default router;
