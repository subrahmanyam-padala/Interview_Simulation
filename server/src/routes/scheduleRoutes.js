import { Router } from 'express';
import { createSchedule, deleteSchedule, getMySchedules } from '../controllers/scheduleController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/', createSchedule);
router.get('/', getMySchedules);
router.delete('/:id', deleteSchedule);

export default router;
