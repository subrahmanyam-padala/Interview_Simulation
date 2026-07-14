import express from 'express';
import { getMyResumes, uploadMiddleware, uploadResume } from '../controllers/resumeController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware, uploadResume);
router.get('/my-resumes', getMyResumes);

export default router;
