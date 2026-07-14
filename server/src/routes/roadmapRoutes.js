import { Router } from 'express';
import {
  deleteRoadmap,
  generateRoadmap,
  getMyRoadmaps,
  getRoadmap,
  markDayComplete,
} from '../controllers/roadmapController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/generate', generateRoadmap);
router.get('/', getMyRoadmaps);
router.get('/:id', getRoadmap);
router.patch('/:id/day/:day/complete', markDayComplete);
router.delete('/:id', deleteRoadmap);

export default router;
