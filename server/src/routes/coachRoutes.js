import { Router } from 'express';
import {
  clearMessages,
  createSession,
  deleteSession,
  getSession,
  listSessions,
  sendMessage,
  updateSessionTitle,
} from '../controllers/coachController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

// Session CRUD
router.get('/sessions', listSessions);
router.post('/sessions', createSession);
router.get('/sessions/:sessionId', getSession);
router.patch('/sessions/:sessionId', updateSessionTitle);
router.delete('/sessions/:sessionId', deleteSession);

// Messaging
router.post('/sessions/:sessionId/message', sendMessage);
router.delete('/sessions/:sessionId/messages', clearMessages);

export default router;
