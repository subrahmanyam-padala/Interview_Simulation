import { Router } from 'express';
import {
  completeInterview,
  getInterviewById,
  getInterviewReport,
  getMyInterviewHistory,
  skipQuestion,
  setupInterview,
  submitAnswer,
  logProctoringViolation,
  getCareerRecommendation,
} from '../controllers/interviewController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/setup', setupInterview);
router.get('/history/me', getMyInterviewHistory);
router.get('/:id', getInterviewById);
router.post('/:id/answer', submitAnswer);
router.post('/:id/skip', skipQuestion);
router.post('/:id/complete', completeInterview);
router.get('/:id/report', getInterviewReport);
router.post('/:id/proctoring-violation', logProctoringViolation);
router.get('/:id/career-recommendation', getCareerRecommendation);

export default router;
