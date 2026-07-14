import { Router } from 'express';
import { getAdminOverview } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/overview', getAdminOverview);

export default router;
